import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Stripe integration.");
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" } as any);
    logger.info("Stripe schema ready");

    // Small pause to ensure schema DDL is fully committed before queries run
    await new Promise(resolve => setTimeout(resolve, 500));

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    logger.info({ webhookBaseUrl }, "Setting up managed Stripe webhook...");
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    // Sync backfill in background — don't block server startup
    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data backfill complete"))
      .catch((err: Error) => logger.error({ err: err.message }, "Stripe backfill error"));
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to initialize Stripe — continuing without it");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
