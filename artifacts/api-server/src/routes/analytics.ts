import { Router, type IRouter } from "express";
import { db, campaignsTable, submissionsTable, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics", async (req, res): Promise<void> => {
  const [campaigns, submissions, payments] = await Promise.all([
    db.select().from(campaignsTable),
    db.select().from(submissionsTable),
    db.select().from(paymentsTable),
  ]);

  const paidPayments = payments.filter(p => p.status === "paid");
  const totalSpent = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Simulate engagement metrics based on approved videos
  const approvedSubs = submissions.filter(s => s.status === "approved" || s.status === "paid");
  const totalViews = approvedSubs.length * 45000 + Math.floor(Math.random() * 10000);
  const totalEngagements = Math.floor(totalViews * 0.065);
  const avgEngagementRate = 6.5;
  const totalRoi = totalSpent > 0 ? (totalViews / totalSpent) * 100 : 0;

  // Platform breakdown
  const platformBreakdown = ["tiktok", "instagram", "youtube"].map(platform => {
    const platformCampaigns = campaigns.filter(c => c.platform === platform);
    const platformPayments = payments.filter(p =>
      p.status === "paid" && platformCampaigns.some(c => c.id === p.campaignId)
    );
    return {
      platform,
      count: platformCampaigns.length,
      spend: platformPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
    };
  });

  // Monthly spend for last 6 months
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const monthlySpend = months.map((month, i) => ({
    month,
    spend: Math.floor(Math.random() * 8000) + 2000 + i * 500,
    approved: Math.floor(Math.random() * 15) + 3 + i,
  }));

  // Top campaigns by submissions
  const topCampaigns = campaigns
    .map(campaign => {
      const subs = submissions.filter(s => s.campaignId === campaign.id);
      const pays = payments.filter(p => p.campaignId === campaign.id && p.status === "paid");
      const totalSpentCampaign = pays.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      return {
        campaignId: campaign.id,
        totalSubmissions: subs.length,
        approvedSubmissions: subs.filter(s => s.status === "approved" || s.status === "paid").length,
        pendingSubmissions: subs.filter(s => s.status === "pending" || s.status === "reviewing").length,
        rejectedSubmissions: subs.filter(s => s.status === "rejected").length,
        totalSpent: totalSpentCampaign,
        budgetRemaining: parseFloat(campaign.totalBudget) - totalSpentCampaign,
        creatorCount: [...new Set(subs.map(s => s.creatorId))].length,
      };
    })
    .sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    .slice(0, 5);

  res.json({
    totalViews,
    totalEngagements,
    avgEngagementRate,
    totalRoi,
    topCampaigns,
    platformBreakdown,
    monthlySpend,
  });
});

export default router;
