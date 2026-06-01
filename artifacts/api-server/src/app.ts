import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, Replit preview)
      if (!origin) return cb(null, true);
      // Always allow the Replit dev domain
      if (origin.includes(".replit.dev") || origin.includes(".replit.app")) return cb(null, true);
      // Allow explicitly listed origins (set via ALLOWED_ORIGINS env var)
      if (ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith(`.${o}`))) return cb(null, true);
      // Default: allow (open API — auth is handled at the route level)
      cb(null, true);
    },
    credentials: true,
  }),
);

// Allow iframe embedding from allowed origins via Content-Security-Policy
app.use((_req: Request, res: Response, next: NextFunction) => {
  const frameAncestors = ALLOWED_ORIGINS.length > 0
    ? `'self' ${ALLOWED_ORIGINS.join(" ")}`
    : `'self'`;
  res.setHeader("Content-Security-Policy", `frame-ancestors ${frameAncestors}`);
  // Remove X-Frame-Options so CSP frame-ancestors takes precedence
  res.removeHeader("X-Frame-Options");
  next();
});

app.use(cookieParser());

// Stripe webhook MUST be registered before express.json() — needs raw Buffer body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err: err.message }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
