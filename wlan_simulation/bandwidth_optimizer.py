
# bandwidth_optimizer.py
# Simulates bandwidth allocation and detects congestion.
# Each AP has a fixed total bandwidth; when user load is high,
# per-user bandwidth is reduced proportionally.  Congested APs
# are flagged and a load-balancing suggestion is generated.

from config import AP_BANDWIDTH_MBPS, CONGESTION_THRESHOLD, MIN_BANDWIDTH_PER_USER


def allocate_bandwidth(user_counts, total_bw=AP_BANDWIDTH_MBPS):
    """
    Calculate the bandwidth allocated to each user on each AP.

    If an AP serves N users, each user receives (total_bw / N) Mbps.
    If the AP has no connected users, it is idle.

    Parameters:
        user_counts (dict): {ap_node: int}
        total_bw    (float): Total bandwidth per AP in Mbps.

    Returns:
        dict: {ap_node: bw_per_user_mbps}  (float, or None if idle)
    """
    allocation = {}
    for ap, count in user_counts.items():
        if count > 0:
            allocation[ap] = total_bw / count
        else:
            allocation[ap] = None  # Idle AP
    return allocation


def detect_congestion(user_counts, total_bw=AP_BANDWIDTH_MBPS,
                      threshold=CONGESTION_THRESHOLD,
                      min_bw=MIN_BANDWIDTH_PER_USER):
    """
    Detect which APs are congested.

    An AP is considered congested if:
      - The per-user bandwidth drops below min_bw (Mbps), OR
      - The AP is serving more users than (total_bw * threshold) would support
        at 1 Mbps each (i.e., threshold fraction of bandwidth is exhausted).

    Parameters:
        user_counts (dict):  {ap_node: int}
        total_bw    (float): Bandwidth per AP in Mbps.
        threshold   (float): Fraction of capacity that triggers congestion flag.
        min_bw      (float): Minimum acceptable bandwidth per user in Mbps.

    Returns:
        dict: {ap_node: bool}  True if congested, False otherwise.
    """
    congestion = {}
    capacity_users = (total_bw * threshold) / min_bw  # Max users before congestion

    for ap, count in user_counts.items():
        if count == 0:
            congestion[ap] = False
        else:
            per_user_bw = total_bw / count
            congestion[ap] = (per_user_bw < min_bw) or (count > capacity_users)

    return congestion


def suggest_load_balancing(user_counts, assignment, ap_nodes):
    """
    Suggest which users could be moved from overloaded APs to underloaded APs.

    Strategy:
      1. Compute average load across all APs.
      2. Identify overloaded APs (above average) and underloaded APs (below average).
      3. For each overloaded AP, recommend migrating some users to the nearest
         underloaded AP.

    Parameters:
        user_counts (dict): {ap_node: int}
        assignment  (dict): {ap_node: [list_of_user_positions]}
        ap_nodes    (list): All AP node positions.

    Returns:
        list: Human-readable suggestion strings describing recommended migrations.
    """
    from graph_model import euclidean_distance

    if not user_counts:
        return ["No APs available."]

    counts = list(user_counts.values())
    avg_load = sum(counts) / len(counts)

    overloaded = [ap for ap, c in user_counts.items() if c > avg_load * 1.2]
    underloaded = [ap for ap, c in user_counts.items() if c < avg_load * 0.8]

    if not overloaded:
        return ["Load is well balanced — no migration needed."]

    if not underloaded:
        return ["All APs are heavily loaded — consider adding more APs."]

    suggestions = []
    for over_ap in overloaded:
        # Find the nearest underloaded AP
        nearest_under = min(underloaded, key=lambda u: euclidean_distance(over_ap, u))
        excess = int(user_counts[over_ap] - avg_load)
        suggestions.append(
            f"AP {over_ap}: {user_counts[over_ap]} users (avg={avg_load:.1f}) — "
            f"consider moving ~{excess} user(s) to underloaded AP {nearest_under} "
            f"({user_counts[nearest_under]} users, "
            f"distance={euclidean_distance(over_ap, nearest_under):.2f})"
        )

    return suggestions


def bandwidth_report(user_counts, total_bw=AP_BANDWIDTH_MBPS):
    """
    Generate a full bandwidth summary for all APs.

    Parameters:
        user_counts (dict): {ap_node: int}
        total_bw    (float): Bandwidth per AP in Mbps.

    Returns:
        list: List of formatted report strings.
    """
    allocation = allocate_bandwidth(user_counts, total_bw)
    congestion = detect_congestion(user_counts, total_bw)

    lines = []
    lines.append(f"\n{'='*60}")
    lines.append(f"{'BANDWIDTH ALLOCATION REPORT':^60}")
    lines.append(f"{'='*60}")
    lines.append(f"{'AP Location':<18} {'Users':>6} {'BW/User (Mbps)':>16} {'Status':>12}")
    lines.append(f"{'-'*60}")

    for ap in sorted(user_counts.keys()):
        count = user_counts[ap]
        bw = allocation[ap]
        bw_str = f"{bw:.2f}" if bw is not None else "IDLE"
        status = "CONGESTED" if congestion[ap] else ("IDLE" if bw is None else "OK")
        lines.append(f"{str(ap):<18} {count:>6} {bw_str:>16} {status:>12}")

    lines.append(f"{'='*60}\n")
    return lines
