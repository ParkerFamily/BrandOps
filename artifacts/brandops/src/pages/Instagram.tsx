import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  SiInstagram,
} from "react-icons/si";
import {
  Users, Eye, Heart, MessageCircle, Bookmark, TrendingUp,
  ExternalLink, Link2, Link2Off, Loader2, AlertCircle,
  ImageIcon, Play, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface IGProfile {
  connected: boolean;
  username?: string;
  name?: string;
  biography?: string;
  followersCount?: number;
  mediaCount?: number;
  profilePictureUrl?: string;
  connectedAt?: string;
}

interface IGMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface IGInsights {
  impressions?: number;
  reach?: number;
  saved?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Not Connected State ────────────────────────────────────────────────── */
function ConnectPanel({ userId, onConnect }: { userId: string; onConnect: () => void }) {
  const handleConnect = () => {
    window.location.href = `${BASE}/api/instagram/auth?userId=${encodeURIComponent(userId)}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="mb-8"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
            <SiInstagram className="h-12 w-12 text-pink-400" />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-3xl font-black text-white mb-3">Connect Instagram</h2>
        <p className="text-white/40 max-w-md mb-2">
          Link your professional Instagram account to view your real follower stats, media performance, and post-level insights directly inside BrandOps.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid grid-cols-3 gap-4 my-8 max-w-lg w-full">
        {[
          { icon: Users, label: "Follower stats", desc: "Real-time count" },
          { icon: TrendingUp, label: "Media insights", desc: "Reach & impressions" },
          { icon: Eye, label: "Post performance", desc: "Likes, saves, views" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center">
            <Icon className="h-5 w-5 text-[#C6FF00] mx-auto mb-2" />
            <div className="text-white text-xs font-semibold mb-0.5">{label}</div>
            <div className="text-white/30 text-[10px]">{desc}</div>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        onClick={handleConnect}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-[0_0_32px_rgba(168,85,247,0.3)] hover:shadow-[0_0_48px_rgba(168,85,247,0.4)] transition-all"
      >
        <SiInstagram className="h-5 w-5" />
        Connect with Instagram
      </motion.button>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        className="text-white/20 text-xs mt-5">
        Requires an Instagram Professional account (Business or Creator)
      </motion.p>
    </div>
  );
}

/* ─── Media card ─────────────────────────────────────────────────────────── */
function MediaCard({ media, userId }: { media: IGMedia; userId: string }) {
  const [insights, setInsights] = useState<IGInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [hovered, setHovered] = useState(false);

  const fetchInsights = async () => {
    if (insights || loadingInsights) return;
    setLoadingInsights(true);
    try {
      const res = await fetch(
        `${BASE}/api/instagram/insights/${media.id}?userId=${encodeURIComponent(userId)}`
      );
      if (res.ok) setInsights(await res.json());
    } catch {
      // ignore
    } finally {
      setLoadingInsights(false);
    }
  };

  const thumb = media.thumbnail_url ?? media.media_url;
  const isVideo = media.media_type === "VIDEO";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative aspect-square bg-white/4 rounded-2xl overflow-hidden border border-white/8 cursor-pointer"
      onMouseEnter={() => { setHovered(true); fetchInsights(); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Media */}
      {thumb ? (
        <img src={thumb} alt={media.caption ?? ""} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-white/20" />
        </div>
      )}

      {/* Video badge */}
      {isVideo && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
          <Play className="h-3 w-3 text-white fill-white" />
        </div>
      )}

      {/* Hover overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col justify-between p-3"
          >
            {/* Engagement row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />
                {fmt(media.like_count)}
              </div>
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                {fmt(media.comments_count)}
              </div>
              {media.permalink && (
                <a href={media.permalink} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-white/40 hover:text-white transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Insights */}
            <div className="space-y-1.5">
              {loadingInsights ? (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading insights…
                </div>
              ) : insights ? (
                <>
                  <InsightRow icon={Eye} label="Impressions" value={fmt(insights.impressions)} />
                  <InsightRow icon={TrendingUp} label="Reach" value={fmt(insights.reach)} />
                  <InsightRow icon={Bookmark} label="Saves" value={fmt(insights.saved)} />
                </>
              ) : null}

              {/* Caption */}
              {media.caption && (
                <p className="text-white/50 text-[10px] leading-snug line-clamp-2 mt-2">
                  {media.caption}
                </p>
              )}
              <p className="text-white/25 text-[9px]">{relativeTime(media.timestamp)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InsightRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-white/50 text-[10px]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <span className="text-white text-xs font-bold">{value}</span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Instagram() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [profile, setProfile] = useState<IGProfile | null>(null);
  const [media, setMedia] = useState<IGMedia[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [error, setError] = useState("");
  const [justConnected, setJustConnected] = useState(false);

  const uid = user?.uid ?? "";

  // Parse URL params for success/error from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") setJustConnected(true);
    if (params.get("error")) setError(`Connection failed: ${params.get("error")?.replace(/_/g, " ")}`);
    // Clean URL
    if (params.has("connected") || params.has("error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location]);

  // Fetch profile
  useEffect(() => {
    if (!uid) return;
    setLoadingProfile(true);
    fetch(`${BASE}/api/instagram/profile?userId=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((data: IGProfile) => {
        setProfile(data);
        if (data.connected) loadMedia();
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoadingProfile(false));
  }, [uid]);

  const loadMedia = async () => {
    if (!uid) return;
    setLoadingMedia(true);
    try {
      const res = await fetch(`${BASE}/api/instagram/media?userId=${encodeURIComponent(uid)}`);
      if (res.ok) setMedia(await res.json());
    } catch {
      // ignore — media is supplemental
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleDisconnect = async () => {
    if (!uid) return;
    await fetch(`${BASE}/api/instagram/disconnect?userId=${encodeURIComponent(uid)}`, { method: "DELETE" });
    setProfile({ connected: false });
    setMedia([]);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C6FF00]" />
      </div>
    );
  }

  if (!profile?.connected) {
    return (
      <div className="space-y-0">
        {error && (
          <div className="mx-6 mt-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <ConnectPanel userId={uid} onConnect={() => {}} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Success toast */}
      <AnimatePresence>
        {justConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-xl px-4 py-3"
          >
            <SiInstagram className="h-4 w-4 text-[#C6FF00]" />
            <p className="text-[#C6FF00] text-sm font-medium">Instagram connected successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/3 border border-white/8 rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/40"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 flex items-center justify-center">
                <SiInstagram className="h-7 w-7 text-pink-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-white font-black text-xl">@{profile.username}</h2>
                <span className="text-[9px] bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 px-2 py-0.5 rounded-full font-medium">
                  Connected
                </span>
              </div>
              {profile.name && <p className="text-white/50 text-sm">{profile.name}</p>}
              {profile.biography && (
                <p className="text-white/30 text-xs mt-1 max-w-md leading-relaxed">{profile.biography}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMedia}
              className="flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/10 text-white/50 hover:text-white/80 rounded-xl text-xs transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingMedia && "animate-spin")} />
              Refresh
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 rounded-xl text-xs transition-colors"
            >
              <Link2Off className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: Users, label: "Followers", value: fmt(profile.followersCount ?? 0) },
            { icon: ImageIcon, label: "Posts", value: fmt(profile.mediaCount ?? 0) },
            { icon: Link2, label: "Connected", value: profile.connectedAt ? relativeTime(profile.connectedAt) : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/3 border border-white/6 rounded-xl p-4">
              <Icon className="h-4 w-4 text-[#C6FF00] mb-2" />
              <div className="text-white font-black text-xl mb-0.5">{value}</div>
              <div className="text-white/30 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Media grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Recent Posts</h3>
          <p className="text-white/30 text-xs">Hover a post for insights</p>
        </div>

        {loadingMedia ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-[#C6FF00]" />
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/25 text-sm">
            <ImageIcon className="h-8 w-8 mb-2" />
            No media found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {media.map((m) => (
              <MediaCard key={m.id} media={m} userId={uid} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
