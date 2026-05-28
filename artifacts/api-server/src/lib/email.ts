import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "BrandOps <noreply@brandopsapp.com>";
const FOOTER = `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #1a1a1a;color:#444;font-size:12px;text-align:center;">Sent from <strong style="color:#C6FF00;">BrandOps</strong> — creator campaign operations.</p>`;

function base(content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>BrandOps</title></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:8px 32px 0;background:#0d0d0d;border-bottom:1px solid #1a1a1a;">
          <p style="margin:16px 0;font-size:18px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#C6FF00;">Brand</span><span style="color:#fff;">Ops</span>
          </p>
        </td></tr>
        <tr><td style="padding:32px;">${content}${FOOTER}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function tag(text: string, color = "#C6FF00") {
  return `<span style="display:inline-block;background:${color}18;color:${color};border:1px solid ${color}30;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${text}</span>`;
}

function btn(label: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#C6FF00;color:#0a0a0a;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">${label}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#fff;">${text}</h1>`;
}

function p(text: string, muted = false) {
  return `<p style="margin:12px 0;font-size:15px;line-height:1.6;color:${muted ? "#666" : "#aaa"};">${text}</p>`;
}

function stat(label: string, value: string) {
  return `<td style="text-align:center;padding:16px;background:#0d0d0d;border-radius:10px;">
    <div style="font-size:22px;font-weight:900;color:#fff;">${value}</div>
    <div style="font-size:11px;color:#555;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
  </td>`;
}

async function send(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    logger.error({ err, to, subject }, "Resend email failed");
  }
}

/* ── Welcome ────────────────────────────────────────────────────────────── */
export async function sendWelcomeEmail(to: string, name: string) {
  const html = base(`
    ${h1("Welcome to BrandOps.")}
    ${p(`Hey ${name}, you're in.`)}
    ${p("You now have everything you need to run UGC campaigns end-to-end — find creators, launch campaigns, review content, and automate payouts from one place.")}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;border-spacing:8px;">
      <tr>
        ${stat("Campaigns", "∞")}
        <td width="8"></td>
        ${stat("Creators", "50K+")}
        <td width="8"></td>
        ${stat("Payouts", "Auto")}
      </tr>
    </table>
    ${p("Start by creating your first campaign or exploring creators in the discovery tool.", true)}
    ${btn("Open BrandOps", "https://brandopsapp.com/dashboard")}
  `);
  await send(to, "Welcome to BrandOps", html);
}

/* ── Campaign Invite ────────────────────────────────────────────────────── */
export async function sendCampaignInviteEmail(
  to: string,
  creatorName: string,
  campaignTitle: string,
  brandName: string,
  payout: string,
) {
  const html = base(`
    ${tag("Campaign Invite")}
    <div style="height:16px;"></div>
    ${h1(`You've been invited.`)}
    ${p(`Hey ${creatorName}, <strong style="color:#fff;">${brandName}</strong> wants you for their campaign.`)}
    <div style="margin:24px 0;padding:20px;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:12px;">
      <div style="font-size:13px;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Campaign</div>
      <div style="font-size:18px;font-weight:800;color:#fff;">${campaignTitle}</div>
      <div style="margin-top:12px;font-size:13px;color:#555;">Payout per video</div>
      <div style="font-size:24px;font-weight:900;color:#C6FF00;">${payout}</div>
    </div>
    ${p("Review the brief, submit your content, and get paid automatically once approved.", true)}
    ${btn("View Campaign", "https://brandopsapp.com/campaigns")}
  `);
  await send(to, `Campaign invite: ${campaignTitle}`, html);
}

/* ── Revision Request ───────────────────────────────────────────────────── */
export async function sendRevisionRequestEmail(
  to: string,
  creatorName: string,
  campaignTitle: string,
  notes: string,
) {
  const html = base(`
    ${tag("Revision Requested", "#f59e0b")}
    <div style="height:16px;"></div>
    ${h1("A revision was requested.")}
    ${p(`Hey ${creatorName}, your submission for <strong style="color:#fff;">${campaignTitle}</strong> needs some changes before it can be approved.`)}
    <div style="margin:24px 0;padding:20px;background:#1a1200;border:1px solid #3a2a00;border-radius:12px;">
      <div style="font-size:12px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Brand feedback</div>
      <div style="font-size:14px;color:#ccc;line-height:1.7;">${notes}</div>
    </div>
    ${p("Re-upload your revised content and resubmit — you've got this.", true)}
    ${btn("View Submission", "https://brandopsapp.com/submissions")}
  `);
  await send(to, `Revision requested — ${campaignTitle}`, html);
}

/* ── Approval ───────────────────────────────────────────────────────────── */
export async function sendApprovalEmail(
  to: string,
  creatorName: string,
  campaignTitle: string,
  payoutAmount: string,
) {
  const html = base(`
    ${tag("Approved ✓")}
    <div style="height:16px;"></div>
    ${h1("Your content was approved.")}
    ${p(`Nice work, ${creatorName}. Your submission for <strong style="color:#fff;">${campaignTitle}</strong> has been approved.`)}
    <div style="margin:24px 0;padding:24px;background:#0d1a00;border:1px solid #2a3d00;border-radius:12px;text-align:center;">
      <div style="font-size:13px;color:#7a9900;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Payout incoming</div>
      <div style="font-size:40px;font-weight:900;color:#C6FF00;">${payoutAmount}</div>
      <div style="font-size:13px;color:#555;margin-top:8px;">Processing automatically</div>
    </div>
    ${p("Your payout is being processed and will land shortly. Keep creating.", true)}
    ${btn("View Dashboard", "https://brandopsapp.com/payments")}
  `);
  await send(to, `Approved — ${campaignTitle}`, html);
}

/* ── Payout ─────────────────────────────────────────────────────────────── */
export async function sendPayoutEmail(
  to: string,
  creatorName: string,
  amount: string,
  campaignTitle: string,
) {
  const html = base(`
    ${tag("Payment Sent")}
    <div style="height:16px;"></div>
    ${h1("Your payment is on the way.")}
    ${p(`Hey ${creatorName}, your payout for <strong style="color:#fff;">${campaignTitle}</strong> has been sent.`)}
    <div style="margin:24px 0;padding:24px;background:#0d1a00;border:1px solid #2a3d00;border-radius:12px;text-align:center;">
      <div style="font-size:13px;color:#7a9900;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Amount sent</div>
      <div style="font-size:44px;font-weight:900;color:#C6FF00;">${amount}</div>
    </div>
    ${p("Funds typically arrive within 1–3 business days depending on your payment method.", true)}
    ${btn("View Payments", "https://brandopsapp.com/payments")}
  `);
  await send(to, `Payment sent — ${amount}`, html);
}
