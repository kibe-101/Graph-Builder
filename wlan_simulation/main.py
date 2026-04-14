
# main.py
# Entry point for the Graph-Based WLAN Planning and Crowd Density
# Estimation System.  Runs the full simulation pipeline:
#
#   1. Build the environment graph
#   2. Place Access Points (Greedy MDS)
#   3. Simulate users and assign them to APs
#   4. Compute signal strength (RSSI)
#   5. Estimate crowd density
#   6. Optimize bandwidth allocation
#   7. Generate visualizations

import sys
import os

# Ensure the wlan_simulation directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from graph_model import create_grid_graph, get_node_positions
from ap_placement import greedy_minimum_dominating_set
from user_simulation import generate_users, assign_users_to_aps, count_users_per_ap
from signal_model import compute_all_rssi, average_rssi_per_ap
from density_estimator import estimate_density, estimate_density_with_rssi, classify_density
from bandwidth_optimizer import allocate_bandwidth, detect_congestion, suggest_load_balancing, bandwidth_report
from visualization import plot_simulation, plot_density_bar
from config import GRID_WIDTH, GRID_HEIGHT, SIGNAL_RADIUS, NUM_USERS, AP_BANDWIDTH_MBPS


def run_simulation():
    print("\n" + "=" * 60)
    print("  Graph-Based WLAN Planning & Crowd Density Estimation")
    print("=" * 60)

    # ── Step 1: Build the environment grid graph ───────────────────────────────
    print(f"\n[1] Building {GRID_WIDTH}×{GRID_HEIGHT} grid graph "
          f"(signal radius = {SIGNAL_RADIUS})...")
    G = create_grid_graph()
    pos = get_node_positions(G)
    print(f"    Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")

    # ── Step 2: Access Point placement via Greedy MDS ─────────────────────────
    print("\n[2] Running Greedy Minimum Dominating Set for AP placement...")
    ap_nodes = greedy_minimum_dominating_set(G)
    print(f"    Access Points selected: {len(ap_nodes)}")
    print(f"    AP locations: {ap_nodes[:5]}{'...' if len(ap_nodes) > 5 else ''}")

    # ── Step 3: Generate users and assign to APs ───────────────────────────────
    print(f"\n[3] Generating {NUM_USERS} users and assigning to nearest APs...")
    users = generate_users()
    assignment = assign_users_to_aps(users, ap_nodes)
    user_counts = count_users_per_ap(assignment)
    print(f"    Users generated: {len(users)}")
    print(f"    Avg users per AP: {sum(user_counts.values()) / len(ap_nodes):.2f}")

    # ── Step 4: Signal strength (RSSI) ────────────────────────────────────────
    print("\n[4] Computing RSSI for all users...")
    rssi_map = compute_all_rssi(assignment)
    avg_rssi = average_rssi_per_ap(rssi_map)
    overall_avg_rssi = [v for v in avg_rssi.values() if v is not None]
    if overall_avg_rssi:
        print(f"    Average RSSI across all APs: "
              f"{sum(overall_avg_rssi)/len(overall_avg_rssi):.3f} dBm (simulated)")

    # ── Step 5: Crowd density estimation ──────────────────────────────────────
    print("\n[5] Estimating crowd density...")
    density = estimate_density(user_counts)
    density_weighted = estimate_density_with_rssi(user_counts, rssi_map)
    density_class = classify_density(user_counts)

    high_density_aps = [ap for ap, cls in density_class.items() if cls == "HIGH"]
    low_density_aps = [ap for ap, cls in density_class.items() if cls == "LOW"]
    print(f"    HIGH density APs : {len(high_density_aps)}")
    print(f"    MEDIUM density APs: {sum(1 for c in density_class.values() if c == 'MEDIUM')}")
    print(f"    LOW density APs  : {len(low_density_aps)}")

    # ── Step 6: Bandwidth optimization ────────────────────────────────────────
    print(f"\n[6] Optimizing bandwidth (AP capacity = {AP_BANDWIDTH_MBPS} Mbps)...")
    allocation = allocate_bandwidth(user_counts)
    congestion = detect_congestion(user_counts)
    congested_aps = [ap for ap, c in congestion.items() if c]
    print(f"    Congested APs: {len(congested_aps)}")

    # Print bandwidth report
    report_lines = bandwidth_report(user_counts)
    for line in report_lines:
        print(line)

    # Load balancing suggestions
    print("[6b] Load balancing suggestions:")
    suggestions = suggest_load_balancing(user_counts, assignment, ap_nodes)
    for s in suggestions:
        print(f"    • {s}")

    # ── Step 7: Visualization ─────────────────────────────────────────────────
    print("\n[7] Generating visualizations...")
    output_dir = os.path.dirname(os.path.abspath(__file__))
    sim_output = os.path.join(output_dir, "wlan_simulation_output.png")
    bar_output = os.path.join(output_dir, "density_bar_output.png")

    plot_simulation(G, pos, ap_nodes, users, assignment, user_counts,
                    congestion=congestion, output_path=sim_output)
    plot_density_bar(user_counts, density_class, output_path=bar_output)

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SIMULATION COMPLETE")
    print("=" * 60)
    print(f"  Grid size         : {GRID_WIDTH} × {GRID_HEIGHT}")
    print(f"  Total nodes       : {G.number_of_nodes()}")
    print(f"  Graph edges       : {G.number_of_edges()}")
    print(f"  Access Points     : {len(ap_nodes)}")
    print(f"  Total users       : {len(users)}")
    print(f"  Congested APs     : {len(congested_aps)}")
    print(f"  Output files:")
    print(f"    → {sim_output}")
    print(f"    → {bar_output}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_simulation()
