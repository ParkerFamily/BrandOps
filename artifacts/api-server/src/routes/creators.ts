import { Router, type IRouter } from "express";
import { db, creatorsTable, submissionsTable, paymentsTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateCreatorBody,
  UpdateCreatorBody,
  GetCreatorParams,
  UpdateCreatorParams,
  ListCreatorsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    const pays = allPayments.filter(p => p.creatorId === creator.id && p.status === "paid");
    return {
      ...creator,
      engagementRate: parseFloat(creator.engagementRate),
      totalEarnings: pays.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      approvedVideos: subs.filter(s => s.status === "approved" || s.status === "paid").length,
    };
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
    niche: data.niche,
    followerCount: data.followerCount ?? 0,
    engagementRate: String(data.engagementRate ?? 0),
    avatarUrl: data.avatarUrl ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "creator_joined",
    message: `Creator ${creator.name} joined the platform`,
    entityId: creator.id,
    entityType: "creator",
  });

  res.status(201).json({ ...creator, engagementRate: parseFloat(creator.engagementRate), totalEarnings: 0, approvedVideos: 0 });
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

  res.json({
    ...creator,
    engagementRate: parseFloat(creator.engagementRate),
    totalEarnings: pays.filter(p => p.status === "paid").reduce((sum, p) => sum + parseFloat(p.amount), 0),
    approvedVideos: subs.filter(s => s.status === "approved" || s.status === "paid").length,
  });
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

  const [creator] = await db.update(creatorsTable).set(updateData).where(eq(creatorsTable.id, params.data.id)).returning();
  if (!creator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  res.json({ ...creator, engagementRate: parseFloat(creator.engagementRate) });
});

export default router;
