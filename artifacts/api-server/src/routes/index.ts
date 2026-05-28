import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";
import creatorsRouter from "./creators";
import submissionsRouter from "./submissions";
import paymentsRouter from "./payments";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(campaignsRouter);
router.use(creatorsRouter);
router.use(submissionsRouter);
router.use(paymentsRouter);
router.use(analyticsRouter);

export default router;
