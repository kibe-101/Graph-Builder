
# graph_model.py
# Builds the 2D grid graph that models the environment.
# Each node represents a grid cell (location), and edges represent
# possible Wi-Fi connectivity within the signal radius.

import networkx as nx
import math
from config import GRID_WIDTH, GRID_HEIGHT, SIGNAL_RADIUS


def create_grid_graph(width=GRID_WIDTH, height=GRID_HEIGHT, radius=SIGNAL_RADIUS):
    """
    Create a 2D grid graph where:
      - Each node is identified by its (x, y) coordinate tuple.
      - Nodes store their coordinates as attributes.
      - Two nodes are connected by an edge if their Euclidean distance
        is within the given signal radius.

    Parameters:
        width  (int):   Number of columns in the grid.
        height (int):   Number of rows in the grid.
        radius (float): Maximum distance for connectivity.

    Returns:
        G (nx.Graph): The constructed grid graph.
    """
    G = nx.Graph()

    # Add all nodes with coordinate attributes
    for x in range(width):
        for y in range(height):
            G.add_node((x, y), x=x, y=y)

    # Add edges between nodes within the signal radius
    nodes = list(G.nodes())
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            n1, n2 = nodes[i], nodes[j]
            dist = euclidean_distance(n1, n2)
            if dist <= radius:
                G.add_edge(n1, n2, weight=dist)

    return G


def euclidean_distance(node1, node2):
    """
    Compute the Euclidean distance between two grid nodes.

    Parameters:
        node1 (tuple): (x, y) of first node.
        node2 (tuple): (x, y) of second node.

    Returns:
        float: The straight-line distance.
    """
    return math.sqrt((node1[0] - node2[0]) ** 2 + (node1[1] - node2[1]) ** 2)


def get_node_positions(G):
    """
    Extract the (x, y) position of every node for use in plotting.

    Parameters:
        G (nx.Graph): The grid graph.

    Returns:
        dict: Mapping {node: (x, y)} for each node.
    """
    return {node: (G.nodes[node]['x'], G.nodes[node]['y']) for node in G.nodes()}
