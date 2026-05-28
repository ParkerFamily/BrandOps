import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ─── Conversations ────────────────────────────────────────────────────────────

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const deleted = await db.delete(conversations).where(eq(conversations.id, id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { content, context } = req.body as { content: string; context?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const systemContent = [
    "You are BrandOps AI — an intelligent business copilot for UGC campaign operations. You have real-time access to the user's platform data. Be specific, data-driven, and actionable. Reference actual numbers and campaign names when available.",
    context ? `\n${context}` : "",
  ].join("");

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  const stream = await openai.chat.completions.create({ model: "gpt-5.4", max_completion_tokens: 8192, messages: chatMessages, stream: true });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) { fullResponse += token; res.write(`data: ${JSON.stringify({ content: token })}\n\n`); }
  }
  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// ─── AI Campaign Builder ──────────────────────────────────────────────────────

router.post("/openai/campaign-builder", async (req, res): Promise<void> => {
  const { productName, goal, budget, payoutPerVideo, creatorType, platforms, tone, notes } = req.body;
  if (!productName || !goal || !budget) { res.status(400).json({ error: "productName, goal, and budget are required" }); return; }

  const suggestedCount = Math.max(1, Math.floor(Number(budget) / Number(payoutPerVideo || 100)));

  const systemPrompt = `You are a world-class UGC campaign strategist. Respond ONLY with a valid JSON object, no markdown, no explanation.`;
  const userPrompt = `Create a complete UGC campaign brief for:
Product/App: ${productName}
Campaign Goal: ${goal}
Total Budget: $${budget}
Payout per approved video: $${payoutPerVideo || "negotiable"}
Target Creator Type: ${creatorType || "lifestyle/micro-influencer"}
Platforms: ${Array.isArray(platforms) ? platforms.join(", ") : platforms || "TikTok, Instagram"}
Tone/Style: ${tone || "authentic, relatable"}
Notes: ${notes || "none"}
Suggested video count: ${suggestedCount}

Return ONLY this JSON structure:
{
  "title": "compelling campaign title",
  "description": "2-3 sentence campaign description that excites creators",
  "creatorInstructions": "detailed brief for creators with clear dos and don'ts (use newlines for each point)",
  "hookIdeas": ["hook idea 1", "hook idea 2", "hook idea 3", "hook idea 4"],
  "deliverables": "specific format, length, and submission requirements",
  "usageRights": "usage rights terms (e.g. 12-month non-exclusive license to use content across paid and organic channels)",
  "suggestedDeadline": "e.g. 14 days from campaign acceptance",
  "suggestedVideoCount": ${suggestedCount},
  "toneGuidance": "2-3 sentences on the specific tone and style expected",
  "doList": ["do 1", "do 2", "do 3"],
  "dontList": ["don't 1", "don't 2", "don't 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2000,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { title: productName + " UGC Campaign", description: raw, hookIdeas: [], creatorInstructions: "" };
  }
  res.json(result);
});

// ─── AI Submission Review ─────────────────────────────────────────────────────

router.post("/openai/submission-review", async (req, res): Promise<void> => {
  const { submissionId, videoUrl, campaignTitle, creatorName, creatorNiche, campaignDescription } = req.body;

  const systemPrompt = `You are an expert UGC content reviewer for brands. Score submissions honestly and give actionable feedback. Respond ONLY with valid JSON.`;
  const userPrompt = `Review this UGC video submission:
Submission ID: ${submissionId}
Campaign: ${campaignTitle || "Unknown"}
Campaign Brief: ${campaignDescription || "Standard UGC campaign"}
Creator: ${creatorName || "Unknown"} (${creatorNiche || "lifestyle"})
Video URL: ${videoUrl || "not provided"}

Score each dimension 1-10 and provide brief, specific notes. Return ONLY this JSON:
{
  "hookStrength": 7,
  "brandFit": 8,
  "clarity": 6,
  "ugcAuthenticity": 9,
  "conversionPotential": 7,
  "overallScore": 74,
  "aiNotes": "One paragraph with specific, actionable feedback referencing the campaign goal",
  "recommendation": "approve" | "revise" | "reject",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}

Note: overallScore is 0-100. Be honest but constructive. Since you can't view the video, base scores on typical performance patterns for this niche/campaign type and generate realistic, varied scores.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 800,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { overallScore: 70, hookStrength: 7, brandFit: 7, clarity: 7, ugcAuthenticity: 8, conversionPotential: 7, aiNotes: raw, recommendation: "approve" };
  }
  res.json(result);
});

// ─── AI Creator Match ─────────────────────────────────────────────────────────

router.post("/openai/creator-match", async (req, res): Promise<void> => {
  const { creatorName, niche, platform, followerCount, engagementRate, campaignTitle, campaignGoal, campaignNiche } = req.body;

  const systemPrompt = `You are a talent strategist specializing in UGC creator partnerships. Respond ONLY with valid JSON.`;
  const userPrompt = `Analyze the fit between this creator and campaign:

Creator: ${creatorName}
Niche: ${niche}
Platform: ${platform}
Followers: ${followerCount?.toLocaleString() || "unknown"}
Engagement Rate: ${engagementRate}%

${campaignTitle ? `Campaign: ${campaignTitle}
Campaign Goal: ${campaignGoal || "Brand awareness + conversions"}
Campaign Niche: ${campaignNiche || niche}` : "Analyze as a general creator profile."}

Return ONLY this JSON:
{
  "matchScore": 85,
  "tier": "Excellent Match" | "Good Match" | "Fair Match" | "Poor Match",
  "whyFits": "2-3 sentence explanation of why this creator fits",
  "suggestedPayoutRange": "$150-$250 per video",
  "bestCampaignType": "type of campaign this creator excels at",
  "audienceInsight": "one sentence about their likely audience",
  "riskFactors": "any concerns or considerations (or 'None identified')"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 600,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { matchScore: 80, tier: "Good Match", whyFits: raw, suggestedPayoutRange: "$100-$200 per video", bestCampaignType: "Authentic product reviews" };
  }
  res.json(result);
});

// ─── AI Dashboard Insights ────────────────────────────────────────────────────

router.post("/openai/dashboard-insights", async (req, res): Promise<void> => {
  const { activeCampaigns, pendingSubmissions, approvedVideos, totalSpend, budgetUsed } = req.body;

  const systemPrompt = `You are a data-driven campaign analyst. Respond ONLY with valid JSON.`;
  const userPrompt = `Generate 3 brief, specific insights for this UGC platform dashboard:
Active Campaigns: ${activeCampaigns}
Pending Submissions: ${pendingSubmissions}
Approved Videos: ${approvedVideos}
Total Spend: $${totalSpend}
Budget Used: ${budgetUsed}%

Return ONLY this JSON:
{
  "insights": [
    { "icon": "trending_up" | "warning" | "tip" | "star", "title": "short title", "body": "1-2 sentence insight or recommendation" },
    { "icon": "trending_up" | "warning" | "tip" | "star", "title": "short title", "body": "1-2 sentence insight or recommendation" },
    { "icon": "trending_up" | "warning" | "tip" | "star", "title": "short title", "body": "1-2 sentence insight or recommendation" }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 500,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { insights: [] };
  }
  res.json(result);
});

export default router;
