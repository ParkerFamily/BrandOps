import { useListCampaigns } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Megaphone, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns();

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "youtube": return <SiYoutube className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
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
        <Link href="/campaigns/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" data-testid="button-create-campaign">
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Link>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search campaigns..." 
            className="pl-8 bg-card border-card-border"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
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
                      <div className="font-medium text-foreground">{campaign.creatorCount || 0}</div>
                      <div className="text-muted-foreground">Creators</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-foreground">{campaign.approvedCount || 0}</div>
                      <div className="text-muted-foreground">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-primary">${(campaign.totalSpent || 0).toLocaleString()}</div>
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
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No campaigns yet</h3>
          <p className="text-muted-foreground mt-2 mb-4">Get started by creating your first UGC campaign.</p>
          <Link href="/campaigns/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Create Campaign
          </Link>
        </div>
      )}
    </div>
  );
}