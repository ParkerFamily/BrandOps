import { useListCampaigns, useCreateCampaign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Megaphone, Plus, Search, Sparkles, Loader2, ChevronRight, Wand2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

interface AIBuilderForm {
  productName: string;
  goal: string;
  budget: string;
  payoutPerVideo: string;
  creatorType: string;
  platforms: string;
  tone: string;
  notes: string;
}

interface GeneratedCampaign {
  title: string;
  description: string;
  creatorInstructions: string;
  hookIdeas: string[];
  deliverables: string;
  usageRights: string;
  suggestedDeadline: string;
  suggestedVideoCount: number;
  toneGuidance: string;
  doList: string[];
  dontList: string[];
}

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [generated, setGenerated] = useState<GeneratedCampaign | null>(null);

  const [form, setForm] = useState<AIBuilderForm>({
    productName: "", goal: "", budget: "", payoutPerVideo: "",
    creatorType: "", platforms: "TikTok, Instagram", tone: "authentic, relatable", notes: "",
  });

  const generateMutation = useMutation({
    mutationFn: async (data: AIBuilderForm) => {
      const r = await fetch(`${BASE}api/openai/campaign-builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: data.productName,
          goal: data.goal,
          budget: Number(data.budget),
          payoutPerVideo: Number(data.payoutPerVideo),
          creatorType: data.creatorType,
          platforms: data.platforms,
          tone: data.tone,
          notes: data.notes,
        }),
      });
      if (!r.ok) throw new Error("Generation failed");
      return r.json() as Promise<GeneratedCampaign>;
    },
    onSuccess: (data) => { setGenerated(data); setStep("result"); },
    onError: () => toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" }),
  });

  const handleGenerate = () => {
    if (!form.productName || !form.goal || !form.budget) {
      toast({ title: "Missing fields", description: "Product name, goal, and budget are required.", variant: "destructive" });
      return;
    }
    generateMutation.mutate(form);
  };

  const handleCreateFromAI = () => {
    if (!generated) return;
    createCampaign.mutate({
      data: {
        title: generated.title,
        description: generated.description,
        platform: "tiktok",
        niche: form.creatorType || "lifestyle",
        totalBudget: Number(form.budget),
        payoutPerVideo: Number(form.payoutPerVideo) || 100,
        deadline: generated.suggestedDeadline || "30 days",
      }
    }, {
      onSuccess: (campaign) => {
        toast({ title: "Campaign created!", description: "Your AI campaign is ready in drafts." });
        setAiOpen(false);
        setStep("form");
        setGenerated(null);
        queryClient.invalidateQueries({ queryKey: ["listCampaigns"] });
        navigate(`/campaigns/${campaign.id}`);
      },
      onError: () => toast({ title: "Failed to create campaign", variant: "destructive" }),
    });
  };

  const filtered = useMemo(() =>
    (campaigns ?? []).filter(c =>
      !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.niche.toLowerCase().includes(search.toLowerCase())
    ), [campaigns, search]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "youtube": return <SiYoutube className="h-4 w-4" />;
      default: return null;
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your active and past creator campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setStep("form"); setGenerated(null); setAiOpen(true); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            data-testid="button-ai-campaign"
          >
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
          <p className="text-xs text-muted-foreground">Describe your product and goal — AI writes the full brief in seconds.</p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
          onClick={() => { setStep("form"); setGenerated(null); setAiOpen(true); }}
        >
          Launch <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-8 bg-card border-card-border"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />)}
        </div>
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getPlatformIcon(campaign.platform)}
                        <span className="capitalize">{campaign.platform}</span>
                      </span>
                      <span>•</span>
                      <span>{campaign.niche}</span>
                      <span>•</span>
                      <span>Budget: ${campaign.totalBudget.toLocaleString()}</span>
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
          <p className="text-muted-foreground mt-2 mb-6">
            {search ? "Try a different search term." : "Launch your first UGC campaign in seconds with AI."}
          </p>
          {!search && (
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => { setStep("form"); setGenerated(null); setAiOpen(true); }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Sparkles className="h-4 w-4" /> Create with AI
              </Button>
              <Link href="/campaigns/new">
                <Button variant="outline">Manual Setup</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* AI Campaign Builder Modal */}
      <Dialog open={aiOpen} onOpenChange={(o) => { if (!o) { setAiOpen(false); } }}>
        <DialogContent className="sm:max-w-[680px] bg-card border-card-border text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {step === "form" ? "AI Campaign Builder" : "Your AI Campaign Brief"}
            </DialogTitle>
            <DialogDescription>
              {step === "form"
                ? "Fill in the details and AI will generate a complete campaign brief for you."
                : "Review the AI-generated campaign. Edit after creation if needed."}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Product / App Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. FitTrack Pro"
                    value={form.productName}
                    onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Campaign Goal <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Drive app installs and brand awareness among fitness enthusiasts"
                    value={form.goal}
                    onChange={e => setForm(p => ({ ...p, goal: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Budget ($) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number" placeholder="5000"
                    value={form.budget}
                    onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payout Per Approved Video ($)</Label>
                  <Input
                    type="number" placeholder="150"
                    value={form.payoutPerVideo}
                    onChange={e => setForm(p => ({ ...p, payoutPerVideo: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Target Creator Type</Label>
                  <Input
                    placeholder="e.g. fitness micro-influencers 10k-100k"
                    value={form.creatorType}
                    onChange={e => setForm(p => ({ ...p, creatorType: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Platforms</Label>
                  <Input
                    placeholder="TikTok, Instagram Reels"
                    value={form.platforms}
                    onChange={e => setForm(p => ({ ...p, platforms: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Tone / Style</Label>
                  <Input
                    placeholder="e.g. authentic, relatable, high-energy"
                    value={form.tone}
                    onChange={e => setForm(p => ({ ...p, tone: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Example Links or Extra Notes</Label>
                  <Textarea
                    placeholder="Any example videos, competitor content, or specific requirements..."
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setAiOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 min-w-[140px]"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Generate Brief</>
                  )}
                </Button>
              </div>
            </div>
          ) : generated ? (
            <div className="space-y-5 pt-2">
              {/* Title */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Campaign Title</div>
                <div className="text-xl font-bold">{generated.title}</div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</div>
                <p className="text-sm leading-relaxed">{generated.description}</p>
              </div>

              {/* Hook Ideas */}
              {generated.hookIdeas?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video Hook Ideas</div>
                  <div className="space-y-1.5">
                    {generated.hookIdeas.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Creator Instructions */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creator Instructions</div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm whitespace-pre-line leading-relaxed">
                  {generated.creatorInstructions}
                </div>
              </div>

              {/* Do / Don't */}
              {(generated.doList?.length > 0 || generated.dontList?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {generated.doList?.length > 0 && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                      <div className="text-xs font-semibold text-primary mb-2">✓ DO</div>
                      {generated.doList.map((d, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1">
                          <span className="text-primary mt-0.5">•</span>{d}
                        </div>
                      ))}
                    </div>
                  )}
                  {generated.dontList?.length > 0 && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/15">
                      <div className="text-xs font-semibold text-destructive mb-2">✗ DON'T</div>
                      {generated.dontList.map((d, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1">
                          <span className="text-destructive mt-0.5">•</span>{d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Deliverables + Rights */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Deliverables</div>
                  <p className="text-xs leading-relaxed">{generated.deliverables}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Usage Rights</div>
                  <p className="text-xs leading-relaxed">{generated.usageRights}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <span>Suggested deadline: <strong className="text-foreground">{generated.suggestedDeadline}</strong></span>
                <span>•</span>
                <span>Target videos: <strong className="text-foreground">{generated.suggestedVideoCount}</strong></span>
                {form.payoutPerVideo && (
                  <>
                    <span>•</span>
                    <span>Est. total: <strong className="text-primary">${(generated.suggestedVideoCount * Number(form.payoutPerVideo)).toLocaleString()}</strong></span>
                  </>
                )}
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep("form")} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Re-generate
                </Button>
                <Button
                  onClick={handleCreateFromAI}
                  disabled={createCampaign.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  {createCampaign.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Create This Campaign</>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
