
# user_simulation.py
# Randomly distributes users across the grid and assigns each user
# to the nearest Access Point based on Euclidean distance.

import random
from graph_model import euclidean_distance
from config import GRID_WIDTH, GRID_HEIGHT, NUM_USERS, RANDOM_SEED


def generate_users(num_users=NUM_USERS, width=GRID_WIDTH, height=GRID_HEIGHT, seed=RANDOM_SEED):
    """
    Randomly place users on the grid.  Users are placed at integer
    grid coordinates (same coordinate system as graph nodes).

    Parameters:
        num_users (int): Total number of users to generate.
        width     (int): Grid width (x range: 0 to width-1).
        height    (int): Grid height (y range: 0 to height-1).
        seed      (int): Random seed for reproducibility.

    Returns:
        list: List of (x, y) tuples representing user positions.
              Multiple users may share the same location.
    """
    if seed is not None:
        random.seed(seed)

    users = [(random.randint(0, width - 1), random.randint(0, height - 1))
             for _ in range(num_users)]
    return users


def assign_users_to_aps(users, ap_nodes):
    """
    Assign each user to the nearest Access Point (Euclidean distance).

    Parameters:
        users    (list): List of user (x, y) positions.
        ap_nodes (list): List of AP node (x, y) positions.

    Returns:
        dict: Mapping {ap_node: [list_of_user_positions]}
              Each key is an AP and the value is all users assigned to it.
    """
    assignment = {ap: [] for ap in ap_nodes}

    for user in users:
        nearest_ap = min(ap_nodes, key=lambda ap: euclidean_distance(user, ap))
        assignment[nearest_ap].append(user)

    return assignment


def count_users_per_ap(assignment):
    """
    Count how many users are connected to each AP.

    Parameters:
        assignment (dict): Output of assign_users_to_aps().

    Returns:
        dict: {ap_node: user_count}
    """
    return {ap: len(users) for ap, users in assignment.items()}
