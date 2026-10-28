"""JSON-in/JSON-out WLAN analysis engine used by the Express API."""

from __future__ import annotations

import json
import math
import random
import sys
from collections import Counter, defaultdict
from statistics import pstdev
from typing import Any

from ap_placement import greedy_minimum_dominating_set
from graph_model import create_grid_graph

FLOOR_HEIGHT_METERS = 3.5
MAX_KMEANS_ITERATIONS = 60
MAX_AUTO_CLUSTERS = 8
SILHOUETTE_SAMPLE_SIZE = 300

# Spatial density of a cluster relative to the venue-wide average density.
LOW_DENSITY_RATIO = 0.7
HIGH_DENSITY_RATIO = 1.6

HOTSPOT_COUNT = 3
HOTSPOT_USER_SHARE = 0.65

# Non-overlapping 2.4 GHz channels; other channel counts are numbered 1..n.
DEFAULT_CHANNEL_PLAN = (1, 6, 11)
# Share of airtime an idle AP still occupies with beacons and management frames.
IDLE_AP_ACTIVITY = 0.1

BALANCE_TOLERANCE = 1.2
BALANCE_CANDIDATES_PER_USER = 6
MAX_REPORTED_REASSIGNMENTS = 200

CONFIG_DEFAULTS: dict[str, Any] = {
    "wallLossDbPerObstruction": 5.0,
    "kmeansClusters": 0,
    "userDistribution": "uniform",
    "shadowFadingStdDb": 0.0,
    "noiseFloorDbm": -95.0,
    "channelCount": 3,
}


def _distance_meters(
    a: dict[str, Any], b: dict[str, Any], cell_size_meters: float
) -> float:
    dx = (float(a["x"]) - float(b["x"])) * cell_size_meters
    dy = (float(a["y"]) - float(b["y"])) * cell_size_meters
    dz = (int(a["floor"]) - int(b["floor"])) * FLOOR_HEIGHT_METERS
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def _obstruction_crossings(
    user: dict[str, Any],
    ap: dict[str, Any],
    obstruction_cells: set[tuple[int, int, int]],
) -> int:
    if not obstruction_cells:
        return 0
    floor = int(user["floor"])
    dx = float(ap["x"]) - float(user["x"])
    dy = float(ap["y"]) - float(user["y"])
    steps = max(1, math.ceil(max(abs(dx), abs(dy)) * 2))
    crossed: set[tuple[int, int, int]] = set()
    for step in range(1, steps):
        fraction = step / steps
        cell = (
            round(float(user["x"]) + dx * fraction),
            round(float(user["y"]) + dy * fraction),
            floor,
        )
        if cell in obstruction_cells:
            crossed.add(cell)
    return len(crossed)


def _estimate_rssi(
    user: dict[str, Any],
    ap: dict[str, Any],
    config: dict[str, Any],
    obstruction_cells: set[tuple[int, int, int]],
) -> float:
    distance = max(_distance_meters(user, ap, config["cellSizeMeters"]), 1.0)
    path_loss = (
        config["referencePathLossDb"]
        + 10
        * config["pathLossExponent"]
        * math.log10(distance)
    )
    floor_loss = abs(int(user["floor"]) - int(ap["floor"])) * config["floorPenaltyDb"]
    wall_loss = (
        _obstruction_crossings(user, ap, obstruction_cells)
        * config["wallLossDbPerObstruction"]
    )
    return round(
        config["transmitPowerDbm"] - path_loss - floor_loss - wall_loss,
        2,
    )


def _dbm_to_mw(dbm: float) -> float:
    return 10 ** (dbm / 10)


def _squared_distance(a: tuple[float, ...], b: tuple[float, ...] | list[float]) -> float:
    return sum((a[axis] - b[axis]) ** 2 for axis in range(len(a)))


def _kmeans_fit(
    points: list[tuple[float, float, float]],
    k: int,
    rng: random.Random,
) -> tuple[list[list[float]], list[int]]:
    # k-means++ seeding spreads the initial centres across the venue.
    centers = [list(rng.choice(points))]
    while len(centers) < k:
        weights = [min(_squared_distance(p, c) for c in centers) for p in points]
        total = sum(weights)
        if total == 0:
            break
        target = rng.random() * total
        running = 0.0
        for point, weight in zip(points, weights):
            running += weight
            if running >= target:
                centers.append(list(point))
                break
    k = len(centers)
    labels = [0] * len(points)

    for _ in range(MAX_KMEANS_ITERATIONS):
        new_labels = [
            min(range(k), key=lambda cluster_id: _squared_distance(point, centers[cluster_id]))
            for point in points
        ]
        groups: list[list[tuple[float, float, float]]] = [[] for _ in range(k)]
        for point, cluster_id in zip(points, new_labels):
            groups[cluster_id].append(point)

        new_centers = []
        for cluster_id, group in enumerate(groups):
            if not group:
                new_centers.append(centers[cluster_id])
                continue
            new_centers.append(
                [sum(point[axis] for point in group) / len(group) for axis in range(3)]
            )

        stable = new_labels == labels
        centers_stable = all(
            _squared_distance(tuple(new_centers[i]), centers[i]) < 1e-10
            for i in range(k)
        )
        labels = new_labels
        centers = new_centers
        if stable and centers_stable:
            break
    return centers, labels


def _silhouette_score(
    points: list[tuple[float, float, float]],
    labels: list[int],
    k: int,
    rng: random.Random,
) -> float:
    indices = list(range(len(points)))
    if len(indices) > SILHOUETTE_SAMPLE_SIZE:
        indices = rng.sample(indices, SILHOUETTE_SAMPLE_SIZE)
    scores: list[float] = []
    for i in indices:
        sums = [0.0] * k
        counts = [0] * k
        for j in indices:
            if i == j:
                continue
            sums[labels[j]] += math.dist(points[i], points[j])
            counts[labels[j]] += 1
        own = labels[i]
        if counts[own] == 0:
            scores.append(0.0)
            continue
        cohesion = sums[own] / counts[own]
        separations = [sums[c] / counts[c] for c in range(k) if c != own and counts[c]]
        if not separations:
            continue
        separation = min(separations)
        spread = max(cohesion, separation)
        scores.append((separation - cohesion) / spread if spread > 0 else 0.0)
    return sum(scores) / len(scores) if scores else 0.0


def _kmeans(
    users: list[dict[str, Any]],
    config: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[int], float | None]:
    """Cluster users spatially and classify each cluster by its spatial density.

    When ``kmeansClusters`` is 0 the cluster count is chosen by the highest
    silhouette score between 2 and MAX_AUTO_CLUSTERS.
    """
    if not users:
        return [], [], None

    cell_size = config["cellSizeMeters"]
    points = [
        (
            float(user["x"]),
            float(user["y"]),
            int(user["floor"]) * FLOOR_HEIGHT_METERS / cell_size,
        )
        for user in users
    ]
    unique_count = len(set(points))
    requested = int(config["kmeansClusters"])
    if requested:
        candidates = [min(requested, unique_count)]
    elif unique_count < 3:
        candidates = [unique_count]
    else:
        candidates = list(range(2, min(MAX_AUTO_CLUSTERS, unique_count - 1) + 1))

    best: tuple[float, list[list[float]], list[int], int] | None = None
    for k in candidates:
        centers, labels = _kmeans_fit(points, k, random.Random(config["randomSeed"] * 31 + k))
        fitted_k = len(centers)
        score = (
            _silhouette_score(points, labels, fitted_k, random.Random(config["randomSeed"]))
            if fitted_k >= 2
            else -1.0
        )
        if best is None or score > best[0] + 1e-9:
            best = (score, centers, labels, fitted_k)
    assert best is not None
    score, centers, labels, k = best

    members: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for user, cluster_id in zip(users, labels):
        members[cluster_id].append(user)

    venue_area = (
        config["gridWidth"] * config["gridHeight"] * cell_size * cell_size * config["numFloors"]
    )
    venue_density = len(users) / venue_area
    clusters: list[dict[str, Any]] = []
    for cluster_id, center in enumerate(centers):
        group = members.get(cluster_id, [])
        if group:
            mean_square = sum(
                (float(u["x"]) - center[0]) ** 2 + (float(u["y"]) - center[1]) ** 2
                for u in group
            ) / len(group)
            # Radius of the uniform disc with the same spread as the cluster.
            radius = max(cell_size, math.sqrt(2 * mean_square) * cell_size)
            floors_spanned = len({int(u["floor"]) for u in group})
            area = math.pi * radius * radius * floors_spanned
            density = len(group) / area
            floor = Counter(int(u["floor"]) for u in group).most_common(1)[0][0]
        else:
            radius, density = 0.0, 0.0
            floor = max(
                0,
                min(
                    config["numFloors"] - 1,
                    round(center[2] * cell_size / FLOOR_HEIGHT_METERS),
                ),
            )
        ratio = density / venue_density if venue_density > 0 else 0.0
        if ratio < LOW_DENSITY_RATIO:
            density_class = "LOW"
        elif ratio < HIGH_DENSITY_RATIO:
            density_class = "MEDIUM"
        else:
            density_class = "HIGH"
        clusters.append(
            {
                "id": cluster_id,
                "centerX": round(center[0], 3),
                "centerY": round(center[1], 3),
                "floor": floor,
                "userCount": len(group),
                "densityClass": density_class,
                "radiusMeters": round(radius, 2),
                "usersPer100Sqm": round(density * 100, 3),
            }
        )
    return clusters, labels, (round(score, 4) if k >= 2 else None)


def _density_class(count: int, average: float) -> str:
    if count < 0.5 * average:
        return "LOW"
    if count < 1.5 * average:
        return "MEDIUM"
    return "HIGH"


def _build_simulation_aps(config: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    graph = create_grid_graph(
        config["gridWidth"],
        config["gridHeight"],
        config["signalRadius"],
    )
    floor_aps = greedy_minimum_dominating_set(graph)
    aps = [
        {
            "id": f"AP-{floor + 1}-{x}-{y}",
            "x": x,
            "y": y,
            "floor": floor,
        }
        for floor in range(config["numFloors"])
        for x, y in floor_aps
    ]
    return aps, graph.number_of_edges() * config["numFloors"]


def _build_telemetry_aps(
    measurements: list[dict[str, Any]],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    ap_locations: dict[str, dict[str, Any]] = {}
    for row in measurements:
        ap_id = row["apId"]
        candidate = {
            "id": ap_id,
            "x": float(row["apX"]),
            "y": float(row["apY"]),
            "floor": int(
                row.get("apFloor")
                if row.get("apFloor") is not None
                else row["floor"]
            ),
        }
        if (
            candidate["x"] >= config["gridWidth"]
            or candidate["y"] >= config["gridHeight"]
            or candidate["floor"] >= config["numFloors"]
        ):
            raise ValueError(
                f"Measurement for {ap_id} falls outside the configured grid or floors."
            )
        existing = ap_locations.get(ap_id)
        if existing and any(
            abs(float(existing[key]) - float(candidate[key])) > 0.01
            for key in ("x", "y", "floor")
        ):
            raise ValueError(f"AP {ap_id} has inconsistent coordinates in the CSV.")
        ap_locations[ap_id] = candidate
    return list(ap_locations.values())


def _generate_users(config: dict[str, Any], rng: random.Random) -> list[dict[str, Any]]:
    width, height, floors = config["gridWidth"], config["gridHeight"], config["numFloors"]
    hotspots: list[tuple[float, float, int]] = []
    if config["userDistribution"] == "hotspots":
        hotspots = [
            (rng.uniform(0, width - 1), rng.uniform(0, height - 1), rng.randrange(floors))
            for _ in range(HOTSPOT_COUNT)
        ]
    spread = max(1.0, min(width, height) / 8)
    users = []
    for _ in range(config["numUsers"]):
        if hotspots and rng.random() < HOTSPOT_USER_SHARE:
            hx, hy, floor = rng.choice(hotspots)
            x = min(width - 1, max(0, round(rng.gauss(hx, spread))))
            y = min(height - 1, max(0, round(rng.gauss(hy, spread))))
        else:
            x, y, floor = rng.randrange(width), rng.randrange(height), rng.randrange(floors)
        users.append(
            {
                "x": x,
                "y": y,
                "floor": floor,
                "measuredRssiDbm": None,
                "measuredThroughputMbps": None,
                "measuredChannelUtilizationPercent": None,
                "measuredPacketLossPercent": None,
            }
        )
    return users


def _assign_channels(
    aps: list[dict[str, Any]], config: dict[str, Any]
) -> tuple[list[int], int]:
    """Colour the AP interference graph with the available channels.

    APs within twice the signal radius interfere. Welsh-Powell ordering is used;
    when no conflict-free channel remains, the least-used neighbouring channel
    is reused. Returns each AP's channel and the number of co-channel edges.
    """
    count = int(config["channelCount"])
    plan = list(DEFAULT_CHANNEL_PLAN) if count == 3 else list(range(1, count + 1))
    reach = 2 * config["signalRadius"]
    vertical = FLOOR_HEIGHT_METERS / config["cellSizeMeters"]
    neighbours: list[set[int]] = [set() for _ in aps]
    for i, a in enumerate(aps):
        for j in range(i + 1, len(aps)):
            b = aps[j]
            distance = math.sqrt(
                (float(a["x"]) - float(b["x"])) ** 2
                + (float(a["y"]) - float(b["y"])) ** 2
                + ((int(a["floor"]) - int(b["floor"])) * vertical) ** 2
            )
            if distance <= reach:
                neighbours[i].add(j)
                neighbours[j].add(i)

    channels: list[int | None] = [None] * len(aps)
    for i in sorted(range(len(aps)), key=lambda index: (-len(neighbours[index]), aps[index]["id"])):
        used = Counter(channels[j] for j in neighbours[i] if channels[j] is not None)
        channels[i] = min(plan, key=lambda channel: (used[channel], plan.index(channel)))
    conflicts = sum(
        1
        for i in range(len(aps))
        for j in neighbours[i]
        if j > i and channels[i] == channels[j]
    )
    return [int(channel) for channel in channels if channel is not None], conflicts


def _load_snapshot(
    assignment: list[int], ap_count: int, config: dict[str, Any], capacity_users: float
) -> dict[str, Any]:
    counts = Counter(assignment)
    loads = [counts.get(index, 0) for index in range(ap_count)]
    mean = sum(loads) / len(loads) if loads else 0
    congested = sum(
        1
        for load in loads
        if load > 0
        and (load > capacity_users or config["apBandwidthMbps"] / load < config["minBandwidthPerUser"])
    )
    return {
        "loadCoefficientOfVariation": round(pstdev(loads) / mean, 4) if mean > 0 else 0.0,
        "congestedApCount": congested,
        "maxApUsers": max(loads) if loads else 0,
    }


def _balance_load(
    users: list[dict[str, Any]],
    aps: list[dict[str, Any]],
    assignment: list[int],
    serving_rssi: list[float],
    links: list[list[float]],
    config: dict[str, Any],
    capacity_users: float,
) -> dict[str, Any]:
    """Apply load balancing inside the model by re-associating users.

    Users on APs above BALANCE_TOLERANCE x the mean load move to the
    alternative AP with the smallest RSSI loss, provided the new link still
    meets the minimum RSSI and the target AP stays within the load limit.
    No real access point or client is touched.
    """
    before = _load_snapshot(assignment, len(aps), config, capacity_users)
    limit = max(1, math.ceil(len(users) / len(aps) * BALANCE_TOLERANCE)) if aps else 0
    current = list(assignment)
    current_rssi = list(serving_rssi)
    counts = Counter(current)
    alternatives = [
        sorted(
            (ap_index for ap_index in range(len(aps)) if links[u][ap_index] >= config["minimumRssiDbm"]),
            key=lambda ap_index: -links[u][ap_index],
        )[:BALANCE_CANDIDATES_PER_USER]
        for u in range(len(users))
    ]
    reassignments: list[dict[str, Any]] = []
    moved_users: set[int] = set()

    while True:
        best: tuple[float, int, int] | None = None
        for u in range(len(users)):
            if counts[current[u]] <= limit or u in moved_users:
                continue
            # Alternatives are sorted by RSSI, so the first fit loses the least signal.
            for target in alternatives[u]:
                if target == current[u] or counts[target] + 1 > limit:
                    continue
                candidate = (current_rssi[u] - links[u][target], u, target)
                if best is None or candidate < best:
                    best = candidate
                break
        if best is None:
            break
        _, u, target = best
        source = current[u]
        reassignments.append(
            {
                "fromApId": aps[source]["id"],
                "toApId": aps[target]["id"],
                "x": round(float(users[u]["x"]), 3),
                "y": round(float(users[u]["y"]), 3),
                "floor": int(users[u]["floor"]),
                "rssiBeforeDbm": round(current_rssi[u], 2),
                "rssiAfterDbm": round(links[u][target], 2),
            }
        )
        counts[source] -= 1
        counts[target] += 1
        current[u] = target
        current_rssi[u] = links[u][target]
        moved_users.add(u)

    after_counts = Counter(current)
    return {
        "movedUsers": len(reassignments),
        "loadLimitUsers": limit,
        "before": before,
        "after": _load_snapshot(current, len(aps), config, capacity_users),
        "apUserCountsAfter": {ap["id"]: after_counts.get(index, 0) for index, ap in enumerate(aps)},
        "reassignments": reassignments[:MAX_REPORTED_REASSIGNMENTS],
    }


def run_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    config = {**CONFIG_DEFAULTS, **payload["config"]}
    source_mode = payload["sourceMode"]
    measurements = payload.get("measurements") or []
    obstruction_cells = {
        (int(cell["x"]), int(cell["y"]), int(cell["floor"]))
        for cell in payload.get("obstructions") or []
    }
    for x, y, floor in obstruction_cells:
        if (
            x >= config["gridWidth"]
            or y >= config["gridHeight"]
            or floor >= config["numFloors"]
        ):
            raise ValueError("An obstruction cell is outside the configured venue.")
    if source_mode == "telemetry" and not measurements:
        raise ValueError("Telemetry mode requires at least one measurement row.")

    if source_mode == "simulation":
        aps, edge_count = _build_simulation_aps(config)
        users = _generate_users(config, random.Random(config["randomSeed"]))
    else:
        aps = _build_telemetry_aps(measurements, config)
        if not aps:
            raise ValueError("Telemetry file did not contain any access points.")
        edge_count = 0
        users = []
        for row in measurements:
            user = {
                "x": float(row["x"]),
                "y": float(row["y"]),
                "floor": int(row["floor"]),
                "apId": row["apId"],
                "measuredRssiDbm": row.get("rssiDbm"),
                "measuredThroughputMbps": row.get("throughputMbps"),
                "measuredChannelUtilizationPercent": row.get(
                    "channelUtilizationPercent"
                ),
                "measuredPacketLossPercent": row.get("packetLossPercent"),
            }
            if (
                user["x"] >= config["gridWidth"]
                or user["y"] >= config["gridHeight"]
                or user["floor"] >= config["numFloors"]
            ):
                raise ValueError(
                    "A telemetry user coordinate falls outside the configured grid or floors."
                )
            users.append(user)

    if not aps:
        raise ValueError("No access points could be generated.")

    # Link budget from every user to every AP, with seeded log-normal shadowing.
    fading_rng = random.Random(config["randomSeed"] * 7919 + 17)
    fading_std = float(config["shadowFadingStdDb"])
    links = [
        [
            _estimate_rssi(user, ap, config, obstruction_cells)
            + (fading_rng.gauss(0, fading_std) if fading_std > 0 else 0.0)
            for ap in aps
        ]
        for user in users
    ]

    ap_index_by_id = {ap["id"]: index for index, ap in enumerate(aps)}
    user_counts: Counter[str] = Counter()
    rssi_by_ap: dict[str, list[float]] = defaultdict(list)
    throughput_by_ap: dict[str, list[float]] = defaultdict(list)
    channel_utilization_by_ap: dict[str, list[float]] = defaultdict(list)
    packet_loss_by_ap: dict[str, list[float]] = defaultdict(list)
    cluster_results, cluster_labels, silhouette = _kmeans(users, config)
    analyzed_users: list[dict[str, Any]] = []
    assignment: list[int] = []
    serving_rssi: list[float] = []

    for index, user in enumerate(users):
        if source_mode == "simulation":
            ap_index = max(range(len(aps)), key=lambda candidate: links[index][candidate])
            rssi = links[index][ap_index]
        else:
            if user["apId"] not in ap_index_by_id:
                raise ValueError(f"Measurement references unknown AP {user['apId']}.")
            ap_index = ap_index_by_id[user["apId"]]
            measured_rssi = user["measuredRssiDbm"]
            rssi = (
                float(measured_rssi)
                if measured_rssi is not None
                else links[index][ap_index]
            )
        ap_id = aps[ap_index]["id"]
        assignment.append(ap_index)
        serving_rssi.append(rssi)

        user_counts[ap_id] += 1
        rssi_by_ap[ap_id].append(rssi)
        throughput = user["measuredThroughputMbps"]
        if throughput is not None:
            throughput_by_ap[ap_id].append(float(throughput))
        utilization = user["measuredChannelUtilizationPercent"]
        if utilization is not None:
            channel_utilization_by_ap[ap_id].append(float(utilization))
        packet_loss = user["measuredPacketLossPercent"]
        if packet_loss is not None:
            packet_loss_by_ap[ap_id].append(float(packet_loss))

        analyzed_users.append(
            {
                "x": round(float(user["x"]), 3),
                "y": round(float(user["y"]), 3),
                "floor": int(user["floor"]),
                "apId": ap_id,
                "rssiDbm": round(rssi, 2),
                "clusterId": cluster_labels[index],
            }
        )

    # Co-channel interference: every other active AP on the serving channel
    # adds its received power to the noise floor.
    channels, channel_conflicts = _assign_channels(aps, config)
    noise_mw = _dbm_to_mw(float(config["noiseFloorDbm"]))
    activity = [
        1.0 if user_counts.get(ap["id"], 0) else IDLE_AP_ACTIVITY for ap in aps
    ]
    for index, user in enumerate(analyzed_users):
        serving = assignment[index]
        interference_mw = sum(
            _dbm_to_mw(links[index][other]) * activity[other]
            for other in range(len(aps))
            if other != serving and channels[other] == channels[serving]
        )
        user["sinrDb"] = round(
            10 * math.log10(_dbm_to_mw(serving_rssi[index]) / (interference_mw + noise_mw)),
            2,
        )

    cluster_density = {
        cluster["id"]: cluster["densityClass"] for cluster in cluster_results
    }
    ap_cluster_counts: dict[str, Counter[int]] = defaultdict(Counter)
    for user in analyzed_users:
        ap_cluster_counts[user["apId"]][user["clusterId"]] += 1

    total_ap_users = sum(user_counts.values())
    average_users = total_ap_users / len(aps) if aps else 0
    capacity_users = (
        config["apBandwidthMbps"]
        * config["congestionThreshold"]
        / config["minBandwidthPerUser"]
    )
    ap_results: list[dict[str, Any]] = []
    load_counts: list[int] = []

    for ap_index, ap in enumerate(aps):
        ap_id = ap["id"]
        count = user_counts.get(ap_id, 0)
        load_counts.append(count)
        rssi_values = rssi_by_ap.get(ap_id, [])
        measured_throughput = throughput_by_ap.get(ap_id, [])
        bandwidth_per_user = (
            sum(measured_throughput) / len(measured_throughput)
            if measured_throughput
            else (config["apBandwidthMbps"] / count if count else None)
        )
        avg_utilization = (
            sum(channel_utilization_by_ap[ap_id])
            / len(channel_utilization_by_ap[ap_id])
            if channel_utilization_by_ap[ap_id]
            else None
        )
        avg_packet_loss = (
            sum(packet_loss_by_ap[ap_id]) / len(packet_loss_by_ap[ap_id])
            if packet_loss_by_ap[ap_id]
            else None
        )
        count_by_cluster = ap_cluster_counts.get(ap_id, Counter())
        dominant_cluster = (
            count_by_cluster.most_common(1)[0][0] if count_by_cluster else None
        )
        density = (
            cluster_density.get(dominant_cluster, "LOW")
            if dominant_cluster is not None
            else _density_class(count, average_users)
        )
        congested = bool(
            count > 0
            and (
                (bandwidth_per_user is not None
                 and bandwidth_per_user < config["minBandwidthPerUser"])
                or count > capacity_users
                or (avg_utilization is not None
                    and avg_utilization >= config["congestionThreshold"] * 100)
                or (avg_packet_loss is not None and avg_packet_loss >= 5)
            )
        )
        ap_results.append(
            {
                "id": ap_id,
                "x": round(float(ap["x"]), 3),
                "y": round(float(ap["y"]), 3),
                "floor": int(ap["floor"]),
                "userCount": count,
                "avgRssiDbm": (
                    round(sum(rssi_values) / len(rssi_values), 2)
                    if rssi_values
                    else None
                ),
                "densityClass": density,
                "bandwidthPerUserMbps": (
                    round(bandwidth_per_user, 2)
                    if bandwidth_per_user is not None
                    else None
                ),
                "congested": congested,
                "channel": channels[ap_index],
            }
        )

    covered_cells: set[tuple[int, int, int]] = set()
    reach = math.ceil(config["signalRadius"])
    for ap in aps:
        for floor in range(config["numFloors"]):
            for x in range(
                max(0, math.floor(ap["x"]) - reach),
                min(config["gridWidth"], math.floor(ap["x"]) + reach + 1),
            ):
                for y in range(
                    max(0, math.floor(ap["y"]) - reach),
                    min(config["gridHeight"], math.floor(ap["y"]) + reach + 1),
                ):
                    probe = {"x": x, "y": y, "floor": floor}
                    distance_cells = math.sqrt(
                        (x - ap["x"]) ** 2
                        + (y - ap["y"]) ** 2
                        + (
                            (floor - ap["floor"])
                            * FLOOR_HEIGHT_METERS
                            / config["cellSizeMeters"]
                        ) ** 2
                    )
                    if (
                        distance_cells <= config["signalRadius"]
                        and _estimate_rssi(probe, ap, config, obstruction_cells)
                        >= config["minimumRssiDbm"]
                    ):
                        covered_cells.add((x, y, floor))

    total_cells = (
        config["gridWidth"] * config["gridHeight"] * config["numFloors"]
    )
    all_rssi = [user["rssiDbm"] for user in analyzed_users]
    all_sinr = [user["sinrDb"] for user in analyzed_users]
    per_user_bandwidth: list[float] = []
    ap_result_by_id = {ap["id"]: ap for ap in ap_results}
    for user in analyzed_users:
        ap_result = ap_result_by_id[user["apId"]]
        if ap_result["bandwidthPerUserMbps"] is not None:
            per_user_bandwidth.append(ap_result["bandwidthPerUserMbps"])
    mean_load = sum(load_counts) / len(load_counts) if load_counts else 0
    load_cv = (
        pstdev(load_counts) / mean_load if mean_load > 0 and load_counts else 0.0
    )

    load_balancing = _balance_load(
        users, aps, assignment, serving_rssi, links, config, capacity_users
    )

    overloaded = [
        ap for ap in aps if user_counts.get(ap["id"], 0) > average_users * 1.2
    ]
    underloaded = [
        ap for ap in aps if user_counts.get(ap["id"], 0) < average_users * 0.8
    ]
    suggestions: list[str] = []
    if not overloaded:
        suggestions.append("Measured or simulated AP loads are balanced; no action is suggested.")
    elif not underloaded:
        suggestions.append(
            "All APs are heavily loaded; review capacity or consider additional APs."
        )
    else:
        for overloaded_ap in overloaded:
            nearest = min(
                underloaded,
                key=lambda ap: _distance_meters(
                    overloaded_ap, ap, config["cellSizeMeters"]
                ),
            )
            excess = max(
                1,
                round(user_counts[overloaded_ap["id"]] - average_users),
            )
            suggestions.append(
                f"{overloaded_ap['id']} has {user_counts[overloaded_ap['id']]} users; "
                f"review approximately {excess} users for reassignment to nearby "
                f"{nearest['id']} ({user_counts[nearest['id']]} users)."
            )
    if load_balancing["movedUsers"]:
        before, after = load_balancing["before"], load_balancing["after"]
        suggestions.append(
            f"Simulated rebalancing moved {load_balancing['movedUsers']} users: load "
            f"variation {before['loadCoefficientOfVariation']:.2f} -> "
            f"{after['loadCoefficientOfVariation']:.2f}, busiest AP "
            f"{before['maxApUsers']} -> {after['maxApUsers']} users."
        )
    if channel_conflicts:
        suggestions.append(
            f"{channel_conflicts} neighbouring AP pairs share a channel with "
            f"{config['channelCount']} channels available; consider more channels "
            "(for example 5 GHz) or lower transmit power."
        )

    metrics = {
        "apCount": len(aps),
        "userCount": len(analyzed_users),
        "coveragePercent": round(100 * len(covered_cells) / total_cells, 2),
        "avgRssiDbm": round(sum(all_rssi) / len(all_rssi), 2) if all_rssi else None,
        "minRssiDbm": min(all_rssi) if all_rssi else None,
        "avgBandwidthPerUserMbps": (
            round(sum(per_user_bandwidth) / len(per_user_bandwidth), 2)
            if per_user_bandwidth
            else None
        ),
        "congestedApCount": sum(1 for ap in ap_results if ap["congested"]),
        "loadCoefficientOfVariation": round(load_cv, 4),
        "clusterCount": len(cluster_results),
        "silhouetteScore": silhouette,
        "avgSinrDb": round(sum(all_sinr) / len(all_sinr), 2) if all_sinr else None,
        "minSinrDb": min(all_sinr) if all_sinr else None,
        "coChannelConflicts": channel_conflicts,
        "obstructionCount": len(obstruction_cells),
    }
    return {
        "apNodes": ap_results,
        "users": analyzed_users,
        "clusters": cluster_results,
        "metrics": metrics,
        "loadSuggestions": suggestions,
        "loadBalancing": load_balancing,
        "edgeCount": edge_count,
        "numFloors": config["numFloors"],
    }


def main() -> None:
    try:
        payload = json.load(sys.stdin)
        result = run_analysis(payload)
        sys.stdout.write(json.dumps(result, allow_nan=False))
    except ValueError as error:
        sys.stdout.write(json.dumps({"error": str(error)}))
    except Exception as error:  # The API converts this into a user-safe 400/500.
        sys.stderr.write(str(error))
        sys.exit(1)


if __name__ == "__main__":
    main()
