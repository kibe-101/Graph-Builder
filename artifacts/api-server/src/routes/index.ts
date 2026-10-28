import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulationRunsRouter from "./simulation-runs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulationRunsRouter);

export default router;
