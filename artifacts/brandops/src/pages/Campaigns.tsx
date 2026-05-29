import { useListCampaigns, useCreateCampaign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Megaphone, Plus, Search, Sparkles, Loader2, Wand2,
  ChevronRight, X, CheckCircle2, RotateCcw, Save, Send,
  DollarSign, Video, Users, Clock, Tag, ShieldCheck,
  Lightbulb, Target, Star, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

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

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-foreground/80">
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items, color = "text-primary" }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={cn("mt-1 shrink-0 text-xs", color)}>•</span>
          <span className="text-foreground/80 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [step, setStep] = useState<Step>("prompt");
  const [generated, setGenerated] = useState<GeneratedCampaign | null>(null);
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [genStep, setGenStep] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const filtered = useMemo(() =>
    (campaigns ?? []).filter(c =>
      !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.niche.toLowerCase().includes(search.toLowerCase())
    ), [campaigns, search]);

  function appendChip(chip: string) {
    setPrompt(p => p ? `${p.trimEnd()}, ${chip.toLowerCase()}` : chip.toLowerCase());
  }

  function openAI() {
    setStep("prompt");
    setGenerated(null);
    setPrompt("");
    setBudget("");
    setDeadline("");
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
      setStep("generating");
      setGenStep(0);
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

  const handleCreateFromAI = (status: "draft" | "active" = "draft") => {
    if (!generated) return;
    createCampaign.mutate({
      data: {
        title: generated.title,
        description: generated.summary,
        platform: "tiktok",
        niche: generated.creatorType?.slice(0, 50) || "UGC",
        totalBudget: generated.estimatedTotalCost || Number(budget) || 1000,
        payoutPerVideo: generated.suggestedPayoutPerVideo || 100,
        deadline: generated.suggestedDeadline || deadline || "30 days",
      }
    }, {
      onSuccess: (campaign) => {
        toast({
          title: status === "active" ? "Campaign published!" : "Campaign saved as draft",
          description: generated.title,
        });
        closeAI();
        queryClient.invalidateQueries({ queryKey: ["listCampaigns"] });
        navigate(`/campaigns/${campaign.id}`);
      },
      onError: () => toast({ title: "Failed to create campaign", variant: "destructive" }),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>;
      case "draft": return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
      case "paused": return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Paused</Badge>;
      case "completed": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Completed</Badge>;
      case "archived": return <Badge variant="outline" className="opacity-50">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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

      {/* AI Banner */}
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
                      <div className="font-medium text-foreground">{campaign.creatorCount ?? 0}</div>
                      <div className="text-muted-foreground">Creators</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{campaign.approvedCount ?? 0}</div>
                      <div className="text-muted-foreground">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-primary">${(campaign.totalSpent ?? 0).toLocaleString()}</div>
                      <div className="text-muted-foreground">Spent</div>
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

      {/* ─── AI Campaign Builder Modal ─── */}
      <Dialog open={aiOpen} onOpenChange={o => { if (!o) closeAI(); }}>
        <DialogContent className={cn(
          "bg-[#0e0e0e] border border-white/10 text-white p-0 max-h-[92vh] overflow-hidden flex flex-col",
          step === "result" ? "sm:max-w-[820px]" : "sm:max-w-[680px]"
        )}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm leading-none">AI Campaign Builder</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {step === "prompt" && "Describe what you need, AI does the rest"}
                  {step === "generating" && "BrandOps is building your campaign…"}
                  {step === "result" && generated?.title}
                </div>
              </div>
            </div>
            <button onClick={closeAI} className="text-muted-foreground hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Prompt step ── */}
          <AnimatePresence mode="wait">
            {step === "prompt" && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col overflow-y-auto"
              >
                <div className="px-6 pt-5 pb-4 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Tell BrandOps what you need</h2>
                    <p className="text-sm text-muted-foreground">
                      Describe your product, budget, audience, and goal. AI turns it into a complete UGC campaign brief.
                    </p>
                  </div>

                  {/* Main prompt */}
                  <div className="relative">
                    <textarea
                      className="w-full min-h-[140px] resize-none rounded-xl bg-white/4 border border-white/12 text-white placeholder:text-white/25 text-sm leading-relaxed px-4 py-3.5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                      placeholder={"Example: I'm launching a skincare brand and need 15 short UGC videos for TikTok and Reels. Budget is $3,000. I want product demos, testimonials, and strong hooks for paid ads."}
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                          generateMutation.mutate();
                        }
                      }}
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-white/20">⌘↵ to generate</div>
                  </div>

                  {/* Quick chips */}
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-2">Quick add</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_CHIPS.map(chip => (
                        <button
                          key={chip}
                          onClick={() => appendChip(chip)}
                          className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/3 text-white/60 hover:text-white hover:border-primary/40 hover:bg-primary/8 transition-all"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Secondary fields */}
                  <div className="flex gap-3 pt-1">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-white/40 text-xs">Total Budget ($) <span className="text-white/25">optional</span></Label>
                      <Input
                        type="number" placeholder="e.g. 5000"
                        value={budget} onChange={e => setBudget(e.target.value)}
                        className="bg-white/4 border-white/10 text-white placeholder:text-white/20 h-9"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-white/40 text-xs">Deadline <span className="text-white/25">optional</span></Label>
                      <Input
                        placeholder="e.g. 2 weeks"
                        value={deadline} onChange={e => setDeadline(e.target.value)}
                        className="bg-white/4 border-white/10 text-white placeholder:text-white/20 h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-5 flex justify-end">
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={!prompt.trim()}
                    className="bg-primary text-black hover:bg-primary/90 font-bold gap-2 px-6"
                  >
                    <Sparkles className="h-4 w-4" /> Generate Campaign
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Generating step ── */}
            {step === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 px-8 gap-8"
              >
                {/* Pulsing orb */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-40" />
                </div>

                {/* Step list */}
                <div className="w-full max-w-xs space-y-3">
                  {GENERATION_STEPS.map((s, i) => (
                    <div key={i} className={cn("flex items-center gap-3 transition-all duration-500",
                      i < genStep ? "opacity-40" : i === genStep ? "opacity-100" : "opacity-20"
                    )}>
                      {i < genStep ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : i === genStep ? (
                        <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-white/20 shrink-0" />
                      )}
                      <span className={cn("text-sm", i === genStep ? "text-white font-medium" : "text-white/50")}>{s}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Result step ── */}
            {step === "result" && generated && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col overflow-y-auto"
              >
                <div className="px-6 pt-5 pb-0 space-y-5 overflow-y-auto flex-1">

                  {/* Campaign title banner */}
                  <div className="rounded-xl border border-primary/25 bg-primary/6 px-5 py-4">
                    <div className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Campaign Title</div>
                    <div className="text-xl font-bold">{generated.title}</div>
                  </div>

                  {/* Two-column grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Left column */}
                    <div className="space-y-5">
                      {/* Summary */}
                      <div>
                        <SectionLabel icon={Target} label="Campaign Summary" />
                        <p className="text-sm text-foreground/80 leading-relaxed">{generated.summary}</p>
                      </div>

                      {/* Creator brief */}
                      <div>
                        <SectionLabel icon={Users} label="Creator Brief" />
                        <div className="p-3.5 rounded-lg bg-white/3 border border-white/6 text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                          {generated.creatorBrief}
                        </div>
                      </div>

                      {/* Do / Don't */}
                      {(generated.doList?.length > 0 || generated.dontList?.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {generated.doList?.length > 0 && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                              <div className="text-xs font-bold text-primary mb-2">✓ DO</div>
                              <BulletList items={generated.doList} color="text-primary" />
                            </div>
                          )}
                          {generated.dontList?.length > 0 && (
                            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                              <div className="text-xs font-bold text-red-400 mb-2">✗ DON'T</div>
                              <BulletList items={generated.dontList} color="text-red-400" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">

                      {/* Payout plan */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <SectionLabel icon={DollarSign} label="Payout Plan" />
                        <p className="text-sm font-semibold text-primary mb-1">{generated.payoutStrategy}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span><span className="text-white font-bold">{generated.suggestedVideoCount}</span> videos</span>
                          <span>·</span>
                          <span><span className="text-white font-bold">${generated.suggestedPayoutPerVideo}</span>/video</span>
                          <span>·</span>
                          <span>est. <span className="text-primary font-bold">${(generated.estimatedTotalCost ?? 0).toLocaleString()}</span></span>
                        </div>
                      </div>

                      {/* Hook ideas */}
                      {generated.hookIdeas?.length > 0 && (
                        <div>
                          <SectionLabel icon={Lightbulb} label="Hook Ideas" />
                          <div className="space-y-1.5">
                            {generated.hookIdeas.map((h, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-primary font-bold shrink-0 text-xs mt-0.5">{i + 1}.</span>
                                <span className="text-foreground/80">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Video concepts */}
                      {generated.videoConceptIdeas?.length > 0 && (
                        <div>
                          <SectionLabel icon={Video} label="Video Concepts" />
                          <BulletList items={generated.videoConceptIdeas} />
                        </div>
                      )}

                      {/* CTA ideas */}
                      {generated.ctaIdeas?.length > 0 && (
                        <div>
                          <SectionLabel icon={Send} label="CTA Ideas" />
                          <TagList items={generated.ctaIdeas} />
                        </div>
                      )}

                      {/* Approval criteria */}
                      {generated.approvalCriteria?.length > 0 && (
                        <div>
                          <SectionLabel icon={ShieldCheck} label="Approval Criteria" />
                          <BulletList items={generated.approvalCriteria} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tone, Deliverables, Rights, Timeline row */}
                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <div className="p-3.5 rounded-lg bg-white/3 border border-white/6">
                      <SectionLabel icon={Star} label="Tone & Style" />
                      <p className="text-xs text-foreground/70 leading-relaxed">{generated.toneAndStyle}</p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-white/3 border border-white/6">
                      <SectionLabel icon={Tag} label="Creator Type" />
                      <p className="text-xs text-foreground/70 leading-relaxed">{generated.creatorType}</p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-white/3 border border-white/6">
                      <SectionLabel icon={Video} label="Deliverables" />
                      <p className="text-xs text-foreground/70 leading-relaxed">{generated.deliverables}</p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-white/3 border border-white/6">
                      <SectionLabel icon={ShieldCheck} label="Usage Rights" />
                      <p className="text-xs text-foreground/70 leading-relaxed">{generated.usageRights}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Suggested deadline: <strong className="text-white">{generated.suggestedDeadline}</strong></span>
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8 shrink-0 bg-[#0e0e0e]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStep("prompt"); setGenerated(null); }}
                    className="gap-1.5 text-muted-foreground hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateFromAI("draft")}
                      disabled={createCampaign.isPending}
                      className="gap-1.5 border-white/10 text-white/70 hover:text-white"
                    >
                      {createCampaign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromAI("active")}
                      disabled={createCampaign.isPending}
                      className="bg-primary text-black hover:bg-primary/90 font-bold gap-1.5"
                    >
                      {createCampaign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Publish Campaign
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
