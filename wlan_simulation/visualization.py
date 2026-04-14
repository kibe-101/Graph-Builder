
# visualization.py
# Handles all plotting for the simulation:
#   1. Grid + graph edges
#   2. AP locations (marked distinctly)
#   3. User positions
#   4. Coverage radius circles
#   5. Crowd density as a color-intensity heatmap overlay

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend (safe for all environments)
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from matplotlib.colors import Normalize
from matplotlib.cm import ScalarMappable

from config import (GRID_WIDTH, GRID_HEIGHT, SIGNAL_RADIUS,
                    FIGURE_SIZE, COVERAGE_ALPHA, HEATMAP_ALPHA)


def build_density_grid(user_counts, ap_nodes, width=GRID_WIDTH, height=GRID_HEIGHT,
                       radius=SIGNAL_RADIUS):
    """
    Build a 2D numpy array for the heatmap where each cell's value
    represents the density contribution from nearby APs.

    Each AP contributes its user count to all grid cells within its
    signal radius (weighted by inverse distance).

    Parameters:
        user_counts (dict): {ap_node: int}
        ap_nodes    (list): List of AP positions.
        width, height (int): Grid dimensions.
        radius      (float): AP signal radius.

    Returns:
        np.ndarray: Shape (height, width) density values.
    """
    grid = np.zeros((height, width))

    for ap in ap_nodes:
        ax, ay = ap
        count = user_counts.get(ap, 0)
        if count == 0:
            continue
        for gx in range(width):
            for gy in range(height):
                dist = np.sqrt((gx - ax) ** 2 + (gy - ay) ** 2)
                if dist <= radius:
                    # Weighted contribution — closer cells receive more density
                    weight = 1.0 / (dist + 1.0)
                    grid[gy, gx] += count * weight

    return grid


def plot_simulation(G, pos, ap_nodes, users, assignment, user_counts,
                    congestion=None, output_path="wlan_simulation_output.png"):
    """
    Produce the full simulation visualization and save it to a PNG file.

    The plot includes:
      - Semi-transparent heatmap showing crowd density per region
      - Graph nodes (grey) and edges (light grey)
      - Coverage radius circles around each AP
      - AP markers (red stars)
      - User positions (blue dots)
      - Congested APs highlighted with a yellow border

    Parameters:
        G           (nx.Graph): The grid graph.
        pos         (dict):     {node: (x, y)} positions.
        ap_nodes    (list):     AP node positions.
        users       (list):     List of (x, y) user positions.
        assignment  (dict):     {ap_node: [user_positions]}
        user_counts (dict):     {ap_node: int}
        congestion  (dict):     {ap_node: bool} — optional.
        output_path (str):      File path to save the image.
    """
    fig, ax = plt.subplots(figsize=FIGURE_SIZE)
    ax.set_xlim(-1, GRID_WIDTH)
    ax.set_ylim(-1, GRID_HEIGHT)
    ax.set_aspect('equal')
    ax.set_facecolor('#f0f4f8')
    fig.patch.set_facecolor('#e8edf2')

    # ── Heatmap overlay ────────────────────────────────────────────────────────
    density_grid = build_density_grid(user_counts, ap_nodes)
    extent = [-0.5, GRID_WIDTH - 0.5, -0.5, GRID_HEIGHT - 0.5]
    im = ax.imshow(
        density_grid,
        origin='lower',
        extent=extent,
        cmap='YlOrRd',
        alpha=HEATMAP_ALPHA,
        interpolation='bilinear',
        aspect='auto'
    )
    cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label('Crowd Density Score', fontsize=10)

    # ── Graph edges ────────────────────────────────────────────────────────────
    for u, v in G.edges():
        x1, y1 = pos[u]
        x2, y2 = pos[v]
        ax.plot([x1, x2], [y1, y2], color='#c0c8d0', linewidth=0.4, zorder=1)

    # ── Graph nodes ────────────────────────────────────────────────────────────
    for node in G.nodes():
        if node not in ap_nodes:
            x, y = pos[node]
            ax.plot(x, y, 'o', color='#aab4be', markersize=3, zorder=2)

    # ── Coverage circles ───────────────────────────────────────────────────────
    for ap in ap_nodes:
        ax_pos, ay_pos = pos[ap]
        circle = plt.Circle(
            (ax_pos, ay_pos),
            SIGNAL_RADIUS,
            color='royalblue',
            fill=True,
            alpha=COVERAGE_ALPHA,
            linewidth=1.5,
            linestyle='--',
            zorder=3
        )
        circle_border = plt.Circle(
            (ax_pos, ay_pos),
            SIGNAL_RADIUS,
            color='royalblue',
            fill=False,
            linewidth=1.2,
            linestyle='--',
            alpha=0.5,
            zorder=3
        )
        ax.add_patch(circle)
        ax.add_patch(circle_border)

    # ── User positions ─────────────────────────────────────────────────────────
    user_xs = [u[0] for u in users]
    user_ys = [u[1] for u in users]
    ax.scatter(user_xs, user_ys, c='steelblue', s=18, zorder=5,
               alpha=0.75, label=f'Users ({len(users)})', edgecolors='white',
               linewidths=0.5)

    # ── Access Point markers ───────────────────────────────────────────────────
    for ap in ap_nodes:
        ax_pos, ay_pos = pos[ap]
        is_congested = congestion.get(ap, False) if congestion else False
        edge_color = 'gold' if is_congested else 'white'
        edge_width = 2.5 if is_congested else 1.5
        ax.plot(ax_pos, ay_pos, '*', color='crimson', markersize=18,
                markeredgecolor=edge_color, markeredgewidth=edge_width,
                zorder=6)
        # Label AP with its user count
        count = user_counts.get(ap, 0)
        ax.annotate(f'{count}', (ax_pos, ay_pos),
                    textcoords='offset points', xytext=(6, 6),
                    fontsize=7.5, color='darkred', fontweight='bold', zorder=7)

    # ── Legend & labels ────────────────────────────────────────────────────────
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker='*', color='w', markerfacecolor='crimson',
               markersize=14, label=f'Access Points ({len(ap_nodes)})'),
        Line2D([0], [0], marker='o', color='w', markerfacecolor='steelblue',
               markersize=8, label=f'Users ({len(users)})'),
        Line2D([0], [0], marker='o', color='w', markerfacecolor='#aab4be',
               markersize=6, label='Grid Nodes'),
        Line2D([0], [0], color='royalblue', linestyle='--',
               linewidth=1.5, label=f'Coverage Radius (r={SIGNAL_RADIUS})'),
    ]
    if congestion and any(congestion.values()):
        legend_elements.append(
            Line2D([0], [0], marker='*', color='w', markerfacecolor='crimson',
                   markeredgecolor='gold', markeredgewidth=2.5,
                   markersize=14, label='Congested AP')
        )

    ax.legend(handles=legend_elements, loc='upper right',
              framealpha=0.9, fontsize=9)

    ax.set_title(
        f'Graph-Based WLAN Planning & Crowd Density Estimation\n'
        f'Grid: {GRID_WIDTH}×{GRID_HEIGHT}  |  '
        f'APs: {len(ap_nodes)}  |  '
        f'Users: {len(users)}  |  '
        f'Signal Radius: {SIGNAL_RADIUS}',
        fontsize=13, fontweight='bold', pad=12
    )
    ax.set_xlabel('X (Grid Columns)', fontsize=10)
    ax.set_ylabel('Y (Grid Rows)', fontsize=10)
    ax.grid(True, color='white', linewidth=0.6, alpha=0.6, zorder=0)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[Visualization] Saved to: {output_path}")


def plot_density_bar(user_counts, density_class, output_path="density_bar_output.png"):
    """
    Plot a bar chart showing per-AP user counts, color-coded by density class.

    Parameters:
        user_counts   (dict): {ap_node: int}
        density_class (dict): {ap_node: "LOW"|"MEDIUM"|"HIGH"}
        output_path   (str):  File path to save the image.
    """
    color_map = {"LOW": "#4caf50", "MEDIUM": "#ff9800", "HIGH": "#f44336"}

    sorted_aps = sorted(user_counts.keys())
    labels = [str(ap) for ap in sorted_aps]
    counts = [user_counts[ap] for ap in sorted_aps]
    colors = [color_map.get(density_class.get(ap, "LOW"), "#4caf50") for ap in sorted_aps]

    fig, ax = plt.subplots(figsize=(max(10, len(sorted_aps) * 0.6), 5))
    bars = ax.bar(range(len(sorted_aps)), counts, color=colors, edgecolor='white',
                  linewidth=0.8)
    ax.set_xticks(range(len(sorted_aps)))
    ax.set_xticklabels(labels, rotation=45, ha='right', fontsize=7)
    ax.set_ylabel('Number of Users', fontsize=11)
    ax.set_title('Users per Access Point (color = density class)', fontsize=13,
                 fontweight='bold')
    ax.set_facecolor('#f8f9fa')

    # Add count labels above bars
    for bar, count in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                str(count), ha='center', va='bottom', fontsize=7.5)

    # Custom legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#4caf50', label='LOW density'),
        Patch(facecolor='#ff9800', label='MEDIUM density'),
        Patch(facecolor='#f44336', label='HIGH density'),
    ]
    ax.legend(handles=legend_elements, fontsize=9)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[Visualization] Density bar chart saved to: {output_path}")
