
# ap_placement.py
# Implements the Greedy Minimum Dominating Set (MDS) algorithm
# to find the minimum set of nodes (Access Points) such that every
# node is either an AP itself or adjacent to at least one AP.

import networkx as nx


def greedy_minimum_dominating_set(G):
    """
    Compute an approximate Minimum Dominating Set of the graph G
    using a greedy strategy.

    Algorithm:
      1. Start with all nodes as "uncovered".
      2. Repeatedly select the node that covers the most uncovered
         neighbors (including itself).
      3. Mark that node as an AP and remove its neighbors + itself
         from the uncovered set.
      4. Repeat until all nodes are covered.

    Parameters:
        G (nx.Graph): The grid graph.

    Returns:
        list: Sorted list of nodes chosen as Access Points.
    """
    uncovered = set(G.nodes())
    dominating_set = []

    while uncovered:
        # Pick the node that covers the maximum number of uncovered nodes
        best_node = None
        best_cover_count = -1

        for node in uncovered:
            # Neighbors + the node itself
            covered_by_node = (set(G.neighbors(node)) | {node}) & uncovered
            if len(covered_by_node) > best_cover_count:
                best_cover_count = len(covered_by_node)
                best_node = node

        if best_node is None:
            # Safety: add any remaining uncovered node
            best_node = next(iter(uncovered))

        dominating_set.append(best_node)

        # Remove the newly covered nodes from the uncovered set
        newly_covered = (set(G.neighbors(best_node)) | {best_node}) & uncovered
        uncovered -= newly_covered

    return sorted(dominating_set)


def get_ap_coverage(G, ap_nodes):
    """
    Build a mapping from each AP to the set of nodes it can cover
    (i.e., the AP itself plus all its direct neighbors in G).

    Parameters:
        G        (nx.Graph): The grid graph.
        ap_nodes (list):     List of AP node identifiers.

    Returns:
        dict: {ap_node: set_of_covered_nodes}
    """
    coverage = {}
    for ap in ap_nodes:
        coverage[ap] = set(G.neighbors(ap)) | {ap}
    return coverage
