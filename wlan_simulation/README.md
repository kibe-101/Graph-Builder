
# Graph-Based WLAN Planning and Crowd Density Estimation System

## 1. Project Overview

This system simulates how Wi-Fi Access Points (APs) can be placed **optimally** across a 2D environment using **graph theory**, and how the resulting network can be used to **estimate crowd density** and **optimize bandwidth allocation** — all without any machine learning or AI.

### Why it is useful

- **ISPs and network engineers** can use it to pre-plan AP placement in offices, campuses, or public venues, minimizing hardware while ensuring full coverage.
- **Crowd monitoring** uses the number of Wi-Fi connections per AP as a proxy for how many people are present in a given area — useful for events, malls, and transportation hubs.
- **Bandwidth optimization** prevents individual users from suffering slow speeds when too many devices connect to the same AP, and suggests redistribution where possible.

---

## 2. How It Works (Step-by-Step)

### Step 1 — Environment Creation
A 2D grid (`20×20` by default) is created where each cell is a **node** representing a physical location in the deployment area.

### Step 2 — Graph Modeling
Nodes are connected by edges if their Euclidean distance is within a configurable **signal radius**. This models which locations are reachable by the same Wi-Fi signal.

### Step 3 — AP Placement (Greedy MDS)
A **Greedy Minimum Dominating Set** algorithm selects the smallest subset of nodes to act as APs.  A "dominating set" ensures that every node either *is* an AP or is *adjacent* (within signal range) of one — full coverage with minimum hardware.

### Step 4 — User Simulation
A configurable number of users are randomly distributed across the grid.  Each user is assigned to the **nearest AP** using Euclidean distance.

### Step 5 — Signal Strength (RSSI)
Signal strength is estimated for each user using the formula:

```
RSSI = -10 × log10(distance + 1)
```

Users closer to their AP have a less negative RSSI (stronger signal).

### Step 6 — Crowd Density Estimation
Density is measured as the **number of users connected per AP**.  An optional refinement weights density by RSSI variation — spread-out users have higher RSSI standard deviation, indicating a larger coverage area.

Each AP is classified as **LOW**, **MEDIUM**, or **HIGH** density relative to the average.

### Step 7 — Bandwidth Optimization
Each AP has a fixed bandwidth budget (default: 100 Mbps).  When many users connect, per-user bandwidth is divided equally.  APs exceeding the congestion threshold are flagged.  A load-balancing algorithm suggests migrating users from overloaded APs to nearby underloaded ones.

### Step 8 — Visualization
Two output images are generated:
- **wlan_simulation_output.png** — grid map with AP locations, user positions, coverage circles, and a crowd density heatmap.
- **density_bar_output.png** — bar chart showing user counts per AP, color-coded by density class.

---

## 3. File-by-File Explanation

| File | Purpose |
|---|---|
| `main.py` | Orchestrates the entire simulation pipeline from start to finish |
| `graph_model.py` | Creates the 2D grid graph with NetworkX; connects nodes within signal radius |
| `ap_placement.py` | Implements the Greedy Minimum Dominating Set algorithm for AP selection |
| `user_simulation.py` | Randomly generates users and assigns each to their nearest AP |
| `signal_model.py` | Calculates RSSI per user using the logarithmic path-loss formula |
| `density_estimator.py` | Computes crowd density per AP; classifies APs as LOW/MEDIUM/HIGH |
| `bandwidth_optimizer.py` | Allocates bandwidth per user; detects congestion; suggests load balancing |
| `visualization.py` | Renders the grid map (heatmap + coverage circles) and density bar chart |
| `config.py` | Central configuration — change simulation parameters here |

---

## 4. How to Run

### Install dependencies

```bash
pip install networkx matplotlib numpy
```

### Run the simulation

```bash
cd wlan_simulation
python main.py
```

The simulation prints a full report to the console and saves two PNG images in the same directory.

---

## 5. Output Explanation

### Console output
- **AP locations** selected by the MDS algorithm
- **Average RSSI** across the network
- **Density classification** (LOW / MEDIUM / HIGH) per AP
- **Bandwidth allocation report** — per-user Mbps and congestion status
- **Load balancing suggestions** listing which users to migrate and where

### wlan_simulation_output.png
| Element | Description |
|---|---|
| Red–yellow heatmap | Higher color intensity = more users in that region |
| Red stars (`★`) | Access Point locations |
| Blue dots | Simulated user positions |
| Dashed blue circles | Signal coverage radius of each AP |
| Number next to each `★` | User count connected to that AP |
| Gold border on `★` | AP is congested |

### density_bar_output.png
- Each bar represents one AP
- Bar height = number of connected users
- **Green** = LOW density, **Orange** = MEDIUM, **Red** = HIGH

---

## 6. Configuring the Simulation

All parameters are in `config.py`:

```python
GRID_WIDTH  = 20        # Grid columns
GRID_HEIGHT = 20        # Grid rows
SIGNAL_RADIUS = 3.0     # Max distance for connectivity (graph edges)
NUM_USERS = 100         # Number of simulated users
AP_BANDWIDTH_MBPS = 100 # Total bandwidth per AP (Mbps)
CONGESTION_THRESHOLD = 0.80  # Fraction of capacity before congestion flag
MIN_BANDWIDTH_PER_USER = 1.0 # Minimum acceptable Mbps per user
RANDOM_SEED = 42        # Set to None for random results each run
```

---

## 7. Real-World Applications

| Domain | Use Case |
|---|---|
| **Campus networks** | Automatically plan AP coverage for lecture halls and open areas |
| **Shopping malls** | Estimate foot traffic distribution by floor zone from Wi-Fi probe counts |
| **Stadium / events** | Pre-plan APs to avoid congestion at entrances and seating areas |
| **ISP planning** | Minimize hardware cost while ensuring every customer has coverage |
| **Smart cities** | Combine with mobility data to build real-time crowd density maps |
| **Emergency response** | Detect unusual density spikes as early indicators of crowd surges |
