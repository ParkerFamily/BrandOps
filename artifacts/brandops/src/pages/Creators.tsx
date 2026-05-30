import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fsSubscribeCreators, fsCreateCreator, type FsCreator } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  Search, Plus, Sparkles, Star, CheckCircle2, Clock, BarChart3,
  Award, Zap, ThumbsUp, Users, Loader2, Info, DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";
import { useMutation } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;

const CONTENT_STYLE_OPTIONS = [
  "Talking Head", "Product Demo", "Lifestyle", "Voiceover", "Testimonial", "Comedy", "Tutorial",
];

const EMPTY_FORM = {
  name: "", email: "", handle: "", suggestedPayout: "",
};

type SortBy = "match" | "approvalRate" | "onTimeDelivery" | "turnaround" | "brandRating" | "name";

function computeAiMatch(creator: FsCreator): number {
  const approval = (creator.approvalRate ?? 0);
  const onTime = (creator.onTimeDeliveryRate ?? 0);
  const rating = ((creator.brandRating ?? 0) / 5) * 100;
  const campaigns = Math.min((creator.completedCampaigns ?? 0) * 4, 40);
  const revisionPenalty = Math.min((creator.revisionRate ?? 0) * 0.5, 15);
  const score = (approval * 0.35) + (onTime * 0.25) + (rating * 0.2) + campaigns - revisionPenalty;
  return Math.min(99, Math.max(0, Math.round(score)));
}

function getWhyMatched(creator: FsCreator): string[] {
  const reasons: string[] = [];
  if ((creator.approvalRate ?? 0) >= 90) reasons.push(`${creator.approvalRate}% approval rate`);
  if ((creator.onTimeDeliveryRate ?? 0) >= 90) reasons.push(`Delivers on time ${creator.onTimeDeliveryRate}%`);
  if ((creator.avgTurnaroundDays ?? 0) > 0 && (creator.avgTurnaroundDays ?? 0) <= 2) reasons.push("Delivers within 48 hrs");
  if ((creator.completedCampaigns ?? 0) >= 10) reasons.push(`${creator.completedCampaigns} campaigns done`);
  if ((creator.brandRating ?? 0) >= 4.5) reasons.push(`${creator.brandRating}★ brand rating`);
  if ((creator.revisionRate ?? 0) <= 10) reasons.push("Low revision rate");
  const styles = creator.contentStyles ?? [];
  if (styles.length > 0) reasons.push(`Strong ${styles[0]} history`);
  return reasons.slice(0, 3);
}

function getBadges(creator: FsCreator, match: number) {
  const badges = [];
  if (match >= 90) badges.push({ label: "Best Match", color: "text-primary border-primary/30 bg-primary/10", icon: Sparkles });
  if ((creator.approvalRate ?? 0) >= 95) badges.push({ label: "Top Rated", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", icon: Award });
  if ((creator.onTimeDeliveryRate ?? 0) >= 95) badges.push({ label: "Fast Delivery", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", icon: Zap });
  if ((creator.completedCampaigns ?? 0) >= 20) badges.push({ label: "Veteran", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", icon: Star });
  if ((creator.revisionRate ?? 0) <= 5) badges.push({ label: "Low Revisions", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", icon: ThumbsUp });
  return badges.slice(0, 2);
}

function getAiMatchColor(score: number): string {
  if (score >= 90) return "text-primary";
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-yellow-400";
  return "text-muted-foreground";
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: "easeOut" },
  }),
};

function CreatorCard({ creator, index }: { creator: FsCreator; index: number }) {
  const aiMatch = useMemo(() => computeAiMatch(creator), [creator]);
  const badges = useMemo(() => getBadges(creator, aiMatch), [creator, aiMatch]);
  const reasons = useMemo(() => getWhyMatched(creator), [creator]);
  const styles = creator.contentStyles ?? [];

  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants}>
      <Link href={`/creators/${creator.id}`} data-testid={`card-creator-${creator.id}`}>
        <Card className="bg-card border-card-border hover:border-primary/40 transition-all duration-200 cursor-pointer h-full group hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="p-5 flex flex-col h-full">

            <div className="flex items-start gap-3 mb-4">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden">
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-base">
                      {creator.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {creator.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span className="truncate">{creator.handle}</span>
                </div>
              </div>

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

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {badges.map(({ label, color, icon: Icon }) => (
                  <span key={label} className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    color
                  )}>
                    <Icon className="h-2.5 w-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Approval
                </div>
                <div className={cn("text-sm font-bold",
                  (creator.approvalRate ?? 0) >= 90 ? "text-primary" :
                  (creator.approvalRate ?? 0) >= 75 ? "text-emerald-400" : "text-white"
                )}>
                  {creator.approvalRate != null && creator.approvalRate > 0 ? `${creator.approvalRate}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  On Time
                </div>
                <div className={cn("text-sm font-bold",
                  (creator.onTimeDeliveryRate ?? 0) >= 90 ? "text-primary" :
                  (creator.onTimeDeliveryRate ?? 0) >= 75 ? "text-emerald-400" : "text-white"
                )}>
                  {creator.onTimeDeliveryRate != null && creator.onTimeDeliveryRate > 0 ? `${creator.onTimeDeliveryRate}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
                  <BarChart3 className="h-2.5 w-2.5" />
                  Campaigns
                </div>
                <div className="text-sm font-bold">
                  {creator.completedCampaigns ?? 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {(creator.avgTurnaroundDays ?? 0) > 0
                    ? `${creator.avgTurnaroundDays}d avg turnaround`
                    : "No turnaround data"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>
                  {(creator.suggestedPayout ?? 0) > 0
                    ? `$${creator.suggestedPayout}/video`
                    : "Rate TBD"}
                </span>
              </div>
            </div>

            {styles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {styles.slice(0, 4).map(s => (
                  <Badge key={s} variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-white/3 border-white/10 text-white/60">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {reasons.length > 0 && (
              <div className="mt-auto pt-2 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide font-semibold">Why matched</div>
                <div className="space-y-0.5">
                  {reasons.map(r => (
                    <div key={r} className="flex items-center gap-1.5 text-[11px] text-white/70">
                      <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(creator.brandRating ?? 0) > 0 && (
              <div className="flex items-center justify-end mt-3 pt-2 border-t border-border/50 text-xs">
                <div className="flex items-center gap-0.5 text-yellow-400">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="font-semibold">{creator.brandRating}</span>
                  <span className="text-muted-foreground ml-0.5">/ 5</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Creators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<FsCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = fsSubscribeCreators((data) => {
      setCreators(data);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("match");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const filtered = useMemo(() => {
    return creators
      .filter(c => {
        if (styleFilter !== "all" && !(c.contentStyles ?? []).includes(styleFilter)) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.handle.toLowerCase().includes(q) ||
            (c.niche ?? "").toLowerCase().includes(q) ||
            (c.contentStyles ?? []).some(s => s.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "match") return computeAiMatch(b) - computeAiMatch(a);
        if (sortBy === "approvalRate") return (b.approvalRate ?? 0) - (a.approvalRate ?? 0);
        if (sortBy === "onTimeDelivery") return (b.onTimeDeliveryRate ?? 0) - (a.onTimeDeliveryRate ?? 0);
        if (sortBy === "turnaround") return (a.avgTurnaroundDays ?? 99) - (b.avgTurnaroundDays ?? 99);
        if (sortBy === "brandRating") return (b.brandRating ?? 0) - (a.brandRating ?? 0);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [creators, sortBy, search, styleFilter]);

  const suggestStylesMutation = useMutation({
    mutationFn: async ({ handle }: { handle: string }) => {
      const r = await fetch(`${BASE}api/openai/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Given a UGC creator with handle "${handle}", suggest 2-3 content styles from this list that best fit them: ${CONTENT_STYLE_OPTIONS.join(", ")}. Reply with ONLY the style names separated by commas, nothing else.`,
        }),
      });
      const text = await r.text();
      const chunks: string[] = [];
      text.split("\n").forEach(line => {
        if (line.startsWith("data: ")) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.content) chunks.push(d.content);
          } catch {}
        }
      });
      const raw = chunks.join("").trim();
      return raw.split(",").map(s => s.trim()).filter(s => CONTENT_STYLE_OPTIONS.includes(s));
    },
    onSuccess: (styles) => {
      if (styles.length > 0) {
        setSelectedStyles(styles);
        toast({ title: "Styles suggested", description: `AI picked: ${styles.join(", ")}` });
      }
    },
    onError: () => toast({ title: "AI unavailable", description: "Select content styles manually.", variant: "destructive" }),
  });

  function toggleStyle(s: string) {
    setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleAddCreator() {
    if (!form.name || !form.email || !form.handle) return;
    setSaving(true);
    try {
      await fsCreateCreator({
        name: form.name,
        email: form.email,
        handle: form.handle,
        platform: "tiktok",
        suggestedPayout: parseFloat(form.suggestedPayout) || 0,
        contentStyles: selectedStyles,
        payoutRate: parseFloat(form.suggestedPayout) || 0,
      });
      toast({ title: "Creator added", description: `${form.name} has been added to your roster.` });
      setShowAddDialog(false);
      setForm({ ...EMPTY_FORM });
      setSelectedStyles([]);
    } catch {
      toast({ title: "Error", description: "Failed to add creator.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Roster</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-lg">
            Match creators by quality, reliability, and fit — not follower count.
            BrandOps ranks by campaign history, delivery rate, and approval performance.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-black hover:bg-primary/90 font-bold shrink-0" data-testid="button-add-creator">
          <Plus className="mr-2 h-4 w-4" />
          Add Creator
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, handle, style…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>

        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="w-40 bg-background border-input">
            <SelectValue placeholder="Content style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All styles</SelectItem>
            {CONTENT_STYLE_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-44 bg-background border-input">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Best AI Match</SelectItem>
            <SelectItem value="approvalRate">Highest Approval Rate</SelectItem>
            <SelectItem value="onTimeDelivery">Best On-Time %</SelectItem>
            <SelectItem value="turnaround">Fastest Turnaround</SelectItem>
            <SelectItem value="brandRating">Brand Rating</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && creators.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground border border-white/8 rounded-lg px-4 py-2.5 bg-white/2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span><span className="text-white font-semibold">{filtered.length}</span> creators</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>
              Avg approval:{" "}
              <span className="text-primary font-semibold">
                {creators.filter(c => (c.approvalRate ?? 0) > 0).length > 0
                  ? Math.round(creators.filter(c => (c.approvalRate ?? 0) > 0).reduce((s, c) => s + (c.approvalRate ?? 0), 0) /
                      creators.filter(c => (c.approvalRate ?? 0) > 0).length) + "%"
                  : "—"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>
              Avg turnaround:{" "}
              <span className="text-white font-semibold">
                {creators.filter(c => (c.avgTurnaroundDays ?? 0) > 0).length > 0
                  ? (creators.filter(c => (c.avgTurnaroundDays ?? 0) > 0).reduce((s, c) => s + (c.avgTurnaroundDays ?? 0), 0) /
                      creators.filter(c => (c.avgTurnaroundDays ?? 0) > 0).length).toFixed(1) + " days"
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((creator, i) => (
            <CreatorCard key={creator.id} creator={creator} index={i} />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No creators yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-5">
            Add your first creator to start building a production roster based on quality and reliability.
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-black hover:bg-primary/90 font-bold">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Creator
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No results</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={open => { setShowAddDialog(open); if (!open) { setForm({ ...EMPTY_FORM }); setSelectedStyles([]); } }}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add Creator to Roster</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Just their identity. Performance metrics auto-track from campaign activity.</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Name *</Label>
                <Input placeholder="Full name" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Handle *</Label>
                <Input placeholder="@username" value={form.handle}
                  onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Email *</Label>
                <Input type="email" placeholder="creator@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Payout ($/video)</Label>
                <Input type="number" min="0" placeholder="e.g. 150" value={form.suggestedPayout}
                  onChange={e => setForm(f => ({ ...f, suggestedPayout: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
            </div>

            <div className="border-t border-white/8 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/50 uppercase tracking-wide font-semibold">Content Style Strengths</p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!form.handle || suggestStylesMutation.isPending}
                  onClick={() => suggestStylesMutation.mutate({ handle: form.handle })}
                  className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                >
                  {suggestStylesMutation.isPending
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</>
                    : <><Sparkles className="h-3 w-3" /> AI Suggest</>}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CONTENT_STYLE_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStyle(s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      selectedStyles.includes(s)
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-white/3 border border-white/6 p-3">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Approval rate, turnaround time, on-time delivery, and revision rate are computed automatically as this creator completes submissions through BrandOps.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setForm({ ...EMPTY_FORM }); setSelectedStyles([]); }}
              className="border-white/10 text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleAddCreator}
              disabled={saving || !form.name || !form.email || !form.handle}
              className="bg-[#C6FF00] text-black hover:bg-[#d4ff33] font-bold"
            >
              {saving ? "Adding…" : "Add Creator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
