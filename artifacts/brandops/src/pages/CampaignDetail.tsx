import { useRoute, useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  fsGetCampaign, fsUpdateCampaign, fsDeleteCampaign,
  fsSubscribeSubmissions, fsUpdateSubmission,
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
import { Check, X, PlayCircle, ExternalLink, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { useState as useLocalState } from "react";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { getOnboarded as getOnboarding } from "@/lib/onboarding";

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);

  const onboarding = getOnboarding();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [campaign, setCampaign] = useState<FsCampaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [submissions, setSubmissions] = useState<FsSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    fsGetCampaign(id).then(c => { setCampaign(c); setCampaignLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = fsSubscribeSubmissions(
      data => { setSubmissions(data); setSubmissionsLoading(false); },
      [where("campaignId", "==", id)]
    );
    return unsub;
  }, [id]);

  const stats = {
    totalSubmissions: submissions.length,
    approvedSubmissions: submissions.filter(s => s.status === "approved").length,
    pendingSubmissions: submissions.filter(s => s.status === "pending" || s.status === "reviewing").length,
    rejectedSubmissions: submissions.filter(s => s.status === "rejected").length,
    totalSpent: submissions.filter(s => s.status === "approved").reduce((sum, s) => sum + (s.payoutAmount ?? campaign?.payoutPerVideo ?? 0), 0),
  };

  const handlePublish = async () => {
    setActionPending(true);
    try {
      await fsUpdateCampaign(id, { status: "active" });
      setCampaign(prev => prev ? { ...prev, status: "active" } : prev);
      toast({ title: "Campaign published successfully" });
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
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); setActionPending(false); }
  };

  const handleReview = async (submissionId: string, status: "approved" | "rejected" | "revision_requested") => {
    try {
      await fsUpdateSubmission(submissionId, { status });
      toast({ title: `Submission ${status.replace("_", " ")}` });
    } catch { toast({ title: "Failed to update submission", variant: "destructive" }); }
  };

  if (campaignLoading) {
    return <div className="space-y-6"><Skeleton className="h-40 w-full" /></div>;
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  const budgetUsedPercent = campaign.totalBudget > 0 ? (stats.totalSpent / campaign.totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
            <Badge variant={campaign.status === "active" ? "default" : "outline"} className={campaign.status === "active" ? "bg-primary/20 text-primary" : ""}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Due {format(new Date(campaign.deadline), "MMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          {isCreator ? (
            <Button
              onClick={() => setUploadOpen(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
            >
              <Upload className="h-4 w-4" />
              Submit Your Video
            </Button>
          ) : (
            <>
              {campaign.status === "draft" && (
                <Button onClick={handlePublish} disabled={actionPending} data-testid="button-publish-campaign">
                  {actionPending ? "Publishing..." : "Publish"}
                </Button>
              )}
              {campaign.status === "active" && (
                <Button variant="secondary" onClick={handlePause} disabled={actionPending} data-testid="button-pause-campaign">
                  Pause
                </Button>
              )}
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={actionPending} data-testid="button-delete-campaign">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle>Campaign Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.description}</p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Platform</div>
                  <div className="font-medium capitalize">{campaign.platform}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Niche</div>
                  <div className="font-medium">{campaign.niche || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payout per Video</div>
                  <div className="font-medium">${campaign.payoutPerVideo}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Inspiration</div>
                  <div className="font-medium text-primary break-all">{campaign.inspirationUrls || "None provided"}</div>
                </div>
              </div>

              {campaign.aiData?.creatorBrief && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Creator Brief</div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{campaign.aiData.creatorBrief}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="submissions">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="submissions">{isCreator ? "My Submissions" : "Submissions"}</TabsTrigger>
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
                      <div className="sm:w-48 bg-muted relative aspect-video sm:aspect-auto flex items-center justify-center group">
                        {sub.thumbnailUrl ? (
                          <img src={sub.thumbnailUrl} alt="Thumbnail" className="object-cover w-full h-full" />
                        ) : (
                          <PlayCircle className="h-8 w-8 text-muted-foreground" />
                        )}
                        <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 text-white" />
                        </a>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{sub.creatorName || sub.creatorId}</div>
                              <div className="text-sm text-muted-foreground">{sub.creatorEmail}</div>
                            </div>
                            <Badge variant="outline">{sub.status}</Badge>
                          </div>
                          {sub.createdAt && (
                            <div className="text-sm mt-2 text-muted-foreground">
                              Submitted {format(sub.createdAt.toDate(), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>

                        {!isCreator && (sub.status === "reviewing" || sub.status === "pending") && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                            <Button size="sm" onClick={() => handleReview(sub.id!, "approved")} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid={`btn-approve-${sub.id}`}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReview(sub.id!, "revision_requested")} data-testid={`btn-revision-${sub.id}`}>
                              Request Revision
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReview(sub.id!, "rejected")} data-testid={`btn-reject-${sub.id}`}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No submissions yet</div>
              )}
            </TabsContent>
            <TabsContent value="creators">
              <div className="text-center py-8 text-muted-foreground">Creators list coming soon</div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle>Budget & Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Budget Used</span>
                  <span className="font-medium">${stats.totalSpent} / ${campaign.totalBudget}</span>
                </div>
                <Progress value={budgetUsedPercent} className="h-2 bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }} />
                </Progress>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                  <div className="text-xs text-muted-foreground">Total Videos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.approvedSubmissions}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats.pendingSubmissions}</div>
                  <div className="text-xs text-muted-foreground">In Review</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{stats.rejectedSubmissions}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
