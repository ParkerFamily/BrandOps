import { Router, type IRouter } from "express";
import { db, campaignsTable, submissionsTable, paymentsTable, creatorsTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  GetCampaignParams,
  UpdateCampaignParams,
  DeleteCampaignParams,
  PublishCampaignParams,
  GetCampaignStatsParams,
  ListCampaignsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/campaigns", async (req, res): Promise<void> => {
  const parsed = ListCampaignsQueryParams.safeParse(req.query);
  let query = db.select().from(campaignsTable);
  const campaigns = await query.orderBy(sql`${campaignsTable.createdAt} desc`);

  const filtered = parsed.success && parsed.data.status
    ? campaigns.filter(c => c.status === parsed.data.status)
    : campaigns;

  // Enrich with counts
  const allSubmissions = await db.select().from(submissionsTable);
  const allPayments = await db.select().from(paymentsTable);

  const enriched = filtered.map(campaign => {
    const subs = allSubmissions.filter(s => s.campaignId === campaign.id);
    const pays = allPayments.filter(p => p.campaignId === campaign.id && p.status === "paid");
    return {
      ...campaign,
      totalBudget: parseFloat(campaign.totalBudget),
      payoutPerVideo: parseFloat(campaign.payoutPerVideo),
      creatorCount: [...new Set(subs.map(s => s.creatorId))].length,
      approvedCount: subs.filter(s => s.status === "approved" || s.status === "paid").length,
      pendingCount: subs.filter(s => s.status === "pending" || s.status === "reviewing").length,
      totalSpent: pays.reduce((sum, p) => sum + parseFloat(p.amount), 0),
    };
  });

  res.json(enriched);
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [campaign] = await db.insert(campaignsTable).values({
    title: data.title,
    description: data.description,
    totalBudget: String(data.totalBudget),
    payoutPerVideo: String(data.payoutPerVideo),
    platform: data.platform,
    niche: data.niche ?? "",
    deadline: new Date(data.deadline),
    inspirationUrls: data.inspirationUrls ?? null,
    videoStyle: data.videoStyle ?? "",
    tone: data.tone ?? "",
    videosNeeded: data.videosNeeded ?? 1,
    creatorType: data.creatorType ?? "",
  }).returning();

  await db.insert(activityTable).values({
    type: "campaign_created",
    message: `Campaign "${campaign.title}" was created`,
    entityId: campaign.id,
    entityType: "campaign",
  });

  res.status(201).json({ ...campaign, totalBudget: parseFloat(campaign.totalBudget), payoutPerVideo: parseFloat(campaign.payoutPerVideo), creatorCount: 0, approvedCount: 0, pendingCount: 0, totalSpent: 0 });
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const subs = await db.select().from(submissionsTable).where(eq(submissionsTable.campaignId, campaign.id));
  const pays = await db.select().from(paymentsTable).where(eq(paymentsTable.campaignId, campaign.id));

  res.json({
    ...campaign,
    totalBudget: parseFloat(campaign.totalBudget),
    payoutPerVideo: parseFloat(campaign.payoutPerVideo),
    creatorCount: [...new Set(subs.map(s => s.creatorId))].length,
    approvedCount: subs.filter(s => s.status === "approved" || s.status === "paid").length,
    pendingCount: subs.filter(s => s.status === "pending" || s.status === "reviewing").length,
    totalSpent: pays.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0),
  });
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.totalBudget !== undefined) updateData.totalBudget = String(data.totalBudget);
  if (data.payoutPerVideo !== undefined) updateData.payoutPerVideo = String(data.payoutPerVideo);
  if (data.platform !== undefined) updateData.platform = data.platform;
  if (data.niche !== undefined) updateData.niche = data.niche;
  if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.inspirationUrls !== undefined) updateData.inspirationUrls = data.inspirationUrls;
  if (data.videoStyle !== undefined) updateData.videoStyle = data.videoStyle;
  if (data.tone !== undefined) updateData.tone = data.tone;
  if (data.videosNeeded !== undefined) updateData.videosNeeded = data.videosNeeded;
  if (data.creatorType !== undefined) updateData.creatorType = data.creatorType;

  const [campaign] = await db.update(campaignsTable).set(updateData).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json({ ...campaign, totalBudget: parseFloat(campaign.totalBudget), payoutPerVideo: parseFloat(campaign.payoutPerVideo) });
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.delete(campaignsTable).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/campaigns/:id/publish", async (req, res): Promise<void> => {
  const params = PublishCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.update(campaignsTable).set({ status: "active" }).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "campaign_created",
    message: `Campaign "${campaign.title}" was published`,
    entityId: campaign.id,
    entityType: "campaign",
  });

  res.json({ ...campaign, totalBudget: parseFloat(campaign.totalBudget), payoutPerVideo: parseFloat(campaign.payoutPerVideo) });
});

router.get("/campaigns/:id/stats", async (req, res): Promise<void> => {
  const params = GetCampaignStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const subs = await db.select().from(submissionsTable).where(eq(submissionsTable.campaignId, params.data.id));
  const pays = await db.select().from(paymentsTable).where(eq(paymentsTable.campaignId, params.data.id));

  const totalSpent = pays.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0);

  res.json({
    campaignId: params.data.id,
    totalSubmissions: subs.length,
    approvedSubmissions: subs.filter(s => s.status === "approved" || s.status === "paid").length,
    pendingSubmissions: subs.filter(s => s.status === "pending" || s.status === "reviewing").length,
    rejectedSubmissions: subs.filter(s => s.status === "rejected").length,
    totalSpent,
    budgetRemaining: parseFloat(campaign.totalBudget) - totalSpent,
    creatorCount: [...new Set(subs.map(s => s.creatorId))].length,
  });
});

export default router;
