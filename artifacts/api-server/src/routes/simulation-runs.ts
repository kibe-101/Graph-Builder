import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateSimulationRunBody,
  ListSimulationRunsResponse,
  type SimulationRun,
} from "@workspace/api-zod";
import {
  db,
  simulationRunsTable,
} from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();
const MAX_PYTHON_OUTPUT_BYTES = 8 * 1024 * 1024;

const runResultSchema = z.object({
  apNodes: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      floor: z.number().int(),
      userCount: z.number().int(),
      avgRssiDbm: z.number().nullable(),
      densityClass: z.enum(["LOW", "MEDIUM", "HIGH"]),
      bandwidthPerUserMbps: z.number().nullable(),
      congested: z.boolean(),
    }),
  ),
  users: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      floor: z.number().int(),
      apId: z.string(),
      rssiDbm: z.number(),
      clusterId: z.number().int(),
    }),
  ),
  clusters: z.array(
    z.object({
      id: z.number().int(),
      centerX: z.number(),
      centerY: z.number(),
      floor: z.number().int(),
      userCount: z.number().int(),
      densityClass: z.enum(["LOW", "MEDIUM", "HIGH"]),
    }),
  ),
  metrics: z.object({
    apCount: z.number().int(),
    userCount: z.number().int(),
    coveragePercent: z.number().min(0).max(100),
    avgRssiDbm: z.number().nullable(),
    minRssiDbm: z.number().nullable(),
    avgBandwidthPerUserMbps: z.number().nullable(),
    congestedApCount: z.number().int(),
    loadCoefficientOfVariation: z.number().min(0),
    clusterCount: z.number().int(),
  }),
  loadSuggestions: z.array(z.string()),
  edgeCount: z.number().int(),
  numFloors: z.number().int(),
});

const simulationRunSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.coerce.date(),
  sourceMode: z.enum(["simulation", "telemetry"]),
  config: CreateSimulationRunBody.shape.config,
  result: runResultSchema,
});

function findWorkspaceRoot(): string {
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(bundleDir, "../../../"),
    path.resolve(process.cwd(), "../.."),
    process.cwd(),
  ];
  const root = candidates.find(candidate =>
    existsSync(path.join(candidate, "wlan_simulation", "engine.py")),
  );
  if (!root) {
    throw new Error("Could not locate the WLAN Python simulation engine.");
  }
  return root;
}

function runPythonEngine(
  payload: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const root = findWorkspaceRoot();
    const enginePath = path.join(root, "wlan_simulation", "engine.py");
    const child = spawn(
      process.env.PYTHON ?? "python3",
      [enginePath],
      { cwd: path.join(root, "wlan_simulation"), stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > MAX_PYTHON_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        reject(new Error("Simulation output exceeded the allowed size."));
        return;
      }
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || "Python simulation failed."));
        return;
      }
      try {
        const parsed: unknown = JSON.parse(stdout);
        if (
          typeof parsed === "object"
          && parsed !== null
          && "error" in parsed
          && typeof parsed.error === "string"
        ) {
          reject(Object.assign(new Error(parsed.error), { inputError: true }));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("The Python simulation returned invalid JSON."));
      }
    });
    child.stdin.on("error", reject);
    child.stdin.end(JSON.stringify(payload));
  });
}

router.get("/simulation-runs", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(simulationRunsTable)
    .orderBy(desc(simulationRunsTable.createdAt))
    .limit(20);

  const summaries = rows.map(row => {
    const summary = row.summary;
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      sourceMode: row.sourceMode,
      apCount: summary.apCount,
      userCount: summary.userCount,
      coveragePercent: summary.coveragePercent,
      avgRssiDbm: summary.avgRssiDbm,
      congestedApCount: summary.congestedApCount,
    };
  });

  const parsed = ListSimulationRunsResponse.safeParse(summaries);
  if (!parsed.success) {
    req.log.error({ errors: parsed.error.message }, "Stored simulation summaries are invalid");
    res.status(500).json({ error: "Stored simulation history is invalid." });
    return;
  }
  res.json(parsed.data);
});

router.post("/simulation-runs", async (req, res): Promise<void> => {
  const parsedInput = CreateSimulationRunBody.safeParse(req.body);
  if (!parsedInput.success) {
    res.status(400).json({ error: parsedInput.error.message });
    return;
  }

  const input = parsedInput.data;
  const measurements = input.measurements ?? [];
  if (input.sourceMode === "telemetry" && measurements.length === 0) {
    res.status(400).json({ error: "Telemetry mode requires measurement rows." });
    return;
  }

  try {
    const rawResult = await runPythonEngine(input);
    const parsedResult = runResultSchema.safeParse(rawResult);
    if (!parsedResult.success) {
      req.log.error(
        { errors: parsedResult.error.message },
        "Python engine returned an invalid result",
      );
      res.status(500).json({ error: "Simulation engine returned an invalid result." });
      return;
    }

    const result = parsedResult.data;
    const summary = {
      apCount: result.metrics.apCount,
      userCount: result.metrics.userCount,
      coveragePercent: result.metrics.coveragePercent,
      avgRssiDbm: result.metrics.avgRssiDbm,
      congestedApCount: result.metrics.congestedApCount,
    };
    const [savedRun] = await db
      .insert(simulationRunsTable)
      .values({
        sourceMode: input.sourceMode,
        config: input.config,
        summary,
      })
      .returning({
        id: simulationRunsTable.id,
        createdAt: simulationRunsTable.createdAt,
      });

    const response: SimulationRun = {
      id: savedRun.id,
      createdAt: savedRun.createdAt,
      sourceMode: input.sourceMode,
      config: input.config,
      result,
    };
    const parsedResponse = simulationRunSchema.safeParse(response);
    if (!parsedResponse.success) {
      req.log.error(
        { errors: parsedResponse.error.message },
        "Simulation response failed contract validation",
      );
      res.status(500).json({ error: "Simulation result failed response validation." });
      return;
    }

    res.status(201).json(parsedResponse.data);
  } catch (error) {
    if (error instanceof Error && "inputError" in error) {
      res.status(400).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "WLAN simulation run failed");
    res.status(500).json({ error: "Unable to complete the WLAN simulation." });
  }
});

export default router;
