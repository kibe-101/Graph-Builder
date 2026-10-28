import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  let database: "connected" | "unavailable" = "connected";
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    req.log.warn({ err: error }, "Database health check failed");
    database = "unavailable";
  }
  const data = HealthCheckResponse.parse({ status: "ok", database });
  res.json(data);
});

export default router;
