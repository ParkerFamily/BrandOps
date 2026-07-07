import { Router, type IRouter } from "express";
import { db, paymentsTable, creatorsTable, campaignsTable, submissionsTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendPayoutEmail } from "../lib/email";
import { notifyApiPayoutPaid } from "../lib/notificationTriggers";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  ListPaymentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(payment: typeof paymentsTable.$inferSelect) {
  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, payment.creatorId));
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, payment.campaignId));
  return {
    ...payment,
    amount: parseFloat(payment.amount),
    creator: creator ? { ...creator, engagementRate: parseFloat(creator.engagementRate) } : null,
    campaign: campaign ? { ...campaign, totalBudget: parseFloat(campaign.totalBudget), payoutPerVideo: parseFloat(campaign.payoutPerVideo) } : null,
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const parsed = ListPaymentsQueryParams.safeParse(req.query);
  const allPayments = await db.select().from(paymentsTable).orderBy(sql`${paymentsTable.createdAt} desc`);

  const filtered = parsed.success
    ? allPayments.filter(p => {
        if (parsed.data.status && p.status !== parsed.data.status) return false;
        if (parsed.data.creatorId && p.creatorId !== parsed.data.creatorId) return false;
        if (parsed.data.campaignId && p.campaignId !== parsed.data.campaignId) return false;
        return true;
      })
    : allPayments;

  const enriched = await Promise.all(filtered.map(enrichPayment));
  res.json(enriched);
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [payment] = await db.insert(paymentsTable).values({
    submissionId: data.submissionId,
    creatorId: data.creatorId,
    campaignId: data.campaignId,
    amount: String(data.amount),
  }).returning();

  await db.insert(activityTable).values({
    type: "payment",
    message: `Payment of $${data.amount} initiated for creator #${data.creatorId}`,
    entityId: payment.id,
    entityType: "payment",
  });

  const enriched = await enrichPayment(payment);
  res.status(201).json(enriched);
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const enriched = await enrichPayment(payment);
  res.json(enriched);
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "paid") {
      updateData.paidAt = new Date();
    }
  }

  const [payment] = await db.update(paymentsTable).set(updateData).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (data.status === "paid") {
    await db.insert(activityTable).values({
      type: "payment",
      message: `Payment #${payment.id} of $${payment.amount} was completed`,
      entityId: payment.id,
      entityType: "payment",
    });

    // Mark related submission as paid
    await db.update(submissionsTable).set({ status: "paid" }).where(eq(submissionsTable.id, payment.submissionId));

    const enriched2 = await enrichPayment(payment);
    if (enriched2.creator?.email) {
      void sendPayoutEmail(
        enriched2.creator.email,
        enriched2.creator.name,
        `$${parseFloat(payment.amount).toFixed(2)}`,
        enriched2.campaign?.title ?? "your campaign",
      );
      void notifyApiPayoutPaid({
        creatorEmail: enriched2.creator.email,
        amount: parseFloat(payment.amount),
        campaignTitle: enriched2.campaign?.title ?? null,
        paymentId: payment.id,
      });
    }
  }

  const enriched = await enrichPayment(payment);
  res.json(enriched);
});

export default router;
