"""Functional tests for the JSON analysis engine.

Run from this folder: python -m unittest test_engine -v
"""

from __future__ import annotations

import io
import json
import math
import unittest
from contextlib import redirect_stdout
from unittest import mock

import engine

BASE_CONFIG = {
    "gridWidth": 20,
    "gridHeight": 20,
    "signalRadius": 3,
    "numUsers": 100,
    "apBandwidthMbps": 100,
    "congestionThreshold": 0.8,
    "minBandwidthPerUser": 1,
    "randomSeed": 42,
    "numFloors": 1,
    "cellSizeMeters": 5,
    "transmitPowerDbm": 20,
    "referencePathLossDb": 40,
    "pathLossExponent": 3,
    "floorPenaltyDb": 15,
    "minimumRssiDbm": -75,
    "wallLossDbPerObstruction": 5,
}


def simulate(obstructions=None, **overrides):
    payload = {"sourceMode": "simulation", "config": {**BASE_CONFIG, **overrides}}
    if obstructions is not None:
        payload["obstructions"] = obstructions
    return engine.run_analysis(payload)


def telemetry(rows, **overrides):
    return engine.run_analysis(
        {"sourceMode": "telemetry", "config": {**BASE_CONFIG, **overrides}, "measurements": rows}
    )


def link_config(**overrides):
    return {**engine.CONFIG_DEFAULTS, **BASE_CONFIG, **overrides}


class SignalModelTests(unittest.TestCase):
    def test_rssi_falls_with_distance(self):
        config = link_config()
        ap = {"x": 0, "y": 0, "floor": 0}
        values = [engine._estimate_rssi({"x": d, "y": 0, "floor": 0}, ap, config, set()) for d in range(1, 8)]
        self.assertEqual(values, sorted(values, reverse=True))

    def test_matches_log_distance_formula(self):
        config = link_config()
        rssi = engine._estimate_rssi({"x": 2, "y": 0, "floor": 0}, {"x": 0, "y": 0, "floor": 0}, config, set())
        expected = 20 - (40 + 10 * 3 * math.log10(10))
        self.assertAlmostEqual(rssi, expected, places=2)

    def test_each_wall_crossed_costs_wall_loss(self):
        config = link_config(wallLossDbPerObstruction=7)
        user, ap = {"x": 0, "y": 0, "floor": 0}, {"x": 6, "y": 0, "floor": 0}
        clear = engine._estimate_rssi(user, ap, config, set())
        one = engine._estimate_rssi(user, ap, config, {(3, 0, 0)})
        two = engine._estimate_rssi(user, ap, config, {(2, 0, 0), (4, 0, 0)})
        self.assertAlmostEqual(clear - one, 7, places=2)
        self.assertAlmostEqual(clear - two, 14, places=2)

    def test_walls_off_the_path_do_not_matter(self):
        config = link_config()
        user, ap = {"x": 0, "y": 0, "floor": 0}, {"x": 6, "y": 0, "floor": 0}
        self.assertEqual(
            engine._estimate_rssi(user, ap, config, set()),
            engine._estimate_rssi(user, ap, config, {(3, 5, 0), (3, 0, 1)}),
        )

    def test_floor_penalty_applies_per_floor(self):
        config = link_config(floorPenaltyDb=15)
        ap = {"x": 0, "y": 0, "floor": 0}
        same = engine._estimate_rssi({"x": 0, "y": 0, "floor": 0}, ap, config, set())
        above = engine._estimate_rssi({"x": 0, "y": 0, "floor": 1}, ap, config, set())
        self.assertGreaterEqual(same - above, 15)

    def test_walls_reduce_coverage_and_signal(self):
        wall = [{"x": x, "y": 10, "floor": 0} for x in range(20)]
        open_plan = simulate()
        walled = simulate(obstructions=wall, wallLossDbPerObstruction=20, minimumRssiDbm=-60)
        self.assertEqual(walled["metrics"]["obstructionCount"], 20)
        self.assertLessEqual(walled["metrics"]["avgRssiDbm"], open_plan["metrics"]["avgRssiDbm"])

    def test_shadow_fading_is_seeded(self):
        first = simulate(shadowFadingStdDb=6)
        second = simulate(shadowFadingStdDb=6)
        self.assertEqual(first, second)
        self.assertNotEqual(first["metrics"]["avgRssiDbm"], simulate()["metrics"]["avgRssiDbm"])

    def test_sinr_never_exceeds_snr(self):
        result = simulate(noiseFloorDbm=-95)
        for user in result["users"]:
            self.assertLessEqual(user["sinrDb"], user["rssiDbm"] + 95 + 0.01)


class PlacementAndContractTests(unittest.TestCase):
    def test_default_venue_reference_values(self):
        metrics = simulate()["metrics"]
        self.assertEqual(metrics["apCount"], 28)
        self.assertEqual(metrics["userCount"], 100)
        self.assertEqual(metrics["coveragePercent"], 100.0)

    def test_results_are_deterministic(self):
        self.assertEqual(simulate(userDistribution="hotspots"), simulate(userDistribution="hotspots"))

    def test_every_user_has_an_ap_and_cluster(self):
        result = simulate()
        ap_ids = {ap["id"] for ap in result["apNodes"]}
        cluster_ids = {cluster["id"] for cluster in result["clusters"]}
        for user in result["users"]:
            self.assertIn(user["apId"], ap_ids)
            self.assertIn(user["clusterId"], cluster_ids)
        self.assertEqual(sum(ap["userCount"] for ap in result["apNodes"]), 100)

    def test_obstruction_outside_venue_is_rejected(self):
        with self.assertRaises(ValueError):
            simulate(obstructions=[{"x": 25, "y": 0, "floor": 0}])

    def test_main_returns_json_error_for_bad_input(self):
        payload = {"sourceMode": "telemetry", "config": BASE_CONFIG, "measurements": []}
        output = io.StringIO()
        with mock.patch("sys.stdin", io.StringIO(json.dumps(payload))), redirect_stdout(output):
            engine.main()
        self.assertIn("error", json.loads(output.getvalue()))


class ClusteringTests(unittest.TestCase):
    def two_groups(self):
        rows = []
        for i in range(30):
            rows.append({"apId": "AP-A", "apX": 2, "apY": 2, "x": 1 + i % 3, "y": 1 + i % 2, "floor": 0})
            rows.append({"apId": "AP-B", "apX": 17, "apY": 17, "x": 16 + i % 3, "y": 17 + i % 2, "floor": 0})
        return rows

    def test_auto_k_finds_separated_groups(self):
        result = telemetry(self.two_groups())
        self.assertEqual(result["metrics"]["clusterCount"], 2)
        self.assertGreater(result["metrics"]["silhouetteScore"], 0.8)

    def test_tight_groups_are_high_density(self):
        result = telemetry(self.two_groups())
        self.assertTrue(all(cluster["densityClass"] == "HIGH" for cluster in result["clusters"]))

    def test_uniform_users_are_not_high_density(self):
        result = simulate(numUsers=400)
        self.assertTrue(all(cluster["densityClass"] != "HIGH" for cluster in result["clusters"]))

    def test_fixed_k_is_honoured(self):
        self.assertEqual(simulate(kmeansClusters=5)["metrics"]["clusterCount"], 5)

    def test_auto_k_stays_in_range(self):
        count = simulate()["metrics"]["clusterCount"]
        self.assertTrue(2 <= count <= engine.MAX_AUTO_CLUSTERS)


class ChannelPlanTests(unittest.TestCase):
    def test_enough_channels_remove_conflicts(self):
        self.assertEqual(simulate(channelCount=13)["metrics"]["coChannelConflicts"], 0)

    def test_three_channel_plan_uses_1_6_11(self):
        channels = {ap["channel"] for ap in simulate()["apNodes"]}
        self.assertTrue(channels <= {1, 6, 11})

    def test_fewer_channels_mean_more_conflicts_and_lower_sinr(self):
        one = simulate(channelCount=1)["metrics"]
        three = simulate(channelCount=3)["metrics"]
        self.assertGreater(one["coChannelConflicts"], three["coChannelConflicts"])
        self.assertLess(one["avgSinrDb"], three["avgSinrDb"])


class LoadBalancingTests(unittest.TestCase):
    def test_balancing_reduces_load_spread(self):
        balancing = simulate(userDistribution="hotspots", numUsers=300)["loadBalancing"]
        self.assertGreater(balancing["movedUsers"], 0)
        self.assertLess(
            balancing["after"]["loadCoefficientOfVariation"],
            balancing["before"]["loadCoefficientOfVariation"],
        )
        self.assertLessEqual(balancing["after"]["maxApUsers"], balancing["before"]["maxApUsers"])

    def test_moves_respect_minimum_rssi_and_conserve_users(self):
        result = simulate(userDistribution="hotspots", numUsers=300)
        balancing = result["loadBalancing"]
        for move in balancing["reassignments"]:
            self.assertGreaterEqual(move["rssiAfterDbm"], BASE_CONFIG["minimumRssiDbm"])
            self.assertNotEqual(move["fromApId"], move["toApId"])
        self.assertEqual(sum(balancing["apUserCountsAfter"].values()), 300)

    def test_target_aps_stay_within_limit(self):
        balancing = simulate(userDistribution="hotspots", numUsers=300)["loadBalancing"]
        targets = {move["toApId"] for move in balancing["reassignments"]}
        for ap_id in targets:
            self.assertLessEqual(balancing["apUserCountsAfter"][ap_id], balancing["loadLimitUsers"])


class TelemetryTests(unittest.TestCase):
    rows = [
        {"apId": "AP-1", "apX": 4, "apY": 5, "x": 6, "y": 7, "floor": 0, "rssiDbm": -61.5, "throughputMbps": 84},
        {"apId": "AP-2", "apX": 15, "apY": 15, "x": 14, "y": 12, "floor": 0, "rssiDbm": -58},
    ]

    def test_measured_rssi_is_kept(self):
        users = telemetry(self.rows)["users"]
        self.assertEqual([user["rssiDbm"] for user in users], [-61.5, -58])

    def test_unknown_coordinates_are_rejected(self):
        bad = [{**self.rows[0], "x": 25}]
        with self.assertRaises(ValueError):
            telemetry(bad)


if __name__ == "__main__":
    unittest.main()
