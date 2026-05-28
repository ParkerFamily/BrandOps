import { useListSubmissions, useUpdateSubmission, useGetSubmission, getGetSubmissionQueryKey, getListSubmissionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X, PlayCircle, ExternalLink, Inbox, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { ListSubmissionsStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Submissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListSubmissionsStatus | "all">("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);

  const { data: submissions, isLoading } = useListSubmissions(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  const updateSubmission = useUpdateSubmission();
  
  const { data: selectedSubmission, isLoading: selectedLoading } = useGetSubmission(selectedSubmissionId || 0, {
    query: { enabled: !!selectedSubmissionId, queryKey: getGetSubmissionQueryKey(selectedSubmissionId || 0) }
  });

  const handleReview = (id: number, status: "approved" | "rejected" | "revision_requested") => {
    updateSubmission.mutate({ 
      id, 
      data: { status } 
    }, {
      onSuccess: () => {
        toast({ title: `Submission ${status}` });
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
        if (selectedSubmissionId === id) {
          queryClient.invalidateQueries({ queryKey: getGetSubmissionQueryKey(id) });
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
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
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground mt-1">Review and approve UGC submissions from creators.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
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
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl bg-card" />
          ))}
        </div>
      ) : submissions && submissions.length > 0 ? (
        <div className="grid gap-4">
          {submissions.map(sub => (
            <Card key={sub.id} className="bg-card border-card-border overflow-hidden" data-testid={`card-submission-${sub.id}`}>
              <div className="flex flex-col md:flex-row">
                <div className="md:w-64 bg-muted relative aspect-video md:aspect-auto flex items-center justify-center group shrink-0">
                  {sub.thumbnailUrl ? (
                    <img src={sub.thumbnailUrl} alt="Thumbnail" className="object-cover w-full h-full" />
                  ) : (
                    <PlayCircle className="h-10 w-10 text-muted-foreground" />
                  )}
                  <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-white" />
                  </a>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{sub.campaign?.title || `Campaign #${sub.campaignId}`}</h3>
                        <div className="text-sm text-muted-foreground">
                          by <span className="font-medium text-foreground">{sub.creator?.name || `Creator #${sub.creatorId}`}</span>
                        </div>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-4">
                      Submitted on {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedSubmissionId(sub.id)}>
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </Button>
                    {(sub.status === "pending" || sub.status === "reviewing") && (
                      <>
                        <Button size="sm" onClick={() => handleReview(sub.id, "approved")} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid={`btn-approve-${sub.id}`}>
                          <Check className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReview(sub.id, "revision_requested")} data-testid={`btn-revision-${sub.id}`}>
                          Request Revision
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReview(sub.id, "rejected")} data-testid={`btn-reject-${sub.id}`}>
                          <X className="h-4 w-4 mr-2" /> Reject
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
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Inbox zero</h3>
          <p className="text-muted-foreground mt-2">No submissions found matching your filters.</p>
        </div>
      )}

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
    </div>
  );
}