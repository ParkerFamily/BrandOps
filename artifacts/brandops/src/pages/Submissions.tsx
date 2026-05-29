import {
  useListSubmissions, useUpdateSubmission, useGetSubmission,
  getGetSubmissionQueryKey, getListSubmissionsQueryKey, ListSubmissionsStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Check, X, PlayCircle, ExternalLink, Inbox, Eye, Sparkles, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";

const ONBOARDING_KEY = "brandops_onboarded";
function getOnboarding() {
  try { const r = localStorage.getItem(ONBOARDING_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

const BASE = import.meta.env.BASE_URL;

interface AIReview {
  hookStrength: number;
  brandFit: number;
  clarity: number;
  ugcAuthenticity: number;
  conversionPotential: number;
  overallScore: number;
  aiNotes: string;
  recommendation: "approve" | "revise" | "reject";
  strengths: string[];
  improvements: string[];
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "bg-primary" : value >= 6 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-muted-foreground shrink-0">{label}</div>
      <Progress value={value * 10} className={cn("h-1.5 flex-1 bg-muted", `[&>div]:${color}`)} />
      <div className="w-5 text-xs font-bold text-right shrink-0">{value}</div>
    </div>
  );
}

function AIScoreCard({ submissionId, campaignTitle, creatorName, creatorNiche, campaignDescription }: {
  submissionId: number;
  campaignTitle?: string;
  creatorName?: string;
  creatorNiche?: string;
  campaignDescription?: string;
}) {
  const [review, setReview] = useState<AIReview | null>(null);
  const [expanded, setExpanded] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}api/openai/submission-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, campaignTitle, creatorName, creatorNiche, campaignDescription }),
      });
      if (!r.ok) throw new Error("Review failed");
      return r.json() as Promise<AIReview>;
    },
    onSuccess: (d) => { setReview(d); setExpanded(true); },
  });

  const recColor = (rec?: string) => {
    if (rec === "approve") return "text-primary border-primary/30 bg-primary/10";
    if (rec === "reject") return "text-red-400 border-red-400/30 bg-red-400/10";
    return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
  };

  if (!review && !reviewMutation.isPending) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => reviewMutation.mutate()}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Sparkles className="h-3.5 w-3.5" /> AI Review
      </Button>
    );
  }

  if (reviewMutation.isPending) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Analyzing with AI…</span>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div className="mt-4 border border-primary/15 rounded-xl bg-primary/3 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Score</span>
          </div>
          <div className={cn("text-xs border px-2 py-0.5 rounded-full font-medium", recColor(review.recommendation))}>
            {review.recommendation === "approve" ? "Approve" : review.recommendation === "reject" ? "Reject" : "Revise"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "text-2xl font-black",
            review.overallScore >= 75 ? "text-primary" : review.overallScore >= 55 ? "text-yellow-400" : "text-red-400"
          )}>
            {review.overallScore}
          </div>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-primary/10">
          <div className="pt-3 space-y-2">
            <ScoreBar label="Hook Strength" value={review.hookStrength} />
            <ScoreBar label="Brand Fit" value={review.brandFit} />
            <ScoreBar label="Clarity" value={review.clarity} />
            <ScoreBar label="UGC Authenticity" value={review.ugcAuthenticity} />
            <ScoreBar label="Conversion" value={review.conversionPotential} />
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed">
            {review.aiNotes}
          </div>

          {(review.strengths?.length > 0 || review.improvements?.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {review.strengths?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                  <div className="text-[10px] font-semibold text-primary mb-1.5">STRENGTHS</div>
                  {review.strengths.map((s, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground flex gap-1 mb-1">
                      <span className="text-primary shrink-0">✓</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {review.improvements?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
                  <div className="text-[10px] font-semibold text-yellow-400 mb-1.5">IMPROVE</div>
                  {review.improvements.map((s, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground flex gap-1 mb-1">
                      <span className="text-yellow-400 shrink-0">→</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Submissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListSubmissionsStatus | "all">("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const onboarding = getOnboarding();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const { data: submissions, isLoading } = useListSubmissions(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  const updateSubmission = useUpdateSubmission();

  const { data: selectedSubmission, isLoading: selectedLoading } = useGetSubmission(selectedSubmissionId ?? 0, {
    query: { enabled: !!selectedSubmissionId, queryKey: getGetSubmissionQueryKey(selectedSubmissionId ?? 0) }
  });

  const handleReview = (id: number, status: "approved" | "rejected" | "revision_requested") => {
    updateSubmission.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Submission ${status.replace("_", " ")}` });
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
        if (selectedSubmissionId === id) queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(id) });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-primary/20 text-primary border-primary/30">Approved</Badge>;
      case "pending":
      case "reviewing": return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Reviewing</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "revision_requested": return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Revision Needed</Badge>;
      case "paid": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isCreator ? "My Submissions" : "Review Queue"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCreator
              ? "Track the status of videos you've submitted to brand campaigns."
              : "Review and approve UGC submissions — use AI scoring to decide faster."}
          </p>
        </div>
        {isCreator && (
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
          >
            <Upload className="h-4 w-4" />
            Upload Video
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(val: ListSubmissionsStatus | "all") => setStatusFilter(val)}>
          <SelectTrigger className="w-[180px] bg-card border-card-border" data-testid="select-submission-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submissions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="revision_requested">Revision Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl bg-card" />)}
        </div>
      ) : submissions && submissions.length > 0 ? (
        <div className="grid gap-4">
          {submissions.map(sub => (
            <Card key={sub.id} className="bg-card border-card-border overflow-hidden" data-testid={`card-submission-${sub.id}`}>
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail */}
                <div className="md:w-56 bg-muted relative aspect-video md:aspect-auto flex items-center justify-center group shrink-0">
                  {sub.thumbnailUrl ? (
                    <img src={sub.thumbnailUrl} alt="Thumbnail" className="object-cover w-full h-full" />
                  ) : (
                    <PlayCircle className="h-10 w-10 text-muted-foreground" />
                  )}
                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <ExternalLink className="h-7 w-7 text-white" />
                  </a>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-semibold text-lg leading-snug">
                          {sub.campaign?.title ?? `Campaign #${sub.campaignId}`}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          by <span className="font-medium text-foreground">{sub.creator?.name ?? `Creator #${sub.creatorId}`}</span>
                          {sub.creator?.niche && <span className="text-muted-foreground"> · {sub.creator.niche}</span>}
                        </div>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Submitted {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </div>

                    {/* AI Score Card */}
                    <AIScoreCard
                      submissionId={sub.id}
                      campaignTitle={sub.campaign?.title}
                      creatorName={sub.creator?.name}
                      creatorNiche={sub.creator?.niche}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedSubmissionId(sub.id)}>
                      <Eye className="h-4 w-4 mr-1.5" /> Details
                    </Button>
                    {(sub.status === "pending" || sub.status === "reviewing") && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleReview(sub.id, "approved")}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          data-testid={`btn-approve-${sub.id}`}
                        >
                          <Check className="h-4 w-4 mr-1.5" /> Approve
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleReview(sub.id, "revision_requested")}
                          data-testid={`btn-revision-${sub.id}`}
                        >
                          Request Revision
                        </Button>
                        <Button
                          size="sm" variant="destructive"
                          onClick={() => handleReview(sub.id, "rejected")}
                          data-testid={`btn-reject-${sub.id}`}
                        >
                          <X className="h-4 w-4 mr-1.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed rounded-xl bg-card/50">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-medium">Inbox zero</h3>
          <p className="text-muted-foreground mt-2">No submissions found matching your filters.</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmissionId} onOpenChange={(open) => !open && setSelectedSubmissionId(null)}>
        <DialogContent className="sm:max-w-[600px] bg-card border-card-border text-card-foreground">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : selectedSubmission ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Campaign</div>
                    <div className="font-semibold text-lg">{selectedSubmission.campaign?.title}</div>
                  </div>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-b border-border py-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Creator</div>
                    <div>{selectedSubmission.creator?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Submitted At</div>
                    <div>{format(new Date(selectedSubmission.createdAt), "MMM d, yyyy h:mm a")}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Video Link</div>
                    <a href={selectedSubmission.videoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      View Video <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {selectedSubmission.payoutAmount && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Payout Amount</div>
                      <div>${selectedSubmission.payoutAmount}</div>
                    </div>
                  )}
                </div>
                {selectedSubmission.notes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                    <div className="p-3 bg-muted rounded-md text-sm">{selectedSubmission.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div>Submission not found</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Creator upload dialog */}
      <SubmitVideoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
