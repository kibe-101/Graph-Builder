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


def _kmeans(
    users: list[dict[str, Any]],
    config: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[int]]:
    if not users:
        return [], []

    cell_size = config["cellSizeMeters"]
    points = [
        (
            float(user["x"]),
            float(user["y"]),
            int(user["floor"]) * FLOOR_HEIGHT_METERS / cell_size,
        )
        for user in users
    ]
    unique_points = list(dict.fromkeys(points))
    k = min(3, len(unique_points))
    rng = random.Random(config["randomSeed"])
    centers = [list(point) for point in rng.sample(unique_points, k)]
    labels = [0] * len(points)

    for _ in range(MAX_KMEANS_ITERATIONS):
        new_labels = [
            min(
                range(k),
                key=lambda cluster_id: sum(
                    (point[axis] - centers[cluster_id][axis]) ** 2
                    for axis in range(3)
                ),
            )
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
                [
                    sum(point[axis] for point in group) / len(group)
                    for axis in range(3)
                ]
            )

        stable = new_labels == labels
        centers_stable = all(
            sum(
                (new_centers[i][axis] - centers[i][axis]) ** 2
                for axis in range(3)
            )
            < 1e-10
            for i in range(k)
        )
        labels = new_labels
        centers = new_centers
        if stable and centers_stable:
            break

    counts = Counter(labels)
    mean_count = len(users) / k
    clusters: list[dict[str, Any]] = []
    for cluster_id, center in enumerate(centers):
        count = counts.get(cluster_id, 0)
        if count < 0.5 * mean_count:
            density = "LOW"
        elif count < 1.5 * mean_count:
            density = "MEDIUM"
        else:
            density = "HIGH"
        clusters.append(
            {
                "id": cluster_id,
                "centerX": round(center[0], 3),
                "centerY": round(center[1], 3),
                "floor": max(
                    0,
                    min(
                        config["numFloors"] - 1,
                        round(center[2] * cell_size / FLOOR_HEIGHT_METERS),
                    ),
                ),
                "userCount": count,
                "densityClass": density,
            }
        )
    return clusters, labels


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


def run_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    config = payload["config"]
    source_mode = payload["sourceMode"]
    measurements = payload.get("measurements") or []
    obstruction_cells = {
        (int(cell["x"]), int(cell["y"]), int(cell["floor"]))
        for cell in payload.get("obstructions", [])
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
        rng = random.Random(config["randomSeed"])
        users = [
            {
                "x": rng.randrange(config["gridWidth"]),
                "y": rng.randrange(config["gridHeight"]),
                "floor": rng.randrange(config["numFloors"]),
                "measuredRssiDbm": None,
                "measuredThroughputMbps": None,
                "measuredChannelUtilizationPercent": None,
                "measuredPacketLossPercent": None,
            }
            for _ in range(config["numUsers"])
        ]
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

    ap_by_id = {ap["id"]: ap for ap in aps}
    user_counts: Counter[str] = Counter()
    rssi_by_ap: dict[str, list[float]] = defaultdict(list)
    throughput_by_ap: dict[str, list[float]] = defaultdict(list)
    channel_utilization_by_ap: dict[str, list[float]] = defaultdict(list)
    packet_loss_by_ap: dict[str, list[float]] = defaultdict(list)
    cluster_results, cluster_labels = _kmeans(users, config)
    analyzed_users: list[dict[str, Any]] = []

    for index, user in enumerate(users):
        if source_mode == "simulation":
            strongest_ap = max(
                aps,
                key=lambda ap: _estimate_rssi(user, ap, config, obstruction_cells),
            )
            ap_id = strongest_ap["id"]
            rssi = _estimate_rssi(user, strongest_ap, config, obstruction_cells)
        else:
            ap_id = user["apId"]
            if ap_id not in ap_by_id:
                raise ValueError(f"Measurement references unknown AP {ap_id}.")
            strongest_ap = ap_by_id[ap_id]
            measured_rssi = user["measuredRssiDbm"]
            rssi = (
                float(measured_rssi)
                if measured_rssi is not None
                else _estimate_rssi(user, strongest_ap, config, obstruction_cells)
            )

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

    for ap in aps:
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
                        and _estimate_rssi(probe, ap, config)
                        >= config["minimumRssiDbm"]
                    ):
                        covered_cells.add((x, y, floor))

    total_cells = (
        config["gridWidth"] * config["gridHeight"] * config["numFloors"]
    )
    all_rssi = [user["rssiDbm"] for user in analyzed_users]
    per_user_bandwidth: list[float] = []
    for user in analyzed_users:
        ap_result = next(ap for ap in ap_results if ap["id"] == user["apId"])
        if ap_result["bandwidthPerUserMbps"] is not None:
            per_user_bandwidth.append(ap_result["bandwidthPerUserMbps"])
    mean_load = sum(load_counts) / len(load_counts) if load_counts else 0
    load_cv = (
        pstdev(load_counts) / mean_load if mean_load > 0 and load_counts else 0.0
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
    }
    return {
        "apNodes": ap_results,
        "users": analyzed_users,
        "clusters": cluster_results,
        "metrics": metrics,
        "loadSuggestions": suggestions,
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
