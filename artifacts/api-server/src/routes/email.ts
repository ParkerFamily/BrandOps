import { Router, type IRouter } from "express";
import {
  sendWelcomeEmail,
  sendCampaignInviteEmail,
  sendRevisionRequestEmail,
  sendApprovalEmail,
  sendPayoutEmail,
} from "../lib/email";

const router: IRouter = Router();

router.post("/email/welcome", async (req, res): Promise<void> => {
  const { to, name } = req.body as { to?: string; name?: string };
  if (!to || !name) { res.status(400).json({ error: "to and name required" }); return; }
  await sendWelcomeEmail(to, name);
  res.json({ ok: true });
});

router.post("/email/invite", async (req, res): Promise<void> => {
  const { to, creatorName, campaignTitle, brandName, payout } = req.body as Record<string, string>;
  if (!to || !creatorName || !campaignTitle || !brandName || !payout) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  await sendCampaignInviteEmail(to, creatorName, campaignTitle, brandName, payout);
  res.json({ ok: true });
});

router.post("/email/revision", async (req, res): Promise<void> => {
  const { to, creatorName, campaignTitle, notes } = req.body as Record<string, string>;
  if (!to || !creatorName || !campaignTitle || !notes) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  await sendRevisionRequestEmail(to, creatorName, campaignTitle, notes);
  res.json({ ok: true });
});

router.post("/email/approval", async (req, res): Promise<void> => {
  const { to, creatorName, campaignTitle, payoutAmount } = req.body as Record<string, string>;
  if (!to || !creatorName || !campaignTitle || !payoutAmount) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  await sendApprovalEmail(to, creatorName, campaignTitle, payoutAmount);
  res.json({ ok: true });
});

router.post("/email/payout", async (req, res): Promise<void> => {
  const { to, creatorName, amount, campaignTitle } = req.body as Record<string, string>;
  if (!to || !creatorName || !amount || !campaignTitle) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  await sendPayoutEmail(to, creatorName, amount, campaignTitle);
  res.json({ ok: true });
});

export default router;
