# Graph-Based WLAN Planning with Crowd Density Estimation

A planning console for campus Wi-Fi. It places access points with a graph
dominating-set algorithm, estimates signal and interference, clusters users with
K-Means to find crowded areas, and tests load balancing — all on a model of the
venue, never on the live network.

## Architecture

```
Browser (artifacts/wlan-gui, React + Vite)
   │  /api  (generated client: lib/api-client-react)
   ▼
API server (artifacts/api-server, Express)  ──►  PostgreSQL (lib/db, Drizzle)
   │  JSON over stdin/stdout                       stores run config + summary
   ▼
Python engine (wlan_simulation/engine.py)
```

The OpenAPI contract in `lib/api-spec/openapi.yaml` generates both the React
hooks and the zod validators (`pnpm --filter @workspace/api-spec run codegen`).
The header badge in the GUI shows whether the API and database are reachable.

## What the engine models

| Area | How |
| --- | --- |
| AP placement | Greedy minimum dominating set on a grid graph, per floor |
| Signal | Log-distance path loss, floor penetration loss, per-wall loss along the line of sight, optional seeded log-normal shadow fading |
| Interference | Channels assigned by colouring the AP interference graph (3 channels = 1/6/11); per-user SINR counts co-channel APs |
| Crowd density | K-Means with k-means++ seeding; k chosen by silhouette score (or fixed). Each cluster is classed by users per area against the venue average |
| Load balancing | Users on overloaded APs are re-associated, in the model, to the nearby AP with the least signal loss that still meets the minimum RSSI. Before/after load figures are returned |
| Data sources | Simulated users (uniform or crowd hotspots), or an imported survey CSV |

## Using real institutional data

Nothing in this repository is real institutional data. To model a real building:

1. **Layout** — load the floor-plan image as an overlay, turn on *Draw walls*,
   and trace the walls on each floor. *Export JSON* saves the layout so it can be
   re-imported and kept with the project. Format:
   `{"version": 1, "gridWidth", "gridHeight", "numFloors", "cellSizeMeters", "obstructions": [{"x", "y", "floor"}]}`.
   Set `cellSizeMeters` from the drawing's scale.
2. **Measurements** — export a site survey or controller report as CSV with
   the columns `apId, apX, apY, x, y, floor` and optionally `rssiDbm,
   throughputMbps, channelUtilizationPercent, packetLossPercent`. No device or
   user identifiers are accepted.
3. Calibrate the radio parameters (path-loss exponent, wall loss) until the
   model's RSSI matches the survey.

Synthetic examples of both files are in [`docs/samples`](docs/samples).

## Running locally

Requirements: Node 24+, pnpm 10, Python 3.11+, PostgreSQL.

```bash
pnpm install
python -m venv .venv && .venv/bin/pip install networkx matplotlib numpy   # Windows: .venv\Scripts\pip
export DATABASE_URL=postgresql://user:pass@localhost:5432/wlan
pnpm --filter @workspace/db run push
```

Start the API (port 8080) and GUI (port 25989) in two terminals:

```bash
PORT=8080 PYTHON=.venv/bin/python pnpm --filter @workspace/api-server run dev
PORT=25989 BASE_PATH=/ pnpm --filter @workspace/wlan-gui run dev
```

The GUI proxies `/api` to `http://127.0.0.1:8080`; set `API_PROXY_TARGET` if
the API runs elsewhere. On Replit the same services start from the workspace
run button.

## Evaluation

```bash
cd wlan_simulation
python -m unittest test_engine -v                     # functional tests
python evaluate.py --api http://127.0.0.1:8080/api    # tests, benchmarks, end-to-end check
```

`evaluate.py` writes [`docs/evaluation/RESULTS.md`](docs/evaluation/RESULTS.md).
Usability testing needs participants; the procedure and SUS questionnaire are in
[`docs/evaluation/usability-test-plan.md`](docs/evaluation/usability-test-plan.md).

## Limits

- Results are only as good as the layout and calibration supplied; validate
  against a real site survey before buying or moving hardware.
- Load balancing and channel plans are recommendations from the model. The
  system has no controller integration and changes no AP or client settings.
