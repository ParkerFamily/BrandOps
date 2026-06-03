import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";
import creatorsRouter from "./creators";
import submissionsRouter from "./submissions";
import paymentsRouter from "./payments";
import analyticsRouter from "./analytics";
import stripeRouter from "./stripe";
import openaiRouter from "./openai";
import emailRouter from "./email";
import usersRouter from "./users";
import authRouter from "./auth";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(campaignsRouter);
router.use(creatorsRouter);
router.use(submissionsRouter);
router.use(paymentsRouter);
router.use(analyticsRouter);
router.use(stripeRouter);
router.use(openaiRouter);
router.use(emailRouter);
router.use(usersRouter);
router.use(videoRouter);

export default router;
