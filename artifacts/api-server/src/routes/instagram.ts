import { Router, type IRouter } from "express";
import { db, instagramAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getAppId() { return process.env.INSTAGRAM_APP_ID ?? ""; }
function getAppSecret() { return process.env.INSTAGRAM_APP_SECRET ?? ""; }
function getFrontendBase() {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : "http://localhost:80";
}
function getRedirectUri() { return `${getFrontendBase()}/api/instagram/callback`; }

/* ── Manual token connect ────────────────────────────────────────────────── */
router.post("/instagram/token", async (req, res): Promise<void> => {
  const { userId, accessToken } = req.body as { userId?: string; accessToken?: string };
  if (!userId || !accessToken) {
    res.status(400).json({ error: "userId and accessToken required" });
    return;
  }

  try {
    // Try to exchange for long-lived token first
    let finalToken = accessToken;
    if (getAppId() && getAppSecret()) {
      try {
        const longUrl = new URL("https://graph.instagram.com/access_token");
        longUrl.searchParams.set("grant_type", "ig_exchange_token");
        longUrl.searchParams.set("client_id", getAppId());
        longUrl.searchParams.set("client_secret", getAppSecret());
        longUrl.searchParams.set("access_token", accessToken);
        const longRes = await fetch(longUrl.toString());
        const longData = await longRes.json() as { access_token?: string };
        if (longData.access_token) finalToken = longData.access_token;
      } catch {
        // fall through with original token
      }
    }

    // Fetch profile to validate token
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set(
      "fields",
      "id,username,name,biography,followers_count,media_count,profile_picture_url"
    );
    profileUrl.searchParams.set("access_token", finalToken);

    const profileRes = await fetch(profileUrl.toString());
    const profile = await profileRes.json() as {
      id?: string;
      username?: string;
      name?: string;
      biography?: string;
      followers_count?: number;
      media_count?: number;
      profile_picture_url?: string;
      error?: { message: string };
    };

    if (profile.error || !profile.id) {
      req.log.error({ profile }, "Instagram token validation failed");
      res.status(400).json({ error: profile.error?.message ?? "Invalid access token — make sure it has instagram_business_basic scope" });
      return;
    }

    await db
      .insert(instagramAccountsTable)
      .values({
        userId,
        instagramUserId: profile.id,
        accessToken: finalToken,
        username: profile.username ?? "",
        name: profile.name ?? null,
        biography: profile.biography ?? null,
        followersCount: profile.followers_count ?? 0,
        mediaCount: profile.media_count ?? 0,
        profilePictureUrl: profile.profile_picture_url ?? null,
        tokenExpiresAt: null,
      })
      .onConflictDoUpdate({
        target: instagramAccountsTable.instagramUserId,
        set: {
          userId,
          accessToken: finalToken,
          username: profile.username ?? "",
          name: profile.name ?? null,
          biography: profile.biography ?? null,
          followersCount: profile.followers_count ?? 0,
          mediaCount: profile.media_count ?? 0,
          profilePictureUrl: profile.profile_picture_url ?? null,
          tokenExpiresAt: null,
        },
      });

    res.json({ success: true, username: profile.username });
  } catch (err) {
    req.log.error({ err }, "Instagram manual token connect error");
    res.status(500).json({ error: "Server error" });
  }
});

/* ── Step 1: Start OAuth ─────────────────────────────────────────────────── */
router.get("/instagram/auth", (req, res): void => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  if (!getAppId()) { res.status(500).json({ error: "Instagram app not configured — set INSTAGRAM_APP_ID" }); return; }

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", getAppId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("scope", "instagram_business_basic");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", userId);

  res.redirect(url.toString());
});

/* ── Step 2: OAuth callback ──────────────────────────────────────────────── */
router.get("/instagram/callback", async (req, res): Promise<void> => {
  const { code, state: userId, error } = req.query as Record<string, string>;
  const base = getFrontendBase();

  if (error || !code || !userId) {
    res.redirect(`${base}/instagram?error=oauth_denied`);
    return;
  }

  try {
    // Exchange code → short-lived token
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getAppId(),
        client_secret: getAppSecret(),
        grant_type: "authorization_code",
        redirect_uri: getRedirectUri(),
        code,
      }),
    });
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      user_id?: string;
      error_message?: string;
    };

    if (!tokenData.access_token) {
      req.log.error({ tokenData }, "Instagram short-lived token exchange failed");
      res.redirect(`${base}/instagram?error=token_failed`);
      return;
    }

    // Exchange short-lived → long-lived token (valid 60 days)
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_id", getAppId());
    longUrl.searchParams.set("client_secret", getAppSecret());
    longUrl.searchParams.set("access_token", tokenData.access_token);

    const longRes = await fetch(longUrl.toString());
    const longData = await longRes.json() as { access_token?: string; expires_in?: number };
    const finalToken = longData.access_token ?? tokenData.access_token;

    // Fetch profile
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set(
      "fields",
      "id,username,name,biography,followers_count,media_count,profile_picture_url"
    );
    profileUrl.searchParams.set("access_token", finalToken);

    const profileRes = await fetch(profileUrl.toString());
    const profile = await profileRes.json() as {
      id: string;
      username: string;
      name?: string;
      biography?: string;
      followers_count?: number;
      media_count?: number;
      profile_picture_url?: string;
      error?: { message: string };
    };

    if (profile.error || !profile.id) {
      req.log.error({ profile }, "Instagram profile fetch failed");
      res.redirect(`${base}/instagram?error=profile_failed`);
      return;
    }

    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : null;

    // Upsert account
    await db
      .insert(instagramAccountsTable)
      .values({
        userId,
        instagramUserId: profile.id,
        accessToken: finalToken,
        username: profile.username,
        name: profile.name ?? null,
        biography: profile.biography ?? null,
        followersCount: profile.followers_count ?? 0,
        mediaCount: profile.media_count ?? 0,
        profilePictureUrl: profile.profile_picture_url ?? null,
        tokenExpiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: instagramAccountsTable.instagramUserId,
        set: {
          userId,
          accessToken: finalToken,
          username: profile.username,
          name: profile.name ?? null,
          biography: profile.biography ?? null,
          followersCount: profile.followers_count ?? 0,
          mediaCount: profile.media_count ?? 0,
          profilePictureUrl: profile.profile_picture_url ?? null,
          tokenExpiresAt: expiresAt,
        },
      });

    res.redirect(`${base}/instagram?connected=true`);
  } catch (err) {
    req.log.error({ err }, "Instagram callback error");
    res.redirect(`${base}/instagram?error=server_error`);
  }
});

/* ── Profile ─────────────────────────────────────────────────────────────── */
router.get("/instagram/profile", async (req, res): Promise<void> => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [account] = await db
    .select()
    .from(instagramAccountsTable)
    .where(eq(instagramAccountsTable.userId, userId));

  if (!account) { res.json({ connected: false }); return; }

  res.json({
    connected: true,
    username: account.username,
    name: account.name,
    biography: account.biography,
    followersCount: account.followersCount,
    mediaCount: account.mediaCount,
    profilePictureUrl: account.profilePictureUrl,
    connectedAt: account.connectedAt,
  });
});

/* ── Media list ──────────────────────────────────────────────────────────── */
router.get("/instagram/media", async (req, res): Promise<void> => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [account] = await db
    .select()
    .from(instagramAccountsTable)
    .where(eq(instagramAccountsTable.userId, userId));

  if (!account) { res.status(404).json({ error: "Not connected" }); return; }

  try {
    const mediaUrl = new URL("https://graph.instagram.com/me/media");
    mediaUrl.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink"
    );
    mediaUrl.searchParams.set("limit", "24");
    mediaUrl.searchParams.set("access_token", account.accessToken);

    const mediaRes = await fetch(mediaUrl.toString());
    const data = await mediaRes.json() as {
      data?: unknown[];
      error?: { message: string };
    };

    if (data.error) {
      req.log.error({ error: data.error }, "Instagram media fetch failed");
      res.status(400).json({ error: data.error.message });
      return;
    }

    res.json(data.data ?? []);
  } catch (err) {
    req.log.error({ err }, "Instagram media error");
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

/* ── Media insights ──────────────────────────────────────────────────────── */
router.get("/instagram/insights/:mediaId", async (req, res): Promise<void> => {
  const userId = req.query.userId as string;
  const { mediaId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const [account] = await db
    .select()
    .from(instagramAccountsTable)
    .where(eq(instagramAccountsTable.userId, userId));

  if (!account) { res.status(404).json({ error: "Not connected" }); return; }

  try {
    const insightsUrl = new URL(`https://graph.instagram.com/${mediaId}/insights`);
    insightsUrl.searchParams.set("metric", "impressions,reach,saved");
    insightsUrl.searchParams.set("access_token", account.accessToken);

    const insightsRes = await fetch(insightsUrl.toString());
    const data = await insightsRes.json() as {
      data?: Array<{ name: string; values: Array<{ value: number }> }>;
      error?: { message: string };
    };

    if (data.error) {
      res.status(400).json({ error: data.error.message });
      return;
    }

    const insights: Record<string, number> = {};
    (data.data ?? []).forEach((metric) => {
      insights[metric.name] = metric.values?.[0]?.value ?? 0;
    });

    res.json(insights);
  } catch (err) {
    req.log.error({ err }, "Instagram insights error");
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

/* ── Disconnect ──────────────────────────────────────────────────────────── */
router.delete("/instagram/disconnect", async (req, res): Promise<void> => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  await db
    .delete(instagramAccountsTable)
    .where(eq(instagramAccountsTable.userId, userId));

  res.json({ success: true });
});

export default router;
