import { Router, type IRouter } from "express";
import { db, creatorsTable, submissionsTable, paymentsTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendWelcomeEmail } from "../lib/email";
import {
  CreateCreatorBody,
  UpdateCreatorBody,
  GetCreatorParams,
  UpdateCreatorParams,
  ListCreatorsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseContentStyles(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function enrichCreator(creator: typeof creatorsTable.$inferSelect, pays: { status: string; amount: string }[], subs: { status: string }[]) {
  return {
    ...creator,
    engagementRate: parseFloat(creator.engagementRate),
    approvalRate: parseFloat(creator.approvalRate),
    revisionRate: parseFloat(creator.revisionRate),
    onTimeDeliveryRate: parseFloat(creator.onTimeDeliveryRate),
    avgTurnaroundDays: parseFloat(creator.avgTurnaroundDays),
    brandRating: parseFloat(creator.brandRating),
    suggestedPayout: parseFloat(creator.suggestedPayout),
    contentStyles: parseContentStyles(creator.contentStyles),
    paymentMethod: creator.paymentMethod ?? null,
    paymentDetails: creator.paymentDetails ?? null,
    totalEarnings: pays.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0),
    approvedVideos: subs.filter(s => s.status === "approved" || s.status === "paid").length,
  };
}

router.get("/creators", async (req, res): Promise<void> => {
  const parsed = ListCreatorsQueryParams.safeParse(req.query);
  const creators = await db.select().from(creatorsTable).orderBy(sql`${creatorsTable.createdAt} desc`);

  const filtered = parsed.success
    ? creators.filter(c => {
        if (parsed.data.platform && c.platform !== parsed.data.platform) return false;
        if (parsed.data.niche && !c.niche.toLowerCase().includes(parsed.data.niche.toLowerCase())) return false;
        return true;
      })
    : creators;

  const allSubmissions = await db.select().from(submissionsTable);
  const allPayments = await db.select().from(paymentsTable);

  const enriched = filtered.map(creator => {
    const subs = allSubmissions.filter(s => s.creatorId === creator.id);
    const pays = allPayments.filter(p => p.creatorId === creator.id);
    return enrichCreator(creator, pays, subs);
  });

  res.json(enriched);
});

router.post("/creators", async (req, res): Promise<void> => {
  const parsed = CreateCreatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [creator] = await db.insert(creatorsTable).values({
    name: data.name,
    email: data.email,
    platform: data.platform,
    handle: data.handle,
    niche: data.niche ?? "",
    followerCount: data.followerCount ?? 0,
    engagementRate: String(data.engagementRate ?? 0),
    avatarUrl: data.avatarUrl ?? null,
    approvalRate: String(data.approvalRate ?? 0),
    revisionRate: String(data.revisionRate ?? 0),
    completedCampaigns: data.completedCampaigns ?? 0,
    onTimeDeliveryRate: String(data.onTimeDeliveryRate ?? 0),
    avgTurnaroundDays: String(data.avgTurnaroundDays ?? 0),
    brandRating: String(data.brandRating ?? 0),
    suggestedPayout: String(data.suggestedPayout ?? 0),
    contentStyles: JSON.stringify(data.contentStyles ?? []),
  }).returning();

  await db.insert(activityTable).values({
    type: "creator_joined",
    message: `Creator ${creator.name} joined the platform`,
    entityId: creator.id,
    entityType: "creator",
  });

  if (creator.email) {
    void sendWelcomeEmail(creator.email, creator.name);
  }

  res.status(201).json(enrichCreator(creator, [], []));
});

router.get("/creators/:id", async (req, res): Promise<void> => {
  const params = GetCreatorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [creator] = await db.select().from(creatorsTable).where(eq(creatorsTable.id, params.data.id));
  if (!creator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  const subs = await db.select().from(submissionsTable).where(eq(submissionsTable.creatorId, creator.id));
  const pays = await db.select().from(paymentsTable).where(eq(paymentsTable.creatorId, creator.id));

  res.json(enrichCreator(creator, pays, subs));
});

router.patch("/creators/:id", async (req, res): Promise<void> => {
  const params = UpdateCreatorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCreatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.platform !== undefined) updateData.platform = data.platform;
  if (data.handle !== undefined) updateData.handle = data.handle;
  if (data.niche !== undefined) updateData.niche = data.niche;
  if (data.followerCount !== undefined) updateData.followerCount = data.followerCount;
  if (data.engagementRate !== undefined) updateData.engagementRate = String(data.engagementRate);
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.approvalRate !== undefined) updateData.approvalRate = String(data.approvalRate);
  if (data.revisionRate !== undefined) updateData.revisionRate = String(data.revisionRate);
  if (data.completedCampaigns !== undefined) updateData.completedCampaigns = data.completedCampaigns;
  if (data.onTimeDeliveryRate !== undefined) updateData.onTimeDeliveryRate = String(data.onTimeDeliveryRate);
  if (data.avgTurnaroundDays !== undefined) updateData.avgTurnaroundDays = String(data.avgTurnaroundDays);
  if (data.brandRating !== undefined) updateData.brandRating = String(data.brandRating);
  if (data.suggestedPayout !== undefined) updateData.suggestedPayout = String(data.suggestedPayout);
  if (data.contentStyles !== undefined) updateData.contentStyles = JSON.stringify(data.contentStyles);
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod ?? null;
  if (data.paymentDetails !== undefined) updateData.paymentDetails = data.paymentDetails ?? null;

  const [creator] = await db.update(creatorsTable).set(updateData).where(eq(creatorsTable.id, params.data.id)).returning();
  if (!creator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  res.json(enrichCreator(creator, [], []));
});

export default router;
