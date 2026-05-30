import { useState, useMemo, useRef, useEffect } from "react";
import {
  fsSubscribeCampaigns, fsCreateCampaign, fsBootstrapUserCampaigns,
  type FsCampaign,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Megaphone, Plus, Search, Sparkles, Loader2, Wand2,
  ChevronRight, X, CheckCircle2, RotateCcw, Save, Send,
  DollarSign, Users, Clock, ChevronDown, Trash2, Upload,
  CalendarDays, Zap, ExternalLink, PlayCircle, Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { getOnboarded } from "@/lib/onboarding";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";

const BASE = import.meta.env.BASE_URL;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CREATOR VIEW — browse available (active) campaigns                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function CreatorCampaignsPage() {
  const [campaigns, setCampaigns] = useState<FsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const unsub = fsSubscribeCampaigns((data) => {
      setCampaigns(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const available = useMemo(() =>
    campaigns
      .filter(c => c.status === "active")
      .filter(c =>
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.niche.toLowerCase().includes(search.toLowerCase()) ||
        c.platform.toLowerCase().includes(search.toLowerCase())
      ),
    [campaigns, search]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Open briefs you can submit videos to. Pick your best fit and upload your take.
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
        >
          <Upload className="h-4 w-4" /> Submit a Video
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, niche, platform…"
          className="pl-9 bg-card border-card-border"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stats pill */}
      {!isLoading && available.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span><span className="text-white font-semibold">{available.length}</span> open campaign{available.length !== 1 ? "s" : ""} right now</span>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl bg-card" />)}
        </div>
      ) : available.length > 0 ? (
        <div className="grid gap-4">
          {available.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <Link href={`/campaigns/${campaign.id}`}>
                <Card className="bg-card border-card-border hover:border-primary/50 transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                            {campaign.title}
                          </h3>
                          <Badge className="bg-primary/15 text-primary border-primary/25 text-xs shrink-0">Open</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {campaign.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 capitalize">
                            <PlayCircle className="h-3 w-3" /> {campaign.platform}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {campaign.videosNeeded} videos needed
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> Due {format(new Date(campaign.deadline), "MMM d, yyyy")}
                          </span>
                          {campaign.niche && (
                            <span className="bg-white/5 border border-white/8 rounded px-1.5 py-0.5">{campaign.niche}</span>
                          )}
                        </div>
                      </div>

                      {/* Payout + CTA */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black text-primary leading-none">
                            ${Number(campaign.payoutPerVideo).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">per video</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View brief <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    {/* Brief preview */}
                    {campaign.aiData?.creatorBrief && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Brief preview</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {campaign.aiData.creatorBrief}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed rounded-xl bg-card/50">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-6 w-6 text-muted-foreground opacity-40" />
          </div>
          <h3 className="text-lg font-medium">
            {search ? "No campaigns match your search" : "No open campaigns right now"}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
            {search
              ? "Try a different search term."
              : "Check back soon — brands post new campaigns regularly."}
          </p>
          {search && (
            <Button variant="ghost" className="mt-4 text-sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      )}

      <SubmitVideoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  BRAND VIEW — full campaign management + AI builder                        */
/* ─────────────────────────────────────────────────────────────────────────── */

const QUICK_CHIPS = [
  "App installs", "Product demo", "TikTok ads", "Instagram Reels",
  "Testimonials", "Talking head", "Lifestyle b-roll", "Fast turnaround",
  "Paid ads", "Brand awareness", "E-commerce", "SaaS product",
];

const GENERATION_STEPS = [
  "Reading campaign goal…",
  "Building creator requirements…",
  "Writing UGC brief…",
  "Estimating payout strategy…",
  "Preparing campaign draft…",
];

interface GeneratedCampaign {
  title: string;
  summary: string;
  creatorBrief: string;
  deliverables: string;
  videoConceptIdeas: string[];
  hookIdeas: string[];
  ctaIdeas: string[];
  payoutStrategy: string;
  suggestedVideoCount: number;
  suggestedPayoutPerVideo: number;
  estimatedTotalCost: number;
  usageRights: string;
  suggestedDeadline: string;
  approvalCriteria: string[];
  creatorType: string;
  toneAndStyle: string;
  doList: string[];
  dontList: string[];
}

type Step = "prompt" | "generating" | "result";

function EditableText({
  value, onChange, placeholder, rows = 4, mono = false,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; mono?: boolean;
}) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full resize-none rounded-lg bg-white/4 border border-white/10 text-sm text-foreground/90 leading-relaxed px-3 py-2.5",
        "focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all placeholder:text-white/20 mt-2",
        mono && "font-mono",
      )}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function EditableList({
  items, onChange, numbered = false, accent = "text-primary",
}: {
  items: string[]; onChange: (items: string[]) => void;
  numbered?: boolean; accent?: string;
}) {
  function updateItem(i: number, val: string) {
    const next = [...items]; next[i] = val; onChange(next);
  }
  function removeItem(i: number) { onChange(items.filter((_, idx) => idx !== i)); }
  function addItem() { onChange([...items, ""]); }

  return (
    <div className="space-y-1.5 pt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={cn("shrink-0 text-xs font-bold mt-2.5 w-4", accent)}>
            {numbered ? `${i + 1}.` : "•"}
          </span>
          <input
            className="flex-1 bg-white/4 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground/90 placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
            value={item}
            placeholder="Add item…"
            onChange={e => updateItem(i, e.target.value)}
          />
          <button
            onClick={() => removeItem(i)}
            className="shrink-0 mt-1.5 p-1 text-white/20 hover:text-red-400 transition-colors rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="text-xs text-muted-foreground hover:text-primary transition-colors px-1 pt-1 flex items-center gap-1">
        <Plus className="h-3 w-3" /> Add item
      </button>
    </div>
  );
}

function Accordion({
  emoji, label, count, children, defaultOpen = false,
}: {
  emoji: string; label: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-sm font-medium">{label}</span>
          {count !== undefined && (
            <span className="text-[11px] text-muted-foreground bg-white/5 border border-white/8 rounded px-1.5 py-0.5">{count}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0.5 border-t border-white/6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<FsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const unsub = fsSubscribeCampaigns((data) => {
      setCampaigns(data);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    fsBootstrapUserCampaigns(user.uid).catch(() => {});
  }, [user?.uid]);

  const [search, setSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [step, setStep] = useState<Step>("prompt");
  const [generated, setGenerated] = useState<GeneratedCampaign | null>(null);
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [genStep, setGenStep] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);

  function patch<K extends keyof GeneratedCampaign>(key: K, value: GeneratedCampaign[K]) {
    setGenerated(prev => prev ? { ...prev, [key]: value } : prev);
  }

  const filtered = useMemo(() =>
    campaigns.filter(c =>
      !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.niche.toLowerCase().includes(search.toLowerCase())
    ), [campaigns, search]);

  function appendChip(chip: string) {
    setPrompt(p => p ? `${p.trimEnd()}, ${chip.toLowerCase()}` : chip.toLowerCase());
  }

  function openAI() {
    setStep("prompt"); setGenerated(null);
    setPrompt(""); setBudget(""); setDeadline("");
    setAiOpen(true);
  }

  function closeAI() {
    setAiOpen(false);
    if (stepTimer.current) clearInterval(stepTimer.current);
  }

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}api/openai/campaign-builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          budget: budget ? Number(budget) : undefined,
          deadline: deadline || undefined,
        }),
      });
      if (!r.ok) throw new Error("Generation failed");
      return r.json() as Promise<GeneratedCampaign>;
    },
    onMutate: () => {
      setStep("generating"); setGenStep(0);
      stepTimer.current = setInterval(() => {
        setGenStep(s => Math.min(s + 1, GENERATION_STEPS.length - 1));
      }, 900);
    },
    onSuccess: (data) => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setGenStep(GENERATION_STEPS.length - 1);
      setTimeout(() => { setGenerated(data); setStep("result"); }, 300);
    },
    onError: () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setStep("prompt");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    },
  });

  function parseDeadline(raw: string): string {
    if (!raw) return new Date(Date.now() + 30 * 86400000).toISOString();
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) return direct.toISOString();
    const m = raw.match(/(\d+)\s*(day|week|month)/i);
    if (m) {
      const n = parseInt(m[1]);
      const unit = m[2].toLowerCase();
      const ms = unit === "week" ? n * 7 * 86400000 : unit === "month" ? n * 30 * 86400000 : n * 86400000;
      return new Date(Date.now() + ms).toISOString();
    }
    return new Date(Date.now() + 30 * 86400000).toISOString();
  }

  const handleCreateFromAI = async (status: "draft" | "active" = "draft") => {
    if (!generated) return;
    setSaving(true);
    const deadlineStr = generated.suggestedDeadline || deadline || "30 days";
    const deadlineISO = parseDeadline(deadlineStr);
    try {
      const fsId = await fsCreateCampaign({
        title: generated.title,
        description: generated.summary,
        platform: "tiktok",
        niche: generated.creatorType?.slice(0, 50) || "UGC",
        status: status === "active" ? "active" : "draft",
        totalBudget: generated.estimatedTotalCost || Number(budget) || 1000,
        payoutPerVideo: generated.suggestedPayoutPerVideo || 100,
        videosNeeded: generated.suggestedVideoCount || 1,
        creatorType: generated.creatorType || "",
        tone: generated.toneAndStyle || "",
        deadline: deadlineISO,
        brandUid: user?.uid ?? "",
        ownerFirebaseUid: user?.uid ?? "",
        aiData: {
          hookIdeas: generated.hookIdeas,
          videoConceptIdeas: generated.videoConceptIdeas,
          ctaIdeas: generated.ctaIdeas,
          creatorBrief: generated.creatorBrief,
          approvalCriteria: generated.approvalCriteria,
          deliverables: generated.deliverables,
          usageRights: generated.usageRights,
          payoutStrategy: generated.payoutStrategy,
          doList: generated.doList,
          dontList: generated.dontList,
          toneAndStyle: generated.toneAndStyle,
        },
      });
      toast({
        title: status === "active" ? "Campaign published!" : "Campaign saved as draft",
        description: generated.title,
      });
      closeAI();
      navigate(`/campaigns/${fsId}`);
    } catch {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":    return <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>;
      case "draft":     return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
      case "paused":    return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Paused</Badge>;
      case "completed": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Completed</Badge>;
      case "archived":  return <Badge variant="outline" className="opacity-50">Archived</Badge>;
      default:          return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your active and past creator campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAI} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-ai-campaign">
            <Sparkles className="h-4 w-4" /> Create with AI
          </Button>
          <Link href="/campaigns/new">
            <Button variant="outline" className="gap-2" data-testid="button-create-campaign">
              <Plus className="h-4 w-4" /> Manual
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-transparent p-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI Campaign Builder</p>
          <p className="text-xs text-muted-foreground">Describe your product and goal in plain English — AI writes the full campaign brief.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0" onClick={openAI}>
          Launch <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns…" className="pl-8 bg-card border-card-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`} data-testid={`card-campaign-${campaign.id}`}>
              <Card className="bg-card border-card-border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{campaign.niche}</span>
                      <span>•</span>
                      <span>${campaign.totalBudget.toLocaleString()} budget</span>
                      <span>•</span>
                      <span>${(campaign.payoutPerVideo ?? 0).toLocaleString()}/video</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-foreground">{campaign.videosNeeded ?? 0}</div>
                      <div className="text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-primary">${campaign.totalBudget.toLocaleString()}</div>
                      <div className="text-muted-foreground">Budget</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-xl bg-card/50">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-medium">{search ? "No campaigns found" : "No campaigns yet"}</h3>
          <p className="text-muted-foreground mt-2 mb-6">{search ? "Try a different search term." : "Launch your first UGC campaign in seconds with AI."}</p>
          {!search && (
            <div className="flex justify-center gap-3">
              <Button onClick={openAI} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Sparkles className="h-4 w-4" /> Create with AI
              </Button>
              <Link href="/campaigns/new"><Button variant="outline">Manual Setup</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* ── AI Builder Dialog ─────────────────────────────────────────────── */}
      <Dialog open={aiOpen} onOpenChange={o => { if (!o) closeAI(); }}>
        <DialogContent className={cn(
          "bg-[#0e0e0e] border border-white/10 text-white p-0 max-h-[92vh] overflow-hidden flex flex-col",
          step === "result" ? "sm:max-w-[600px]" : "sm:max-w-[620px]"
        )}>

          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm leading-none">AI Campaign Builder</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {step === "prompt"     && "Describe what you need — AI does the rest"}
                  {step === "generating" && "Building your campaign…"}
                  {step === "result"     && "Campaign ready ✓ — edit anything below"}
                </div>
              </div>
            </div>
            <button onClick={closeAI} className="text-muted-foreground hover:text-white transition-colors p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">

            {step === "prompt" && (
              <motion.div key="prompt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col overflow-y-auto">
                <div className="px-6 pt-5 pb-4 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Tell BrandOps what you need</h2>
                    <p className="text-sm text-muted-foreground">Describe your product, budget, audience, and goal. AI turns it into a complete campaign brief.</p>
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full min-h-[140px] resize-none rounded-xl bg-white/4 border border-white/12 text-white placeholder:text-white/25 text-sm leading-relaxed px-4 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                      placeholder="Example: I'm launching a skincare brand and need 15 short UGC videos for TikTok and Reels. Budget is $3,000. I want product demos, testimonials, and strong hooks for paid ads."
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim()) generateMutation.mutate(); }}
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-white/20">⌘↵ to generate</div>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-2">Quick add</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip} onClick={() => appendChip(chip)} className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/3 text-white/60 hover:text-white hover:border-primary/40 hover:bg-primary/8 transition-all">
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-white/40 text-xs">Total Budget ($) <span className="text-white/25">optional</span></Label>
                      <Input type="number" placeholder="e.g. 5000" value={budget} onChange={e => setBudget(e.target.value)} className="bg-white/4 border-white/10 text-white placeholder:text-white/20 h-9" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-white/40 text-xs">Deadline <span className="text-white/25">optional</span></Label>
                      <Input placeholder="e.g. 2 weeks" value={deadline} onChange={e => setDeadline(e.target.value)} className="bg-white/4 border-white/10 text-white placeholder:text-white/20 h-9" />
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-5 flex justify-end">
                  <Button onClick={() => generateMutation.mutate()} disabled={!prompt.trim()} className="bg-primary text-black hover:bg-primary/90 font-bold gap-2 px-6">
                    <Sparkles className="h-4 w-4" /> Generate Campaign
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "generating" && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 px-6 gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
                <div className="space-y-2 w-full max-w-sm">
                  {GENERATION_STEPS.map((s, i) => (
                    <div key={s} className={cn(
                      "flex items-center gap-2.5 text-sm transition-all duration-300",
                      i < genStep ? "text-primary/60" : i === genStep ? "text-white font-medium" : "text-white/20"
                    )}>
                      {i < genStep ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                       : i === genStep ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                       : <div className="h-3.5 w-3.5 rounded-full border border-white/15 shrink-0" />}
                      {s}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === "result" && generated && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-y-auto flex-1">
                <div className="px-6 pt-4 pb-2 space-y-4">
                  <div className="p-3 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-primary">Campaign generated</span>
                    </div>
                    <button onClick={() => setStep("prompt")} className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors">
                      <RotateCcw className="h-3 w-3" /> Regenerate
                    </button>
                  </div>

                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Campaign Title</p>
                    <input
                      className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-base font-semibold text-white focus:outline-none focus:border-primary/40 transition-colors"
                      value={generated.title}
                      onChange={e => patch("title", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-white/3 rounded-lg border border-white/6 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-[10px] uppercase font-semibold tracking-wide">Budget</span>
                      </div>
                      <div className="font-bold text-sm">${generated.estimatedTotalCost.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        <span className="text-[10px] uppercase font-semibold tracking-wide">Videos</span>
                      </div>
                      <div className="font-bold text-sm">{generated.suggestedVideoCount}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] uppercase font-semibold tracking-wide">Deadline</span>
                      </div>
                      <div className="font-bold text-sm text-primary">{generated.suggestedDeadline}</div>
                    </div>
                  </div>

                  <Accordion emoji="📝" label="Campaign Brief" defaultOpen>
                    <EditableText value={generated.creatorBrief} onChange={v => patch("creatorBrief", v)} rows={5} />
                  </Accordion>
                  <Accordion emoji="🎯" label="Deliverables">
                    <EditableText value={generated.deliverables} onChange={v => patch("deliverables", v)} rows={3} />
                  </Accordion>
                  <Accordion emoji="💡" label="Hook Ideas" count={generated.hookIdeas.length}>
                    <EditableList items={generated.hookIdeas} onChange={v => patch("hookIdeas", v)} accent="text-primary" />
                  </Accordion>
                  <Accordion emoji="🎬" label="Video Concepts" count={generated.videoConceptIdeas.length}>
                    <EditableList items={generated.videoConceptIdeas} onChange={v => patch("videoConceptIdeas", v)} numbered accent="text-blue-400" />
                  </Accordion>
                  <Accordion emoji="📣" label="CTA Ideas" count={generated.ctaIdeas.length}>
                    <EditableList items={generated.ctaIdeas} onChange={v => patch("ctaIdeas", v)} accent="text-yellow-400" />
                  </Accordion>
                  <Accordion emoji="✅" label="Approval Criteria" count={generated.approvalCriteria.length}>
                    <EditableList items={generated.approvalCriteria} onChange={v => patch("approvalCriteria", v)} numbered accent="text-green-400" />
                  </Accordion>
                  <Accordion emoji="✅" label="Do's & Don'ts">
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide mb-1">Do</p>
                        <EditableList items={generated.doList} onChange={v => patch("doList", v)} accent="text-green-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1">Don't</p>
                        <EditableList items={generated.dontList} onChange={v => patch("dontList", v)} accent="text-red-400" />
                      </div>
                    </div>
                  </Accordion>
                  <Accordion emoji="⚖️" label="Usage Rights & Payout">
                    <EditableText value={generated.usageRights} onChange={v => patch("usageRights", v)} rows={2} />
                    <EditableText value={generated.payoutStrategy} onChange={v => patch("payoutStrategy", v)} rows={2} />
                  </Accordion>
                </div>

                <div className="sticky bottom-0 px-6 py-4 border-t border-white/8 bg-[#0e0e0e] flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/15 text-white/70 hover:text-white gap-1.5"
                    onClick={() => handleCreateFromAI("draft")}
                    disabled={saving}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving…" : "Save Draft"}
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-black hover:bg-primary/90 font-bold gap-1.5"
                    onClick={() => handleCreateFromAI("active")}
                    disabled={saving}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {saving ? "Publishing…" : "Publish Now"}
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ROOT — route to correct view based on account type                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function Campaigns() {
  const onboarding = getOnboarded();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";
  return isCreator ? <CreatorCampaignsPage /> : <BrandCampaignsPage />;
}
