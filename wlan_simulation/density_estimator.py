
# density_estimator.py
# Estimates crowd density per Access Point.
# Density is measured as the number of connected users per AP,
# with an optional weighted refinement using RSSI variation.

import statistics


def estimate_density(user_counts):
    """
    Basic density estimation: number of users per AP.

    Parameters:
        user_counts (dict): {ap_node: int}  (from user_simulation.count_users_per_ap)

    Returns:
        dict: {ap_node: density}  where density == user_count (users per AP cell).
    """
    return dict(user_counts)


def estimate_density_with_rssi(user_counts, rssi_map):
    """
    Refined density estimation that factors in RSSI variation.

    Rationale: When many users are connected to an AP with highly
    variable RSSI readings, the area is large and users are spread out
    (lower effective density).  When RSSI variation is small, users
    are clustered near the AP (higher effective density).

    The weighted density = user_count / (1 + rssi_std_dev).

    Parameters:
        user_counts (dict): {ap_node: int}
        rssi_map    (dict): {ap_node: [list_of_rssi_values]}

    Returns:
        dict: {ap_node: weighted_density_score}
    """
    weighted = {}
    for ap, count in user_counts.items():
        rssi_values = rssi_map.get(ap, [])
        if len(rssi_values) > 1:
            std_dev = statistics.stdev(rssi_values)
        else:
            std_dev = 0.0
        # Normalize: more spread → lower density score
        weighted[ap] = count / (1.0 + std_dev)
    return weighted


def classify_density(user_counts):
    """
    Classify each AP as LOW, MEDIUM, or HIGH density based on
    relative user load compared to the average across all APs.

    Thresholds:
      - LOW    : user_count < 0.5 * mean
      - MEDIUM : 0.5 * mean ≤ user_count < 1.5 * mean
      - HIGH   : user_count ≥ 1.5 * mean

    Parameters:
        user_counts (dict): {ap_node: int}

    Returns:
        dict: {ap_node: "LOW" | "MEDIUM" | "HIGH"}
    """
    if not user_counts:
        return {}

    counts = list(user_counts.values())
    mean = sum(counts) / len(counts)

    classification = {}
    for ap, count in user_counts.items():
        if count < 0.5 * mean:
            classification[ap] = "LOW"
        elif count < 1.5 * mean:
            classification[ap] = "MEDIUM"
        else:
            classification[ap] = "HIGH"

    return classification
