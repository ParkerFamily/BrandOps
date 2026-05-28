import { useRoute } from "wouter";
import { 
  useGetCampaign, getGetCampaignQueryKey,
  useGetCampaignStats,
  usePublishCampaign,
  useDeleteCampaign,
  useListSubmissions,
  useUpdateSubmission,
  useUpdateCampaign,
  useCreateSubmission,
  getListSubmissionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, X, PlayCircle, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: campaign, isLoading: campaignLoading } = useGetCampaign(id, { 
    query: { enabled: !!id, queryKey: getGetCampaignQueryKey(id) } 
  });
  
  const { data: stats, isLoading: statsLoading } = useGetCampaignStats(id, {
    query: { enabled: !!id }
  });

  const { data: submissions, isLoading: submissionsLoading } = useListSubmissions({ campaignId: id }, {
    query: { enabled: !!id }
  });

  const publishCampaign = usePublishCampaign();
  const deleteCampaign = useDeleteCampaign();
  const updateSubmission = useUpdateSubmission();
  const updateCampaign = useUpdateCampaign();
  const createSubmission = useCreateSubmission();

  const handlePublish = () => {
    publishCampaign.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Campaign published successfully" });
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      }
    });
  };

  const handlePause = () => {
    updateCampaign.mutate({ id, data: { status: "paused" } }, {
      onSuccess: () => {
        toast({ title: "Campaign paused" });
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      }
    });
  };

  const handleDelete = () => {
    deleteCampaign.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Campaign deleted" });
        setLocation("/campaigns");
      }
    });
  };

  const handleCreateMockSubmission = () => {
    createSubmission.mutate({
      data: {
        campaignId: id,
        creatorId: 1,
        videoUrl: "https://example.com/video",
      }
    }, {
      onSuccess: () => {
        toast({ title: "Mock submission created" });
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey({ campaignId: id }) });
      }
    });
  };

  const handleReview = (submissionId: number, status: "approved" | "rejected" | "revision_requested") => {
    updateSubmission.mutate({ 
      id: submissionId, 
      data: { status } 
    }, {
      onSuccess: () => {
        toast({ title: `Submission ${status}` });
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey({ campaignId: id }) });
      }
    });
  };

  if (campaignLoading) {
    return <div className="space-y-6"><Skeleton className="h-40 w-full" /></div>;
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  const budgetUsedPercent = stats ? (stats.totalSpent / campaign.totalBudget) * 100 : 0;

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
          {campaign.status === "draft" && (
            <Button onClick={handlePublish} disabled={publishCampaign.isPending} data-testid="button-publish-campaign">
              {publishCampaign.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
          {campaign.status === "active" && (
            <Button variant="secondary" onClick={handlePause} disabled={updateCampaign.isPending} data-testid="button-pause-campaign">
              Pause
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleteCampaign.isPending} data-testid="button-delete-campaign">
            <Trash2 className="h-4 w-4" />
          </Button>
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
                  <div className="font-medium">{campaign.niche}</div>
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
            </CardContent>
          </Card>

          <Tabs defaultValue="submissions">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="creators">Creators</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={handleCreateMockSubmission}>Add Mock Submission</Button>
            </div>
            
            <TabsContent value="submissions" className="mt-4 space-y-4">
              {submissionsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : submissions && submissions.length > 0 ? (
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
                              <div className="font-medium">{sub.creator?.name || `Creator #${sub.creatorId}`}</div>
                              <div className="text-sm text-muted-foreground">{sub.creator?.handle}</div>
                            </div>
                            <Badge variant="outline">{sub.status}</Badge>
                          </div>
                          <div className="text-sm mt-2 text-muted-foreground">Submitted {format(new Date(sub.createdAt), "MMM d, yyyy")}</div>
                        </div>
                        
                        {sub.status === "reviewing" || sub.status === "pending" ? (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                            <Button size="sm" onClick={() => handleReview(sub.id, "approved")} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid={`btn-approve-${sub.id}`}>
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReview(sub.id, "revision_requested")} data-testid={`btn-revision-${sub.id}`}>
                              Request Revision
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReview(sub.id, "rejected")} data-testid={`btn-reject-${sub.id}`}>
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : null}
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
                  <span className="font-medium">${stats?.totalSpent || 0} / ${campaign.totalBudget}</span>
                </div>
                <Progress value={budgetUsedPercent} className="h-2 bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }} />
                </Progress>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <div className="text-2xl font-bold">{stats?.totalSubmissions || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Videos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats?.approvedSubmissions || 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats?.pendingSubmissions || 0}</div>
                  <div className="text-xs text-muted-foreground">In Review</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{stats?.rejectedSubmissions || 0}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}