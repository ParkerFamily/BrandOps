import { Router, type IRouter } from "express";
import { db, campaignsTable, creatorsTable, submissionsTable, paymentsTable, activityTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [campaigns, creators, submissions, payments] = await Promise.all([
    db.select().from(campaignsTable),
    db.select().from(creatorsTable),
    db.select().from(submissionsTable),
    db.select().from(paymentsTable),
  ]);

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const pendingSubmissions = submissions.filter(s => s.status === "pending" || s.status === "reviewing").length;
  const approvedVideos = submissions.filter(s => s.status === "approved" || s.status === "paid").length;
  const totalPayouts = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.totalBudget), 0);
  const totalSpent = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const campaignBudgetUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  res.json({
    totalSpend: totalSpent,
    activeCampaigns,
    pendingSubmissions,
    approvedVideos,
    totalCreators: creators.length,
    totalPayouts,
    campaignBudgetUsed,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const activity = await db
    .select()
    .from(activityTable)
    .orderBy(sql`${activityTable.createdAt} desc`)
    .limit(20);

  res.json(activity);
});

export default router;
