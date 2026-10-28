import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const simulationRunsTable = pgTable("simulation_runs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sourceMode: text("source_mode").notNull(),
  config: jsonb("config").notNull().$type<Record<string, unknown>>(),
  summary: jsonb("summary").notNull().$type<Record<string, unknown>>(),
});

export const insertSimulationRunSchema = createInsertSchema(simulationRunsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSimulationRun = z.infer<typeof insertSimulationRunSchema>;
export type SimulationRunRow = typeof simulationRunsTable.$inferSelect;
