import { Router, type IRouter } from "express";
import { db, submissionsTable, campaignsTable, creatorsTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendApprovalEmail, sendRevisionRequestEmail } from "../lib/email";
import {
  CreateSubmissionBody,
  UpdateSubmissionBody,
  GetSubmissionParams,
  UpdateSubmissionParams,
  ListSubmissionsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichSubmission(submission: typeof submissionsTable.$inferSelect) {
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, submission.campaignId));
  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, submission.creatorId));
  return {
    ...submission,
    payoutAmount: submission.payoutAmount ? parseFloat(submission.payoutAmount) : null,
    campaign: campaign ? { ...campaign, totalBudget: parseFloat(campaign.totalBudget), payoutPerVideo: parseFloat(campaign.payoutPerVideo) } : null,
    creator: creator ? { ...creator, engagementRate: parseFloat(creator.engagementRate) } : null,
  };
}

router.get("/submissions", async (req, res): Promise<void> => {
  const parsed = ListSubmissionsQueryParams.safeParse(req.query);
  const allSubs = await db.select().from(submissionsTable).orderBy(sql`${submissionsTable.createdAt} desc`);

  const filtered = parsed.success
    ? allSubs.filter(s => {
        if (parsed.data.campaignId && s.campaignId !== parsed.data.campaignId) return false;
        if (parsed.data.creatorId && s.creatorId !== parsed.data.creatorId) return false;
        if (parsed.data.status && s.status !== parsed.data.status) return false;
        return true;
      })
    : allSubs;

  const enriched = await Promise.all(filtered.map(enrichSubmission));
  res.json(enriched);
});

router.post("/submissions", async (req, res): Promise<void> => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [submission] = await db.insert(submissionsTable).values({
    campaignId: data.campaignId,
    creatorId: data.creatorId,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "submission",
    message: `New video submitted for campaign #${data.campaignId}`,
    entityId: submission.id,
    entityType: "submission",
  });

  const enriched = await enrichSubmission(submission);
  res.status(201).json(enriched);
});

router.get("/submissions/:id", async (req, res): Promise<void> => {
  const params = GetSubmissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, params.data.id));
  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const enriched = await enrichSubmission(submission);
  res.json(enriched);
});

router.patch("/submissions/:id", async (req, res): Promise<void> => {
  const params = UpdateSubmissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.payoutAmount !== undefined) updateData.payoutAmount = String(data.payoutAmount);

  const [submission] = await db.update(submissionsTable).set(updateData).where(eq(submissionsTable.id, params.data.id)).returning();
  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (data.status === "approved") {
    await db.insert(activityTable).values({
      type: "approval",
      message: `Submission #${submission.id} was approved`,
      entityId: submission.id,
      entityType: "submission",
    });
    const enriched2 = await enrichSubmission(submission);
    if (enriched2.creator?.email) {
      void sendApprovalEmail(
        enriched2.creator.email,
        enriched2.creator.name,
        enriched2.campaign?.title ?? "your campaign",
        enriched2.payoutAmount ? `$${enriched2.payoutAmount}` : "TBD",
      );
    }
  } else if (data.status === "rejected") {
    await db.insert(activityTable).values({
      type: "rejection",
      message: `Submission #${submission.id} was rejected`,
      entityId: submission.id,
      entityType: "submission",
    });
    const enriched2 = await enrichSubmission(submission);
    if (enriched2.creator?.email && data.notes) {
      void sendRevisionRequestEmail(
        enriched2.creator.email,
        enriched2.creator.name,
        enriched2.campaign?.title ?? "your campaign",
        data.notes,
      );
    }
  }

  const enriched = await enrichSubmission(submission);
  res.json(enriched);
});

export default router;
