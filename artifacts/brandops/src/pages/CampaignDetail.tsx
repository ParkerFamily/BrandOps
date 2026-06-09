import { useRoute, useLocation } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  fsGetCampaign, fsUpdateCampaign, fsDeleteCampaign,
  fsSubscribeSubmissions, fsUpdateSubmission, fsNormalizeCampaignOwnership,
  type FsCampaign, type FsSubmission,
} from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Check, X, PlayCircle, ExternalLink, Trash2, Upload,
  Zap, DollarSign, Clock, TrendingUp, AlertTriangle,
  Lightbulb, ChevronRight, Copy, CheckCheck,
  ArrowRight, Sparkles, RotateCcw, Wand2, Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { VideoPreviewDialog } from "@/components/VideoPreviewDialog";
import { getOnboarded as getOnboarding } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

// ─── AI Coach ─────────────────────────────────────────────────────────────────

interface CoachRec {
  type: "warning" | "tip" | "insight" | "action";
  title: string;
  body: string;
}

const coachIcon = (type: CoachRec["type"]) => {
  switch (type) {
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case "tip":     return <Lightbulb className="h-4 w-4 text-primary" />;
    case "action":  return <Zap className="h-4 w-4 text-blue-400" />;
    default:        return <TrendingUp className="h-4 w-4 text-green-400" />;
  }
};

const coachBg = (type: CoachRec["type"]) => {
  switch (type) {
    case "warning": return "border-yellow-500/20 bg-yellow-500/5";
    case "tip":     return "border-primary/20 bg-primary/5";
    case "action":  return "border-blue-500/20 bg-blue-500/5";
    default:        return "border-green-500/20 bg-green-500/5";
  }
};

// ─── Hook Card ────────────────────────────────────────────────────────────────

function HookCard({ hook }: { hook: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="group relative flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/30 hover:bg-primary/5 transition-all">
      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      <p className="text-sm text-foreground leading-snug flex-1">"{hook}"</p>
      <button
        onClick={copy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
      >
        {copied ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Funnel Step ──────────────────────────────────────────────────────────────

function FunnelStep({ label, value, color, last }: { label: string; value: number | string; color: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 text-center">
        <div className={cn("text-2xl font-bold", color)}>{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
      </div>
      {!last && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user } = useAuth();

  const onboarding = getOnboarding();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [campaign, setCampaign] = useState<FsCampaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [submissions, setSubmissions] = useState<FsSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [previewSub, setPreviewSub] = useState<FsSubmission | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [coachRecs, setCoachRecs] = useState<CoachRec[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const coachFetched = useRef(false);

  useEffect(() => {
    if (!id) return;
    fsGetCampaign(id).then(c => {
      setCampaign(c);
      setCampaignLoading(false);
      if (c && user?.uid && !isCreator) {
        fsNormalizeCampaignOwnership(id, user.uid, c).catch(() => {});
      }
    });
  }, [id, user?.uid, isCreator]);

  useEffect(() => {
    if (!id || !user?.uid) return;
    // Submissions may be stored under either "campaignId" (created via app) or
    // "campaignDocId" (created via mobile/external upload). Run both and merge.
    let byId: FsSubmission[] = [];
    let byDocId: FsSubmission[] = [];

    const merge = (a: FsSubmission[], b: FsSubmission[]) => {
      const combined = [...a, ...b];
      const seen = new Set<string>();
      return combined.filter(s => {
        if (!s.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    };

    const unsubA = fsSubscribeSubmissions(data => {
      byId = data;
      setSubmissions(merge(byId, byDocId));
      setSubmissionsLoading(false);
    }, [where("campaignId", "==", id)]);

    const unsubB = fsSubscribeSubmissions(data => {
      byDocId = data;
      setSubmissions(merge(byId, byDocId));
      setSubmissionsLoading(false);
    }, [where("campaignDocId", "==", id)]);

    return () => { unsubA(); unsubB(); };
  }, [id, user?.uid]);

  const stats = {
    totalSubmissions: submissions.length,
    approvedSubmissions: submissions.filter(s => s.status === "approved" || s.status === "paid").length,
    pendingSubmissions: submissions.filter(s => s.status === "pending").length,
    reviewingSubmissions: submissions.filter(s => s.status === "reviewing").length,
    rejectedSubmissions: submissions.filter(s => s.status === "rejected").length,
    paidSubmissions: submissions.filter(s => s.status === "paid").length,
    totalSpent: submissions
      .filter(s => s.status === "approved" || s.status === "paid")
      .reduce((sum, s) => sum + (s.payoutAmount ?? campaign?.payoutPerVideo ?? 0), 0),
  };

  const fetchCoach = useCallback(async (c: FsCampaign, s: typeof stats) => {
    if (coachFetched.current || isCreator) return;
    coachFetched.current = true;
    setCoachLoading(true);
    try {
      const transcripts = submissions
        .map(sub => sub.subtitlesContent)
        .filter((t): t is string => !!t && t.trim().length > 0);
      const res = await fetch(`${BASE}api/openai/campaign-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: c.title,
          description: c.description,
          platform: c.platform,
          totalBudget: c.totalBudget,
          payoutPerVideo: c.payoutPerVideo,
          videosNeeded: c.videosNeeded,
          deadline: c.deadline,
          niche: c.niche,
          totalSubmissions: s.totalSubmissions,
          approvedSubmissions: s.approvedSubmissions,
          pendingSubmissions: s.pendingSubmissions,
          rejectedSubmissions: s.rejectedSubmissions,
          totalSpent: s.totalSpent,
          hookIdeas: c.aiData?.hookIdeas,
          submissionTranscripts: transcripts,
        }),
      });
      const data = await res.json() as { recommendations?: CoachRec[] };
      setCoachRecs(data.recommendations ?? []);
    } catch { /* silent */ }
    finally { setCoachLoading(false); }
  }, [isCreator]);

  useEffect(() => {
    if (campaign && !submissionsLoading && !coachFetched.current) {
      fetchCoach(campaign, stats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id, submissionsLoading]);

  const handlePublish = async () => {
    setActionPending(true);
    try {
      await fsUpdateCampaign(id, { status: "active" });
      setCampaign(prev => prev ? { ...prev, status: "active" } : prev);
      toast({ title: "Campaign published" });
    } catch { toast({ title: "Failed to publish", variant: "destructive" }); }
    finally { setActionPending(false); }
  };

  const handlePause = async () => {
    setActionPending(true);
    try {
      await fsUpdateCampaign(id, { status: "paused" });
      setCampaign(prev => prev ? { ...prev, status: "paused" } : prev);
      toast({ title: "Campaign paused" });
    } catch { toast({ title: "Failed to pause", variant: "destructive" }); }
    finally { setActionPending(false); }
  };

  const handleDelete = async () => {
    setActionPending(true);
    try {
      await fsDeleteCampaign(id);
      toast({ title: "Campaign deleted" });
      setLocation("/campaigns");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const msg = code === "permission-denied"
        ? "Permission denied — please sign out and back in, then try again."
        : "Failed to delete. Please try again.";
      console.error("[delete campaign]", err);
      toast({ title: msg, variant: "destructive" });
      setActionPending(false);
    }
  };

  const handleReview = async (submissionId: string, status: "approved" | "rejected" | "revision_requested") => {
    try {
      await fsUpdateSubmission(submissionId, { status });
      toast({ title: `Submission ${status.replace("_", " ")}` });
    } catch { toast({ title: "Failed to update submission", variant: "destructive" }); }
  };


  const refetchCoach = () => {
    if (!campaign) return;
    coachFetched.current = false;
    setCoachRecs([]);
    fetchCoach(campaign, stats);
  };

  if (campaignLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!campaign) return <div className="text-muted-foreground py-16 text-center">Campaign not found</div>;

  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86400000));
  const budgetUsedPct = campaign.totalBudget > 0 ? Math.min((stats.totalSpent / campaign.totalBudget) * 100, 100) : 0;
  const budgetRemaining = Math.max(0, campaign.totalBudget - stats.totalSpent);
  const videosRemaining = Math.max(0, campaign.videosNeeded - stats.approvedSubmissions);

  // Pace: compare % videos done vs % time elapsed
  const totalDurationDays = 30; // estimate if no start stored
  const timeElapsedPct = Math.min(100, ((totalDurationDays - daysLeft) / totalDurationDays) * 100);
  const videoPct = campaign.videosNeeded > 0 ? (stats.approvedSubmissions / campaign.videosNeeded) * 100 : 0;
  const isAhead = videoPct >= timeElapsedPct;

  const statusColor = {
    active: "bg-primary/15 text-primary border-primary/30",
    draft:  "bg-muted text-muted-foreground border-border",
    paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/15 text-green-400 border-green-500/30",
    archived: "bg-muted text-muted-foreground border-border",
  }[campaign.status] ?? "bg-muted text-muted-foreground border-border";

  const hookIdeas = campaign.aiData?.hookIdeas ?? [];
  const videoConceptIdeas = campaign.aiData?.videoConceptIdeas ?? [];

  return (
    <div className="space-y-5">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.title}</h1>
            <Badge className={cn("border text-xs font-medium capitalize px-2.5 py-0.5", statusColor)}>
              {campaign.status}
            </Badge>
          </div>
          {/* Quick stat pills — management-focused only */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              ${campaign.totalBudget.toLocaleString()} budget
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              ${campaign.payoutPerVideo}/video
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {campaign.videosNeeded} videos needed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCreator ? (
            <Button onClick={() => setUploadOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]">
              <Upload className="h-4 w-4" /> Submit Your Video
            </Button>
          ) : (
            <>
              {campaign.status === "draft" && (
                <Button onClick={handlePublish} disabled={actionPending} data-testid="button-publish-campaign">
                  {actionPending ? "Publishing…" : "Publish"}
                </Button>
              )}
              {campaign.status === "active" && (
                <Button variant="secondary" onClick={handlePause} disabled={actionPending} data-testid="button-pause-campaign">
                  Pause
                </Button>
              )}
              {campaign.status === "paused" && (
                <Button onClick={handlePublish} disabled={actionPending}>
                  Resume
                </Button>
              )}
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={actionPending} data-testid="button-delete-campaign">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Left col (2/3) */}
        <div className="md:col-span-2 space-y-5">

          {/* Video Pipeline */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Video Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                <FunnelStep label="Applicants" value={stats.pendingSubmissions + stats.reviewingSubmissions + stats.approvedSubmissions} color="text-blue-400" />
                <FunnelStep label="Approved" value={stats.approvedSubmissions} color="text-primary" />
                <FunnelStep label="Videos In" value={stats.totalSubmissions} color="text-yellow-400" />
                <FunnelStep label="Paid" value={stats.paidSubmissions} color="text-green-400" last />
              </div>
            </CardContent>
          </Card>

          {/* AI Campaign Coach */}
          {!isCreator && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Campaign Coach
                  </CardTitle>
                  {!coachLoading && (
                    <button onClick={refetchCoach} className="text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {coachLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : coachRecs.length > 0 ? (
                  <AnimatePresence>
                    {coachRecs.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={cn("rounded-lg border p-3 flex gap-3", coachBg(rec.type))}
                      >
                        <div className="mt-0.5 shrink-0">{coachIcon(rec.type)}</div>
                        <div>
                          <div className="text-sm font-semibold">{rec.title}</div>
                          <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{rec.body}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No recommendations yet — check back as submissions come in.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hook Ideas */}
          {hookIdeas.length > 0 && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Hook Ideas
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border ml-1">
                    {hookIdeas.length} hooks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hookIdeas.map((hook, i) => (
                  <HookCard key={i} hook={hook} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tabs: Submissions | Brief */}
          <Tabs defaultValue="submissions">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="submissions">{isCreator ? "My Submissions" : "Submissions"}</TabsTrigger>
                <TabsTrigger value="brief">Brief</TabsTrigger>
                {!isCreator && <TabsTrigger value="creators">Creators</TabsTrigger>}
              </TabsList>
              {isCreator && (
                <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-3.5 w-3.5" /> Submit Video
                </Button>
              )}
            </div>

            <TabsContent value="submissions" className="mt-4 space-y-4">
              {submissionsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : submissions.length > 0 ? (
                submissions.map(sub => (
                  <Card key={sub.id} className="bg-card border-card-border overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Video area — inline player for direct URLs, thumbnail fallback */}
                      <div className="sm:w-48 bg-black relative aspect-video sm:aspect-auto shrink-0 overflow-hidden">
                        {sub.videoUrl ? (
                          <video
                            src={sub.videoUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                            poster={sub.thumbnailUrl}
                          />
                        ) : sub.thumbnailUrl ? (
                          <img src={sub.thumbnailUrl} alt="Thumbnail" className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {sub.videoUrl && (
                          <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer"
                            className="absolute top-1.5 right-1.5 bg-black/60 rounded p-1 opacity-60 hover:opacity-100 transition-opacity">
                            <ExternalLink className="h-3.5 w-3.5 text-white" />
                          </a>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{sub.creatorName || sub.creatorId}</div>
                            <div className="text-sm text-muted-foreground">{sub.creatorEmail}</div>
                            {sub.createdAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow((sub.createdAt as { toDate: () => Date }).toDate(), { addSuffix: true })}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize">{sub.status.replace("_", " ")}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">

                          {/* Brand review actions */}
                          {!isCreator && (sub.status === "reviewing" || sub.status === "pending") && (
                            <>
                              <Button size="sm" onClick={() => handleReview(sub.id!, "approved")} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid={`btn-approve-${sub.id}`}>
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReview(sub.id!, "revision_requested")} data-testid={`btn-revision-${sub.id}`}>
                                Request Revision
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReview(sub.id!, "rejected")} data-testid={`btn-reject-${sub.id}`}>
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">No submissions yet</div>
              )}
            </TabsContent>

            <TabsContent value="brief" className="mt-4">
              <Card className="bg-card border-card-border">
                <CardContent className="pt-6 space-y-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border text-sm">
                    <div><div className="text-muted-foreground text-xs mb-0.5">Platform</div><div className="font-medium capitalize">{campaign.platform}</div></div>
                    <div><div className="text-muted-foreground text-xs mb-0.5">Niche</div><div className="font-medium">{campaign.niche || "—"}</div></div>
                    <div><div className="text-muted-foreground text-xs mb-0.5">Creator Type</div><div className="font-medium">{campaign.creatorType || "—"}</div></div>
                    <div><div className="text-muted-foreground text-xs mb-0.5">Tone</div><div className="font-medium">{campaign.tone || "—"}</div></div>
                    <div><div className="text-muted-foreground text-xs mb-0.5">Deadline</div><div className="font-medium">{format(new Date(campaign.deadline), "MMM d, yyyy")}</div></div>
                    {campaign.inspirationUrls && (
                      <div><div className="text-muted-foreground text-xs mb-0.5">Inspiration</div>
                        <a href={campaign.inspirationUrls} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-all">{campaign.inspirationUrls}</a>
                      </div>
                    )}
                  </div>

                  {campaign.aiData?.creatorBrief && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Creator Brief</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{campaign.aiData.creatorBrief}</p>
                    </div>
                  )}

                  {campaign.aiData?.approvalCriteria && campaign.aiData.approvalCriteria.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Approval Criteria</div>
                      <ul className="space-y-1.5">
                        {campaign.aiData.approvalCriteria.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creators">
              <div className="text-center py-10 text-muted-foreground">Creator management coming soon</div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right col (1/3) */}
        <div className="space-y-5">

          {/* Budget & Pace */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Budget & Pace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-semibold">${stats.totalSpent.toLocaleString()} <span className="text-muted-foreground font-normal">/ ${campaign.totalBudget.toLocaleString()}</span></span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetUsedPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 border border-border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                  <div className="text-lg font-bold">${budgetRemaining.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Videos Left</div>
                  <div className="text-lg font-bold">{videosRemaining}</div>
                </div>
              </div>

              <div className={cn(
                "rounded-lg border p-3 flex items-center gap-2.5",
                isAhead ? "border-primary/20 bg-primary/5" : "border-yellow-500/20 bg-yellow-500/5"
              )}>
                {isAhead
                  ? <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                }
                <div>
                  <div className={cn("text-sm font-semibold", isAhead ? "text-primary" : "text-yellow-400")}>
                    {isAhead ? "On Track" : "Behind Schedule"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.approvedSubmissions}/{campaign.videosNeeded} videos · {daysLeft}d left
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-border grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Approved</div>
                  <div className="font-bold text-primary">{stats.approvedSubmissions}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">In Review</div>
                  <div className="font-bold text-yellow-400">{stats.reviewingSubmissions + stats.pendingSubmissions}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Rejected</div>
                  <div className="font-bold text-destructive">{stats.rejectedSubmissions}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Paid Out</div>
                  <div className="font-bold text-green-400">{stats.paidSubmissions}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Concepts */}
          {videoConceptIdeas.length > 0 && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Video Concepts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {videoConceptIdeas.map((concept, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground leading-snug">{concept}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {campaign && (
        <SubmitVideoDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          preselectedCampaignId={id}
          preselectedCampaignTitle={campaign.title}
        />
      )}

      {previewSub && (
        <VideoPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          submission={previewSub}
          isBrand={!isCreator}
        />
      )}
    </div>
  );
}
