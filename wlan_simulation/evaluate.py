"""Collect functional, performance and end-to-end evaluation results.

Run from this folder:
    python evaluate.py                         # engine tests + benchmarks
    python evaluate.py --api http://127.0.0.1:8080/api   # also exercise the live API

Writes docs/evaluation/RESULTS.md at the repository root. Usability results are
not generated here; see docs/evaluation/usability-test-plan.md.
"""

from __future__ import annotations

import argparse
import datetime as dt
import io
import json
import platform
import statistics
import time
import unittest
import urllib.request
from pathlib import Path
from typing import Any

import engine
import test_engine

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "docs" / "evaluation" / "RESULTS.md"
TIMING_REPEATS = 3

SCENARIOS = [
    ("Small room", {"gridWidth": 10, "gridHeight": 10, "numUsers": 50}),
    ("Default venue", {}),
    ("Large hall", {"gridWidth": 30, "gridHeight": 30, "numUsers": 300}),
    ("3-floor building", {"gridWidth": 30, "gridHeight": 30, "numFloors": 3, "numUsers": 500}),
    (
        "3 floors, walls, fading, hotspots",
        {
            "gridWidth": 30,
            "gridHeight": 30,
            "numFloors": 3,
            "numUsers": 500,
            "shadowFadingStdDb": 6,
            "userDistribution": "hotspots",
        },
        "walls",
    ),
]


def corridor_walls(config: dict[str, Any]) -> list[dict[str, int]]:
    """Two corridor walls per floor with door gaps, as a stand-in floor plan."""
    width, height = config.get("gridWidth", 20), config.get("gridHeight", 20)
    walls = []
    for floor in range(config.get("numFloors", 1)):
        for x in range(width):
            if x % 6 != 3:
                walls.append({"x": x, "y": height // 3, "floor": floor})
                walls.append({"x": x, "y": 2 * height // 3, "floor": floor})
    return walls


def run_functional_tests() -> dict[str, Any]:
    suite = unittest.defaultTestLoader.loadTestsFromModule(test_engine)
    # TestSuite drops each test after running it, so list them first.
    cases = list(_iter_tests(suite))
    result = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)
    groups: dict[str, list[int]] = {}
    failed = {str(test) for test, _ in result.failures + result.errors}
    for case in cases:
        group = type(case).__name__
        passed, total = groups.setdefault(group, [0, 0])
        groups[group] = [passed + (str(case) not in failed), total + 1]
    return {"run": result.testsRun, "failed": len(failed), "groups": groups}


def _iter_tests(suite: unittest.TestSuite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from _iter_tests(item)
        else:
            yield item


def benchmark() -> list[dict[str, Any]]:
    rows = []
    for name, overrides, *flags in SCENARIOS:
        config = {**test_engine.BASE_CONFIG, **overrides}
        payload: dict[str, Any] = {"sourceMode": "simulation", "config": config}
        if "walls" in flags:
            payload["obstructions"] = corridor_walls(config)
        timings = []
        for _ in range(TIMING_REPEATS):
            start = time.perf_counter()
            result = engine.run_analysis(payload)
            timings.append(time.perf_counter() - start)
        metrics, balancing = result["metrics"], result["loadBalancing"]
        rows.append(
            {
                "name": name,
                "size": f"{config['gridWidth']}x{config['gridHeight']}x{config['numFloors']}",
                "users": config["numUsers"],
                "walls": len(payload.get("obstructions", [])),
                "seconds": statistics.median(timings),
                "metrics": metrics,
                "balancing": balancing,
            }
        )
    return rows


def compare_channel_plans() -> list[dict[str, Any]]:
    rows = []
    for channels in (1, 3, 13):
        metrics = test_engine.simulate(channelCount=channels, numUsers=300)["metrics"]
        rows.append({"channels": channels, **metrics})
    return rows


def end_to_end(api: str) -> dict[str, Any]:
    def call(path: str, body: dict[str, Any] | None = None) -> tuple[int, Any, float]:
        request = urllib.request.Request(
            f"{api}{path}",
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Content-Type": "application/json"},
            method="POST" if body is not None else "GET",
        )
        start = time.perf_counter()
        # Local API only; bypass any system proxy.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(request, timeout=60) as response:
            return response.status, json.load(response), time.perf_counter() - start

    health_status, health, _ = call("/healthz")
    body = {
        "sourceMode": "simulation",
        "config": {**test_engine.BASE_CONFIG, "userDistribution": "hotspots"},
        "obstructions": corridor_walls(test_engine.BASE_CONFIG),
    }
    post_status, run, post_seconds = call("/simulation-runs", body)
    list_status, runs, _ = call("/simulation-runs")
    return {
        "health": (health_status, health),
        "post": (post_status, round(post_seconds, 2), run["id"], run["result"]["metrics"]),
        "listed": list_status == 200 and any(item["id"] == run["id"] for item in runs),
    }


def fmt(value: Any, digits: int = 2) -> str:
    return "—" if value is None else f"{value:.{digits}f}" if isinstance(value, float) else str(value)


def write_report(tests: dict[str, Any], bench: list[dict[str, Any]], channels: list[dict[str, Any]], e2e: dict[str, Any] | None) -> None:
    lines = [
        "# Evaluation results",
        "",
        f"Generated by `wlan_simulation/evaluate.py` on {dt.date.today().isoformat()} "
        f"(Python {platform.python_version()}, {platform.system()} {platform.machine()}). "
        "Re-run the script to refresh these numbers; do not edit them by hand.",
        "",
        "All venues below are synthetic. They test the model's behaviour, not a real "
        "institutional network; see *Limitations*.",
        "",
        "## Functional testing",
        "",
        f"{tests['run'] - tests['failed']} of {tests['run']} engine tests passed.",
        "",
        "| Area | Passed |",
        "| --- | --- |",
    ]
    for group, (passed, total) in tests["groups"].items():
        lines.append(f"| {group.removesuffix('Tests')} | {passed}/{total} |")
    lines += [
        "",
        "## Performance",
        "",
        f"Median of {TIMING_REPEATS} in-process runs of `run_analysis` per scenario.",
        "",
        "| Scenario | Grid (WxHxfloors) | Users | Wall cells | Time (s) | APs | Coverage % | Avg RSSI (dBm) | Avg SINR (dB) | k | Silhouette |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in bench:
        m = row["metrics"]
        lines.append(
            f"| {row['name']} | {row['size']} | {row['users']} | {row['walls']} | {row['seconds']:.2f} | "
            f"{m['apCount']} | {fmt(m['coveragePercent'], 1)} | {fmt(m['avgRssiDbm'], 1)} | "
            f"{fmt(m['avgSinrDb'], 1)} | {m['clusterCount']} | {fmt(m['silhouetteScore'])} |"
        )
    lines += [
        "",
        "## Simulated load balancing",
        "",
        "| Scenario | Users moved | Load CV before | Load CV after | Busiest AP before | Busiest AP after | Congested before | Congested after |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in bench:
        b = row["balancing"]
        lines.append(
            f"| {row['name']} | {b['movedUsers']} | {fmt(b['before']['loadCoefficientOfVariation'])} | "
            f"{fmt(b['after']['loadCoefficientOfVariation'])} | {b['before']['maxApUsers']} | "
            f"{b['after']['maxApUsers']} | {b['before']['congestedApCount']} | {b['after']['congestedApCount']} |"
        )
    lines += [
        "",
        "## Channel plan and interference",
        "",
        "Default venue with 300 users. Fewer channels force neighbouring APs to share, lowering SINR.",
        "",
        "| Channels | Co-channel AP pairs | Avg SINR (dB) | Min SINR (dB) |",
        "| --- | --- | --- | --- |",
    ]
    for row in channels:
        lines.append(f"| {row['channels']} | {row['coChannelConflicts']} | {fmt(row['avgSinrDb'], 1)} | {fmt(row['minSinrDb'], 1)} |")
    lines += ["", "## End-to-end system test", ""]
    if e2e:
        status, metrics = e2e["post"][0], e2e["post"][3]
        lines += [
            "GUI-facing API → Python engine → PostgreSQL, exercised over HTTP.",
            "",
            "| Check | Result |",
            "| --- | --- |",
            f"| `GET /healthz` | {e2e['health'][0]}, database `{e2e['health'][1].get('database')}` |",
            f"| `POST /simulation-runs` (hotspots + corridor walls) | {status} in {e2e['post'][1]} s, run #{e2e['post'][2]}, "
            f"{metrics['apCount']} APs, {metrics['obstructionCount']} wall cells |",
            f"| Saved run appears in `GET /simulation-runs` | {'yes' if e2e['listed'] else 'no'} |",
        ]
    else:
        lines.append("Not run. Start the API and pass `--api http://127.0.0.1:8080/api` to include it.")
    lines += [
        "",
        "## Usability testing",
        "",
        "Not yet carried out. It needs real participants; the procedure and SUS "
        "questionnaire are in [usability-test-plan.md](usability-test-plan.md).",
        "",
        "## Limitations",
        "",
        "- Venues and users are synthetic; results must be validated against a site survey of the real institution.",
        "- The corridor walls are a generic stand-in, not a digitised institutional floor plan.",
        "- Coverage uses the median link budget (no fading); SINR assumes full activity on loaded co-channel APs.",
        "- Load balancing is applied inside the model only; no controller or AP is reconfigured.",
        "",
    ]
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api", help="Base URL of a running API, e.g. http://127.0.0.1:8080/api")
    args = parser.parse_args()
    tests = run_functional_tests()
    print(f"Functional tests: {tests['run'] - tests['failed']}/{tests['run']} passed")
    bench = benchmark()
    for row in bench:
        print(f"  {row['name']}: {row['seconds']:.2f}s")
    channels = compare_channel_plans()
    e2e = end_to_end(args.api.rstrip("/")) if args.api else None
    if e2e:
        print(f"End-to-end: POST {e2e['post'][0]}, listed={e2e['listed']}")
    write_report(tests, bench, channels, e2e)
    print(f"Wrote {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
