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

// ─── AI Campaign Hooks & Scripts ──────────────────────────────────────────────

router.post("/openai/campaign-hooks", async (req, res): Promise<void> => {
  const { goal, productDescription, deliverables, tone, platform } = req.body as {
    goal?: string; productDescription?: string; deliverables?: string[]; tone?: string; platform?: string;
  };
  if (!productDescription?.trim()) { res.status(400).json({ error: "productDescription is required" }); return; }

  const goalMap: Record<string, string> = {
    downloads: "Drive App Downloads", sales: "Generate Sales", awareness: "Brand Awareness",
    traffic: "Website Traffic", signups: "Email Signups", other: "General",
  };

  const systemPrompt = `You are a world-class UGC content strategist. You write scroll-stopping hooks and authentic creator scripts for brands. Respond ONLY with a valid JSON object — no markdown, no code fences.`;

  const userPrompt = `Generate hooks and sample scripts for this UGC campaign:

Goal: ${goal ? goalMap[goal] ?? goal : "Brand awareness"}
Product/Brand: ${productDescription}
Deliverable types: ${deliverables?.join(", ") || "Talking Head, Product Demo"}
Tone: ${tone || "Authentic"}
Platform: ${platform || "TikTok"}

Return ONLY this JSON:
{
  "hooks": [
    "hook line 1 — scroll-stopping, conversational, fits the platform",
    "hook line 2",
    "hook line 3",
    "hook line 4",
    "hook line 5"
  ],
  "scripts": [
    {
      "label": "Version A",
      "content": "HOOK: [hook line]\\n\\nBODY: [2-3 natural sentences about the product — benefit-first angle]\\n\\nCTA: [call to action]"
    },
    {
      "label": "Version B",
      "content": "HOOK: [hook line]\\n\\nBODY: [problem-solution angle, 2-3 sentences]\\n\\nCTA: [call to action]"
    },
    {
      "label": "Version C",
      "content": "HOOK: [hook line]\\n\\nBODY: [storytelling/personal angle, 2-3 sentences]\\n\\nCTA: [call to action]"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1500,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { hooks: [], scripts: [] };
  }
  res.json(result);
});

// ─── AI Campaign Builder ──────────────────────────────────────────────────────

router.post("/openai/campaign-builder", async (req, res): Promise<void> => {
  const {
    // Legacy free-form format
    prompt, budget: legacyBudget, deadline: legacyDeadline,
    // New structured format
    goal, productDescription, deliverables, deliverableLength, platform, tone,
    totalBudget, avgPayout, creatorRequirements, niches, usageRights,
    deadline, inspirationLinks, styleNotes, hooks, scripts,
  } = req.body as {
    prompt?: string; budget?: number;
    goal?: string; productDescription?: string; deliverables?: string[];
    deliverableLength?: string; platform?: string; tone?: string;
    totalBudget?: number; avgPayout?: number;
    creatorRequirements?: { ageRange?: string; gender?: string; location?: string; followerRange?: string };
    niches?: string[]; usageRights?: string;
    deadline?: string; inspirationLinks?: string; styleNotes?: string;
    hooks?: string[]; scripts?: { label: string; content: string }[];
  };

  const goalMap: Record<string, string> = {
    downloads: "Drive App Downloads", sales: "Generate Sales", awareness: "Brand Awareness",
    traffic: "Website Traffic", signups: "Email Signups", other: "General",
  };
  const usageMap: Record<string, string> = {
    organic: "Organic Only", organic_paid: "Organic + Paid Ads",
    whitelisting: "Whitelisting", full_buyout: "Full Buyout",
  };

  const isStructured = !!(productDescription?.trim() || goal);
  if (!isStructured && !prompt?.trim()) {
    res.status(400).json({ error: "prompt or productDescription is required" });
    return;
  }

  const resolvedBudget = totalBudget ?? legacyBudget;
  const resolvedDeadline = deadline ?? legacyDeadline;
  const resolvedPayout = avgPayout;

  const systemPrompt = `You are a world-class UGC campaign strategist for brands (NOT influencer marketing). Brands hire creators to produce video content that the BRAND posts as ads or organic content. Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences.`;

  const userPrompt = isStructured
    ? `Build a complete UGC campaign brief from this structured brief:

Goal: ${goal ? goalMap[goal] ?? goal : "Brand awareness"}
Product / Brand: ${productDescription}
Deliverable types: ${deliverables?.join(", ") || "Talking Head"}
Video length: ${deliverableLength || "30s"}
Platform: ${platform || "TikTok"}
Tone: ${tone || "Authentic"}
Total Budget: $${resolvedBudget || 5000}
Avg Creator Payout: $${resolvedPayout || 200}
Estimated Creators: ${resolvedBudget && resolvedPayout ? Math.floor(resolvedBudget / resolvedPayout) : 25}
Creator Requirements: Age ${creatorRequirements?.ageRange || "18-35"}, Gender: ${creatorRequirements?.gender || "Any"}, Location: ${creatorRequirements?.location || "Any"}, Followers: ${creatorRequirements?.followerRange || "Any"}
Niches: ${niches?.join(", ") || "General"}
Usage Rights: ${usageRights ? (usageMap[usageRights] ?? usageRights) : "Organic Only"}
Deadline: ${resolvedDeadline || "30 days"}
Inspiration links: ${inspirationLinks || "None provided"}
Style notes: ${styleNotes || "None provided"}
${hooks?.length ? `Pre-generated hooks (incorporate these):\n${hooks.slice(0, 3).map(h => `- "${h}"`).join("\n")}` : ""}

Write a complete campaign brief a creator could execute immediately. Be specific to this product and goal.

Return ONLY this JSON:
{
  "title": "compelling, specific campaign title",
  "summary": "2-3 sentences capturing the goal and energy",
  "creatorBrief": "full creator brief with clear paragraphs — what to film, how to film it, what makes a winning video, what to avoid",
  "deliverables": "specific format including aspect ratio, length, caption/caption-free, submission method",
  "videoConceptIdeas": ["concept 1", "concept 2", "concept 3"],
  "hookIdeas": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "ctaIdeas": ["cta 1", "cta 2", "cta 3"],
  "payoutStrategy": "payout structure recommendation based on the budget",
  "suggestedVideoCount": 25,
  "suggestedPayoutPerVideo": 200,
  "estimatedTotalCost": 5000,
  "usageRights": "usage rights clause — specific to the selected tier",
  "approvalCriteria": ["criterion 1", "criterion 2", "criterion 3", "criterion 4"],
  "creatorType": "description of ideal creator for this campaign",
  "toneAndStyle": "2-3 sentences on tone, visual feel, and energy",
  "doList": ["do 1", "do 2", "do 3", "do 4"],
  "dontList": ["don't 1", "don't 2", "don't 3", "don't 4"]
}`
    : `A brand described their UGC campaign need in plain English. Extract all details and write a complete campaign brief.

Brand's description:
"${prompt}"
${resolvedBudget ? `Total Budget: $${resolvedBudget}` : ""}
${resolvedDeadline ? `Deadline: ${resolvedDeadline}` : ""}

IMPORTANT budget rules (apply strictly):
- If a budget is given, set "estimatedTotalCost" to EXACTLY that number.
- Decide a reasonable "suggestedVideoCount" for the niche/goal (typically 10–30 videos).
- Set "suggestedPayoutPerVideo" = estimatedTotalCost / suggestedVideoCount (round to nearest $5).
- If no budget is given, estimate reasonable values based on the campaign scope.

Return ONLY this exact JSON:
{
  "title": "compelling campaign title",
  "summary": "2-3 sentences",
  "creatorBrief": "full creator brief with clear paragraphs",
  "deliverables": "specific format details",
  "videoConceptIdeas": ["concept 1", "concept 2", "concept 3"],
  "hookIdeas": ["hook 1", "hook 2", "hook 3", "hook 4"],
  "ctaIdeas": ["cta 1", "cta 2", "cta 3"],
  "payoutStrategy": "payout recommendation",
  "suggestedVideoCount": 20,
  "suggestedPayoutPerVideo": 150,
  "estimatedTotalCost": 3000,
  "usageRights": "usage rights language",
  "approvalCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "creatorType": "ideal creator description",
  "toneAndStyle": "tone and visual feel",
  "doList": ["do 1", "do 2", "do 3"],
  "dontList": ["don't 1", "don't 2", "don't 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 3000,
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
  } catch {
    result = { title: "UGC Campaign", summary: raw, hookIdeas: [], creatorBrief: "" };
  }
  res.json(result);
});

// ─── AI Submission Review ─────────────────────────────────────────────────────

router.post("/openai/submission-review", async (req, res): Promise<void> => {
  const { submissionId, videoUrl, campaignTitle, creatorName, creatorNiche, campaignDescription, transcript } = req.body;

  const systemPrompt = `You are an expert UGC content reviewer for brands. You have access to the full video transcript — use it to give specific, grounded feedback about what the creator actually said and how well it serves the campaign. Score submissions honestly. Respond ONLY with valid JSON.`;

  const transcriptSection = transcript
    ? `\nVIDEO TRANSCRIPT (what the creator actually said):\n"""\n${transcript.slice(0, 3000)}\n"""\nBase your scores and notes on this real content.`
    : `\nNo transcript available — base scores on typical patterns for this niche/campaign type.`;

  const userPrompt = `Review this UGC video submission:
Submission ID: ${submissionId}
Campaign: ${campaignTitle || "Unknown"}
Campaign Brief: ${campaignDescription || "Standard UGC campaign"}
Creator: ${creatorName || "Unknown"} (${creatorNiche || "lifestyle"})
Video URL: ${videoUrl || "not provided"}
${transcriptSection}

Score each dimension 1-10 and provide brief, specific notes referencing what the creator actually said. Return ONLY this JSON:
{
  "hookStrength": 7,
  "brandFit": 8,
  "clarity": 6,
  "ugcAuthenticity": 9,
  "conversionPotential": 7,
  "overallScore": 74,
  "aiNotes": "One paragraph referencing specific things the creator said and how they serve (or miss) the campaign goal",
  "recommendation": "approve" | "revise" | "reject",
  "strengths": ["specific strength referencing transcript", "another specific strength"],
  "improvements": ["specific improvement with quote or reference", "another specific improvement"]
}`;

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

// ─── AI Campaign Coach ────────────────────────────────────────────────────────

router.post("/openai/campaign-coach", async (req, res): Promise<void> => {
  const { title, description, platform, totalBudget, payoutPerVideo, videosNeeded, deadline, niche,
          totalSubmissions, approvedSubmissions, pendingSubmissions, rejectedSubmissions, totalSpent,
          hookIdeas, creatorBrief, submissionTranscripts } = req.body;

  const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)) : null;
  const paceRatio = videosNeeded > 0 ? approvedSubmissions / videosNeeded : 0;
  const totalDays = deadline ? Math.ceil((new Date(deadline).getTime() - new Date(Date.now() - 30 * 86400000).getTime()) / 86400000) : 30;
  const timeRatio = totalDays > 0 ? (totalDays - (daysLeft ?? 0)) / totalDays : 0;

  const transcriptsSection = (submissionTranscripts as string[] | undefined)?.length
    ? `\nCREATOR VIDEO TRANSCRIPTS (what creators actually said in their submissions):\n${
        (submissionTranscripts as string[]).slice(0, 3).map((t, i) => `[Creator ${i + 1}]: ${t.slice(0, 600)}`).join("\n\n")
      }\nUse these transcripts to give specific feedback about messaging, brand fit, hooks used, and what's working or missing.`
    : "";

  const systemPrompt = `You are an expert UGC campaign manager with access to creator video transcripts. You give sharp, specific, data-driven coaching grounded in what creators actually said — not generic advice. Respond ONLY with valid JSON.`;
  const userPrompt = `Analyze this live UGC campaign and generate 3 coaching recommendations:

Campaign: "${title}"
Budget: $${totalBudget} | Payout: $${payoutPerVideo}/video | Videos Needed: ${videosNeeded}
${daysLeft !== null ? `Days Left: ${daysLeft}` : ""}
${niche ? `Niche: ${niche}` : ""}
${description ? `Brief: ${description.slice(0, 300)}` : ""}

Live stats:
- Total Submissions: ${totalSubmissions}
- Approved: ${approvedSubmissions}
- Pending Review: ${pendingSubmissions}
- Rejected: ${rejectedSubmissions}
- Budget Spent: $${totalSpent} of $${totalBudget}
- Progress vs deadline: ${Math.round(paceRatio * 100)}% of videos approved, ${Math.round(timeRatio * 100)}% of time elapsed

${hookIdeas?.length ? `Hook ideas on brief: ${hookIdeas.slice(0, 2).join("; ")}` : ""}
${transcriptsSection}

Give 3 coaching insights. Be SPECIFIC — reference actual transcript content where available, call out exact numbers, quote or paraphrase what creators said if relevant.

Return ONLY this JSON:
{
  "recommendations": [
    { "type": "warning" | "tip" | "insight" | "action", "title": "short title (max 8 words)", "body": "1-2 sentences, specific to this campaign's data" },
    { "type": "warning" | "tip" | "insight" | "action", "title": "short title", "body": "1-2 sentences, specific data" },
    { "type": "warning" | "tip" | "insight" | "action", "title": "short title", "body": "1-2 sentences, specific data" }
  ]
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
    result = { recommendations: [] };
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
