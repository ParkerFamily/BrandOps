import { useState, useMemo } from "react";
import { useListCreators, useCreateCreator, getListCreatorsQueryKey, type Creator } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Search, Plus, UserCircle2, TrendingUp, TrendingDown,
  Minus, Sparkles, Star, Zap, Award, Users, Eye,
  CheckCircle2, Filter
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Platform = "all" | "tiktok" | "instagram" | "youtube";
type SortBy = "match" | "followers" | "engagement" | "name";
type SizeFilter = "all" | "nano" | "micro" | "mid" | "macro";

function computeAiMatch(followerCount: number, engagementRate: number): number {
  const engScore = Math.min(engagementRate / 10, 1) * 50;
  const sizeScore =
    followerCount >= 10000 && followerCount <= 200000
      ? 40
      : followerCount < 10000
      ? 20
      : 25;
  const base = 50 + Math.random() * 20;
  return Math.min(99, Math.round(base + (engScore + sizeScore) / 4));
}

function computeCreatorScore(eng: number, followers: number): number {
  return Math.min(100, Math.round(eng * 8 + Math.log10(Math.max(followers, 1)) * 5));
}

function getTrendLabel(score: number): "up" | "flat" | "down" {
  if (score >= 70) return "up";
  if (score >= 40) return "flat";
  return "down";
}

function getBadges(
  match: number,
  engagementRate: number,
  followerCount: number
): { label: string; color: string; icon: React.ElementType }[] {
  const badges = [];
  if (match >= 90)
    badges.push({ label: "Best Match", color: "text-primary border-primary/30 bg-primary/10", icon: Sparkles });
  if (engagementRate >= 6)
    badges.push({ label: "High ROI", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: TrendingUp });
  if (followerCount >= 50000 && followerCount <= 200000)
    badges.push({ label: "Sweet Spot", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", icon: Zap });
  if (engagementRate >= 8)
    badges.push({ label: "Trending", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", icon: Star });
  return badges.slice(0, 2);
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function getAiMatchColor(score: number): string {
  if (score >= 90) return "text-primary";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-muted-foreground";
}

function getPlatformIcon(platform: string, size = "h-3.5 w-3.5") {
  switch (platform) {
    case "tiktok":
      return <SiTiktok className={cn(size, "text-white/60")} />;
    case "instagram":
      return <SiInstagram className={cn(size, "text-pink-400")} />;
    case "youtube":
      return <SiYoutube className={cn(size, "text-red-400")} />;
    default:
      return null;
  }
}

function CreatorCard({ creator, index }: { creator: Creator; index: number }) {
  const aiMatch = useMemo(
    () => computeAiMatch(creator.followerCount ?? 50000, creator.engagementRate ?? 3.5),
    [creator.followerCount, creator.engagementRate]
  );
  const creatorScore = computeCreatorScore(
    creator.engagementRate ?? 3.5,
    creator.followerCount ?? 50000
  );
  const trend = getTrendLabel(creatorScore);
  const badges = getBadges(aiMatch, creator.engagementRate ?? 3.5, creator.followerCount ?? 50000);
  const avgViews = Math.round((creator.followerCount ?? 50000) * ((creator.engagementRate ?? 3.5) / 100) * 3.2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link href={`/creators/${creator.id}`} data-testid={`card-creator-${creator.id}`}>
        <Card className="bg-card border-card-border hover:border-primary/40 transition-all duration-200 cursor-pointer h-full group hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="p-5 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden">
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-lg">
                      {creator.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {creator.status === "active" && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border-2 border-card flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {creator.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {getPlatformIcon(creator.platform)}
                  <span className="truncate">{creator.handle}</span>
                </div>
              </div>

              {/* AI Match badge */}
              <div className="shrink-0 text-right">
                <div className={cn("text-lg font-black leading-none", getAiMatchColor(aiMatch))}>
                  {aiMatch}%
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI fit
                </div>
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {badges.map(({ label, color, icon: Icon }) => (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      color
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Niche tag */}
            <div className="mb-3">
              <Badge variant="outline" className="text-xs bg-white/3 border-white/10 text-white/60">
                {creator.niche}
              </Badge>
            </div>

            {/* Metrics grid */}
            <div className="mt-auto grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Followers</div>
                <div className="text-sm font-bold">{formatFollowers(creator.followerCount ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Engagement</div>
                <div className="text-sm font-bold text-primary">
                  {(creator.engagementRate ?? 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Avg Views</div>
                <div className="text-sm font-bold">{formatFollowers(avgViews)}</div>
              </div>
            </div>

            {/* Trend indicator */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {getPlatformIcon(creator.platform)}
                <span className="capitalize">{creator.platform}</span>
              </div>
              <div className="flex items-center gap-1">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-primary" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(
                  trend === "up" ? "text-primary" : trend === "down" ? "text-red-400" : ""
                )}>
                  {trend === "up" ? "Trending up" : trend === "down" ? "Declining" : "Stable"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

const NICHES = ["All", "Lifestyle", "Fitness", "Beauty", "Food", "Tech", "Fashion", "Travel", "Gaming"];

export default function Creators() {
  const { data: creators, isLoading } = useListCreators();
  const createCreator = useCreateCreator();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [nicheFilter, setNicheFilter] = useState("All");
  const [sortBy, setSortBy] = useState<SortBy>("match");

  const handleMockAddCreator = () => {
    const niches = ["Lifestyle", "Fitness", "Beauty", "Food", "Tech"];
    const platforms = ["tiktok", "instagram", "youtube"] as const;
    const names = ["Alex Chen", "Jordan Kim", "Taylor Morgan", "Sam Rivera", "Casey Blake", "Morgan Lee"];
    const name = names[Math.floor(Math.random() * names.length)];
    const plat = platforms[Math.floor(Math.random() * platforms.length)];
    const niche = niches[Math.floor(Math.random() * niches.length)];
    const handle = "@" + name.toLowerCase().replace(" ", "") + Math.floor(Math.random() * 99);

    createCreator.mutate(
      {
        data: {
          name,
          email: `creator${Math.random().toString(36).slice(2)}@example.com`,
          platform: plat,
          handle,
          niche,
          followerCount: Math.floor(Math.random() * 300000) + 10000,
          engagementRate: parseFloat((Math.random() * 8 + 2).toFixed(1)),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Creator added!", description: `${name} joined your roster.` });
          queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
        },
      }
    );
  };

  const filtered = useMemo(() => {
    if (!creators) return [];
    return creators
      .filter((c) => {
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.handle?.toLowerCase().includes(search.toLowerCase())) return false;
        if (platform !== "all" && c.platform !== platform) return false;
        if (nicheFilter !== "All" && c.niche !== nicheFilter) return false;
        if (sizeFilter !== "all") {
          const f = c.followerCount ?? 0;
          if (sizeFilter === "nano" && !(f < 10000)) return false;
          if (sizeFilter === "micro" && !(f >= 10000 && f < 100000)) return false;
          if (sizeFilter === "mid" && !(f >= 100000 && f < 500000)) return false;
          if (sizeFilter === "macro" && !(f >= 500000)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "match") {
          const aMatch = computeAiMatch(a.followerCount ?? 0, a.engagementRate ?? 0);
          const bMatch = computeAiMatch(b.followerCount ?? 0, b.engagementRate ?? 0);
          return bMatch - aMatch;
        }
        if (sortBy === "followers") return (b.followerCount ?? 0) - (a.followerCount ?? 0);
        if (sortBy === "engagement") return (b.engagementRate ?? 0) - (a.engagementRate ?? 0);
        return a.name.localeCompare(b.name);
      });
  }, [creators, search, platform, sizeFilter, nicheFilter, sortBy]);

  const stats = useMemo(() => {
    if (!creators) return null;
    const active = creators.filter((c) => c.status === "active").length;
    const avgEng = creators.reduce((s, c) => s + (c.engagementRate ?? 0), 0) / (creators.length || 1);
    return { total: creators.length, active, avgEng };
  }, [creators]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Discovery</h1>
          <p className="text-muted-foreground mt-1">
            {stats ? (
              <span>
                <span className="text-primary font-semibold">{stats.active}</span> active creators ·{" "}
                <span className="text-primary font-semibold">{stats.avgEng.toFixed(1)}%</span> avg engagement
              </span>
            ) : (
              "Find and manage your UGC creator roster."
            )}
          </p>
        </div>
        <Button
          onClick={handleMockAddCreator}
          disabled={createCreator.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          data-testid="button-add-creator"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Creator
        </Button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or handle..."
              className="pl-9 bg-card border-card-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-card border border-card-border rounded-md px-3 text-sm text-foreground h-10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="match">Sort: AI Match</option>
            <option value="followers">Sort: Followers</option>
            <option value="engagement">Sort: Engagement</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {/* Platform filter pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {(["all", "tiktok", "instagram", "youtube"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                platform === p
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {p === "tiktok" && <SiTiktok className="h-3 w-3" />}
              {p === "instagram" && <SiInstagram className="h-3 w-3" />}
              {p === "youtube" && <SiYoutube className="h-3 w-3" />}
              {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 self-center mx-1" />

          {(["all", "nano", "micro", "mid", "macro"] as SizeFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSizeFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                sizeFilter === s
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {s === "all"
                ? "All Sizes"
                : s === "nano"
                ? "Nano <10k"
                : s === "micro"
                ? "Micro 10k-100k"
                : s === "mid"
                ? "Mid 100k-500k"
                : "Macro 500k+"}
            </button>
          ))}
        </div>

        {/* Niche pills */}
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <button
              key={n}
              onClick={() => setNicheFilter(n)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                nicheFilter === n
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && creators && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of{" "}
            <span className="text-foreground font-medium">{creators.length}</span> creators
          </span>
          {sortBy === "match" && (
            <span className="flex items-center gap-1 text-primary text-xs">
              <Sparkles className="h-3 w-3" />
              Sorted by AI match
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl bg-card" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator, i) => (
            <CreatorCard key={creator.id} creator={creator} index={i} />
          ))}
        </div>
      ) : creators && creators.length > 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl bg-card/50">
          <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No creators match your filters</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">Try adjusting your search or filters.</p>
          <Button
            variant="outline"
            onClick={() => { setSearch(""); setPlatform("all"); setSizeFilter("all"); setNicheFilter("All"); }}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed rounded-xl bg-card/50">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-medium">No creators yet</h3>
          <p className="text-muted-foreground mt-2 mb-5 max-w-xs mx-auto text-sm">
            Add creators to start AI-matching them with your campaigns.
          </p>
          <Button onClick={handleMockAddCreator} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Creator
          </Button>
        </div>
      )}
    </div>
  );
}
