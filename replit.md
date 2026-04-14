# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Python Simulation: WLAN Planning System

Located in `wlan_simulation/`. A pure-Python, graph-theory-based simulation.

### Files
- `main.py` — entry point, runs full pipeline
- `graph_model.py` — 2D grid graph (NetworkX)
- `ap_placement.py` — greedy Minimum Dominating Set for AP placement
- `user_simulation.py` — random user generation + AP assignment
- `signal_model.py` — RSSI via log10 path-loss model
- `density_estimator.py` — crowd density estimation + LOW/MEDIUM/HIGH classification
- `bandwidth_optimizer.py` — bandwidth allocation, congestion detection, load balancing
- `visualization.py` — matplotlib plots (heatmap + coverage circles + bar chart)
- `config.py` — all simulation parameters

### Dependencies
`networkx`, `matplotlib`, `numpy` (installed via pip/uv)

### Run
```bash
cd wlan_simulation && python main.py
```

Outputs: `wlan_simulation_output.png` and `density_bar_output.png`

---

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
