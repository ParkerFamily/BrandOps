import { Router, type IRouter } from "express";
import { db, campaignsTable, submissionsTable, paymentsTable, creatorsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics", async (req, res): Promise<void> => {
  const [campaigns, submissions, payments, creators] = await Promise.all([
    db.select().from(campaignsTable),
    db.select().from(submissionsTable),
    db.select().from(paymentsTable),
    db.select().from(creatorsTable),
  ]);

  // Core budget metrics
  const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.totalBudget), 0);
  const paidPayments = payments.filter(p => p.status === "paid");
  const approvedPayouts = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const budgetRemaining = totalBudget - approvedPayouts;

  // Submission metrics
  const approvedSubs = submissions.filter(s => s.status === "approved" || s.status === "paid");
  const pendingApprovals = submissions.filter(s => s.status === "pending" || s.status === "reviewing").length;
  const revisionRequests = submissions.filter(s => s.status === "revision_requested").length;
  const videosDelivered = submissions.length;
  const videosApproved = approvedSubs.length;
  const approvalRate = videosDelivered > 0
    ? Math.round((videosApproved / videosDelivered) * 100)
    : 0;

  const costPerApprovedVideo = videosApproved > 0
    ? Math.round((approvedPayouts / videosApproved) * 100) / 100
    : 0;

  // Avg delivery days (from creator records)
  const creatorsWithData = creators.filter(c => parseFloat(c.avgTurnaroundDays) > 0);
  const avgDeliveryDays = creatorsWithData.length > 0
    ? Math.round(
        (creatorsWithData.reduce((sum, c) => sum + parseFloat(c.avgTurnaroundDays), 0) / creatorsWithData.length) * 10
      ) / 10
    : 0;

  // Monthly spend (last 6 months from real payment data)
  const now = new Date();
  const monthlySpend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const monthPayments = paidPayments.filter(p => {
      const pd = new Date(p.createdAt);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    });
    const monthSubs = approvedSubs.filter(s => {
      const sd = new Date(s.createdAt);
      return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
    });
    return {
      month: label,
      spend: monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      approved: monthSubs.length,
    };
  });

  // Creator leaderboards — enrich with real submission counts
  const enriched = creators.map(c => {
    const cSubs = submissions.filter(s => s.creatorId === c.id);
    const cApproved = cSubs.filter(s => s.status === "approved" || s.status === "paid").length;
    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      platform: c.platform,
      approvalRate: parseFloat(c.approvalRate),
      avgTurnaroundDays: parseFloat(c.avgTurnaroundDays),
      completedCampaigns: c.completedCampaigns,
      approvedVideos: cApproved,
    };
  });

  // Top creators by approval rate
  const topCreators = [...enriched]
    .filter(c => c.approvalRate > 0)
    .sort((a, b) => b.approvalRate - a.approvalRate)
    .slice(0, 5)
    .map(c => ({
      id: c.id, name: c.name, handle: c.handle, platform: c.platform,
      metric: c.approvalRate, metricLabel: "approval rate",
      approvedVideos: c.approvedVideos,
    }));

  // Fastest creators by turnaround
  const fastestCreators = [...enriched]
    .filter(c => c.avgTurnaroundDays > 0)
    .sort((a, b) => a.avgTurnaroundDays - b.avgTurnaroundDays)
    .slice(0, 5)
    .map(c => ({
      id: c.id, name: c.name, handle: c.handle, platform: c.platform,
      metric: c.avgTurnaroundDays, metricLabel: "day avg turnaround",
      approvedVideos: c.approvedVideos,
    }));

  // Creators needing attention: low approval rate (<70%) or 0 completed campaigns
  const creatorsNeedingAttention = [...enriched]
    .filter(c => (c.approvalRate > 0 && c.approvalRate < 70) || (c.completedCampaigns === 0 && c.approvedVideos === 0))
    .slice(0, 5)
    .map(c => ({
      id: c.id, name: c.name, handle: c.handle, platform: c.platform,
      metric: c.approvalRate, metricLabel: "approval rate",
      approvedVideos: c.approvedVideos,
    }));

  res.json({
    totalBudget,
    approvedPayouts,
    pendingApprovals,
    videosDelivered,
    videosApproved,
    approvalRate,
    avgDeliveryDays,
    revisionRequests,
    costPerApprovedVideo,
    budgetRemaining,
    monthlySpend,
    topCreators,
    fastestCreators,
    creatorsNeedingAttention,
  });
});

export default router;
