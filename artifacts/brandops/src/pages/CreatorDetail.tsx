import { useRoute } from "wouter";
import { 
  useGetCreator, getGetCreatorQueryKey,
  useUpdateCreator
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle2, Mail, PlayCircle } from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CreatorDetail() {
  const [, params] = useRoute("/creators/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: creator, isLoading } = useGetCreator(id, { 
    query: { enabled: !!id, queryKey: getGetCreatorQueryKey(id) } 
  });

  const updateCreator = useUpdateCreator();

  const handleToggleStatus = () => {
    if (!creator) return;
    const newStatus = creator.status === "active" ? "suspended" : "active";
    updateCreator.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        toast({ title: `Creator status updated to ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getGetCreatorQueryKey(id) });
      }
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case "tiktok": return <SiTiktok className="h-5 w-5" />;
      case "instagram": return <SiInstagram className="h-5 w-5" />;
      case "youtube": return <SiYoutube className="h-5 w-5" />;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!creator) {
    return <div>Creator not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-card-border overflow-hidden">
        <div className="h-32 bg-muted relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
        </div>
        <CardContent className="relative px-6 pb-6 pt-0 sm:px-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-12 mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold">{creator.name}</h1>
                    <Badge variant={creator.status === "active" ? "default" : "outline"} className={creator.status === "active" ? "bg-primary/20 text-primary" : ""}>
                      {creator.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {getPlatformIcon(creator.platform)}
                      <span className="font-medium">{creator.handle}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>{creator.email}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleToggleStatus}>
                  {creator.status === "active" ? "Suspend Creator" : "Activate Creator"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-border">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Niche</div>
              <div className="font-medium">{creator.niche}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Followers</div>
              <div className="font-medium text-lg text-foreground">{(creator.followerCount / 1000).toFixed(1)}k</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Engagement</div>
              <div className="font-medium text-lg text-primary">{creator.engagementRate}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Earned</div>
              <div className="font-medium text-lg text-foreground">${creator.totalEarnings || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="bg-card border-card-border h-full">
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <PlayCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Creator has no recent submissions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="bg-card border-card-border h-full">
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                   <div className="text-sm font-medium">Approved Videos</div>
                   <div className="font-bold">{creator.approvedVideos || 0}</div>
                 </div>
                 <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                   <div className="text-sm font-medium">Approval Rate</div>
                   <div className="font-bold text-primary">--%</div>
                 </div>
                 <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
                   <div className="text-sm font-medium">Avg. Turnaround</div>
                   <div className="font-bold">-- days</div>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}