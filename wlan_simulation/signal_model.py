
# signal_model.py
# Simulates Wi-Fi signal strength (RSSI) based on distance.
# Uses a logarithmic path-loss model that approximates real-world
# signal degradation in indoor environments.

import math
from graph_model import euclidean_distance


def calculate_rssi(distance):
    """
    Estimate the Received Signal Strength Indicator (RSSI) in dBm
    for a given distance from an Access Point.

    Formula:
        RSSI = -10 * log10(distance + 1)

    The "+1" offset prevents log(0) at zero distance and ensures
    RSSI = 0 dBm when the user is co-located with the AP.

    Parameters:
        distance (float): Distance from the AP in grid units.

    Returns:
        float: RSSI value (will be 0 or negative; closer = higher/less negative).
    """
    if distance < 0:
        raise ValueError("Distance cannot be negative.")
    return -10 * math.log10(distance + 1)


def compute_user_rssi(user_pos, ap_pos):
    """
    Compute the RSSI for a single user given their AP.

    Parameters:
        user_pos (tuple): (x, y) of the user.
        ap_pos   (tuple): (x, y) of the assigned AP.

    Returns:
        float: RSSI value in simulated dBm.
    """
    dist = euclidean_distance(user_pos, ap_pos)
    return calculate_rssi(dist)


def compute_all_rssi(assignment):
    """
    Compute RSSI values for every user in the simulation.

    Parameters:
        assignment (dict): {ap_node: [list_of_user_positions]}

    Returns:
        dict: {ap_node: [list_of_rssi_values]} in the same structure.
    """
    rssi_map = {}
    for ap, users in assignment.items():
        rssi_map[ap] = [compute_user_rssi(user, ap) for user in users]
    return rssi_map


def average_rssi_per_ap(rssi_map):
    """
    Calculate the average RSSI for each AP (useful for quality reporting).

    Parameters:
        rssi_map (dict): {ap_node: [list_of_rssi_values]}

    Returns:
        dict: {ap_node: average_rssi}  (None if no users connected)
    """
    avg = {}
    for ap, values in rssi_map.items():
        avg[ap] = sum(values) / len(values) if values else None
    return avg
