export interface SimConfig {
  gridWidth: number;
  gridHeight: number;
  signalRadius: number;
  numUsers: number;
  apBandwidthMbps: number;
  congestionThreshold: number;
  minBandwidthPerUser: number;
  randomSeed: number;
}

export interface SimResults {
  apNodes: [number, number][];
  users: [number, number][];
  assignment: Map<string, [number, number][]>;
  userCounts: Map<string, number>;
  rssiMap: Map<string, number[]>;
  avgRssi: Map<string, number | null>;
  densityClass: Map<string, "LOW" | "MEDIUM" | "HIGH">;
  allocation: Map<string, number | null>;
  congestion: Map<string, boolean>;
  loadSuggestions: string[];
  edgeCount: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  gridWidth: 20,
  gridHeight: 20,
  signalRadius: 3.0,
  numUsers: 100,
  apBandwidthMbps: 100,
  congestionThreshold: 0.80,
  minBandwidthPerUser: 1.0,
  randomSeed: 42,
};

function dist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function nodeKey(n: [number, number]): string {
  return `${n[0]},${n[1]}`;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function greedyMDS(
  width: number,
  height: number,
  radius: number
): [number, number][] {
  const nodes: [number, number][] = [];
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++)
      nodes.push([x, y]);

  const neighbors = new Map<string, Set<string>>();
  for (const n of nodes) {
    const nset = new Set<string>();
    for (const m of nodes) {
      if (dist(n, m) <= radius) nset.add(nodeKey(m));
    }
    neighbors.set(nodeKey(n), nset);
  }

  const uncovered = new Set(nodes.map(nodeKey));
  const domSet: [number, number][] = [];

  while (uncovered.size > 0) {
    let bestNode: string | null = null;
    let bestCount = -1;

    for (const nk of uncovered) {
      const nbrs = neighbors.get(nk)!;
      let count = 0;
      for (const m of nbrs) if (uncovered.has(m)) count++;
      if (count > bestCount) {
        bestCount = count;
        bestNode = nk;
      }
    }

    if (!bestNode) bestNode = uncovered.values().next().value as string;

    const [bx, by] = bestNode.split(",").map(Number) as [number, number];
    domSet.push([bx, by]);

    const cover = neighbors.get(bestNode)!;
    for (const m of cover) uncovered.delete(m);
  }

  return domSet;
}

export function runSimulation(config: SimConfig): SimResults {
  const {
    gridWidth, gridHeight, signalRadius,
    numUsers, apBandwidthMbps, congestionThreshold,
    minBandwidthPerUser, randomSeed,
  } = config;

  // Count edges
  let edgeCount = 0;
  const nodes: [number, number][] = [];
  for (let x = 0; x < gridWidth; x++)
    for (let y = 0; y < gridHeight; y++)
      nodes.push([x, y]);
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (dist(nodes[i], nodes[j]) <= signalRadius) edgeCount++;

  // AP placement
  const apNodes = greedyMDS(gridWidth, gridHeight, signalRadius);

  // Generate users
  const rand = seededRandom(randomSeed);
  const users: [number, number][] = Array.from({ length: numUsers }, () => [
    Math.floor(rand() * gridWidth),
    Math.floor(rand() * gridHeight),
  ]);

  // Assign users to nearest AP
  const assignment = new Map<string, [number, number][]>();
  for (const ap of apNodes) assignment.set(nodeKey(ap), []);
  for (const user of users) {
    let nearestAp = apNodes[0];
    let nearestDist = Infinity;
    for (const ap of apNodes) {
      const d = dist(user, ap);
      if (d < nearestDist) { nearestDist = d; nearestAp = ap; }
    }
    assignment.get(nodeKey(nearestAp))!.push(user);
  }

  // User counts
  const userCounts = new Map<string, number>();
  for (const [k, v] of assignment) userCounts.set(k, v.length);

  // RSSI
  const rssiMap = new Map<string, number[]>();
  for (const [apk, userList] of assignment) {
    const [ax, ay] = apk.split(",").map(Number);
    rssiMap.set(apk, userList.map(u => -10 * Math.log10(dist(u, [ax, ay]) + 1)));
  }

  // Average RSSI
  const avgRssi = new Map<string, number | null>();
  for (const [apk, vals] of rssiMap) {
    avgRssi.set(apk, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }

  // Density classification
  const counts = [...userCounts.values()];
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const densityClass = new Map<string, "LOW" | "MEDIUM" | "HIGH">();
  for (const [apk, count] of userCounts) {
    if (count < 0.5 * mean) densityClass.set(apk, "LOW");
    else if (count < 1.5 * mean) densityClass.set(apk, "MEDIUM");
    else densityClass.set(apk, "HIGH");
  }

  // Bandwidth allocation
  const allocation = new Map<string, number | null>();
  for (const [apk, count] of userCounts) {
    allocation.set(apk, count > 0 ? apBandwidthMbps / count : null);
  }

  // Congestion detection
  const capacityUsers = (apBandwidthMbps * congestionThreshold) / minBandwidthPerUser;
  const congestion = new Map<string, boolean>();
  for (const [apk, count] of userCounts) {
    if (count === 0) { congestion.set(apk, false); continue; }
    const perUser = apBandwidthMbps / count;
    congestion.set(apk, perUser < minBandwidthPerUser || count > capacityUsers);
  }

  // Load balancing suggestions
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const overloaded = apNodes.filter(ap => (userCounts.get(nodeKey(ap)) ?? 0) > avg * 1.2);
  const underloaded = apNodes.filter(ap => (userCounts.get(nodeKey(ap)) ?? 0) < avg * 0.8);

  let loadSuggestions: string[] = [];
  if (overloaded.length === 0) {
    loadSuggestions = ["Load is well balanced — no migration needed."];
  } else if (underloaded.length === 0) {
    loadSuggestions = ["All APs are heavily loaded — consider adding more APs."];
  } else {
    for (const over of overloaded) {
      const nearest = underloaded.reduce((a, b) =>
        dist(over, a) < dist(over, b) ? a : b
      );
      const excess = Math.round((userCounts.get(nodeKey(over)) ?? 0) - avg);
      loadSuggestions.push(
        `AP (${over[0]},${over[1]}): ${userCounts.get(nodeKey(over))} users — ` +
        `move ~${excess} to AP (${nearest[0]},${nearest[1]}) ` +
        `(${userCounts.get(nodeKey(nearest))} users)`
      );
    }
  }

  return {
    apNodes, users, assignment, userCounts,
    rssiMap, avgRssi, densityClass,
    allocation, congestion, loadSuggestions,
    edgeCount,
  };
}
