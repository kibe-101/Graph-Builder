
# config.py
# Central configuration file for the WLAN simulation.
# Change these parameters to customize the simulation behavior.

# Grid dimensions
GRID_WIDTH = 20
GRID_HEIGHT = 20

# Signal radius: maximum distance (in grid units) between two nodes
# for them to be connected by an edge (potential Wi-Fi coverage link)
SIGNAL_RADIUS = 3.0

# Number of simulated users to distribute across the grid
NUM_USERS = 100

# Bandwidth capacity per Access Point (in Mbps)
AP_BANDWIDTH_MBPS = 100

# Congestion threshold: percentage of bandwidth usage that triggers a flag
CONGESTION_THRESHOLD = 0.80  # 80%

# Minimum bandwidth guaranteed per user (in Mbps)
MIN_BANDWIDTH_PER_USER = 1.0

# Random seed for reproducibility (set to None for truly random results)
RANDOM_SEED = 42

# Visualization settings
FIGURE_SIZE = (14, 10)
COVERAGE_ALPHA = 0.08   # Transparency of coverage circles
HEATMAP_ALPHA = 0.45    # Transparency of density heatmap overlay
