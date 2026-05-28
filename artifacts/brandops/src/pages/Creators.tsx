import { useListCreators, useCreateCreator, getListCreatorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Search, Plus, UserCircle2 } from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

export default function Creators() {
  const { data: creators, isLoading } = useListCreators();
  const createCreator = useCreateCreator();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMockAddCreator = () => {
    createCreator.mutate({
      data: {
        name: "New Creator",
        email: `test${Math.random()}@example.com`,
        platform: "tiktok",
        handle: "@newcreator",
        niche: "Lifestyle",
        followerCount: 50000,
        engagementRate: 3.5
      }
    }, {
      onSuccess: () => {
        toast({ title: "Mock creator added successfully" });
        queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
      }
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "youtube": return <SiYoutube className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="text-muted-foreground mt-1">Manage your roster of UGC creators.</p>
        </div>
        <Button onClick={handleMockAddCreator} disabled={createCreator.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-creator">
          <Plus className="mr-2 h-4 w-4" />
          Add Creator
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search creators..." 
            className="pl-8 bg-card border-card-border"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-card-border">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl bg-card" />
          ))}
        </div>
      ) : creators && creators.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <Link key={creator.id} href={`/creators/${creator.id}`} data-testid={`card-creator-${creator.id}`}>
              <Card className="bg-card border-card-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {creator.avatarUrl ? (
                        <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{creator.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {getPlatformIcon(creator.platform)}
                        <span className="truncate">{creator.handle}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">{creator.niche}</Badge>
                      <Badge variant="outline" className={creator.status === 'active' ? "text-primary border-primary/30 bg-primary/10" : ""}>
                        {creator.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-4">
                      <div>
                        <div className="text-muted-foreground">Followers</div>
                        <div className="font-medium text-foreground">{(creator.followerCount / 1000).toFixed(1)}k</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Engagement</div>
                        <div className="font-medium text-foreground">{creator.engagementRate}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-xl bg-card/50">
          <UserCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No creators yet</h3>
          <p className="text-muted-foreground mt-2 mb-4">Build your roster to start matching them with campaigns.</p>
        </div>
      )}
    </div>
  );
}