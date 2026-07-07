import { useState, useMemo, useEffect } from "react";
import {
  fsSubscribeCampaigns, fsBootstrapUserCampaigns,
  type FsCampaign,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Megaphone, Plus, Search, Sparkles, Wand2,
  ChevronRight, Upload,
  CalendarDays, ExternalLink, PlayCircle, Video,
  Users, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { getOnboarded } from "@/lib/onboarding";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";

const BASE = import.meta.env.BASE_URL;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CREATOR VIEW — browse available (active) campaigns                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function CreatorCampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<FsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = fsSubscribeCampaigns((data) => {
      setCampaigns(data);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const available = useMemo(() =>
    campaigns
      .filter(c => c.status === "active")
      .filter(c =>
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.niche.toLowerCase().includes(search.toLowerCase()) ||
        c.platform.toLowerCase().includes(search.toLowerCase())
      ),
    [campaigns, search]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Open briefs you can submit videos to. Pick your best fit and upload your take.
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
        >
          <Upload className="h-4 w-4" /> Submit a Video
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, niche, platform…"
          className="pl-9 bg-card border-card-border"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stats pill */}
      {!isLoading && available.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span><span className="text-white font-semibold">{available.length}</span> open campaign{available.length !== 1 ? "s" : ""} right now</span>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl bg-card" />)}
        </div>
      ) : available.length > 0 ? (
        <div className="grid gap-4">
          {available.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <Link href={`/campaigns/${campaign.id}`}>
                <Card className="bg-card border-card-border hover:border-primary/50 transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                            {campaign.title}
                          </h3>
                          <Badge className="bg-primary/15 text-primary border-primary/25 text-xs shrink-0">Open</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {campaign.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 capitalize">
                            <PlayCircle className="h-3 w-3" /> {campaign.platform}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {campaign.videosNeeded} videos needed
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> Due {format(new Date(campaign.deadline), "MMM d, yyyy")}
                          </span>
                          {campaign.niche && (
                            <span className="bg-white/5 border border-white/8 rounded px-1.5 py-0.5">{campaign.niche}</span>
                          )}
                        </div>
                      </div>

                      {/* Payout + CTA */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black text-primary leading-none">
                            ${Number(campaign.payoutPerVideo).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">per video</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View brief <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    {/* Brief preview */}
                    {campaign.aiData?.creatorBrief && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Brief preview</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {campaign.aiData.creatorBrief}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed rounded-xl bg-card/50">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-6 w-6 text-muted-foreground opacity-40" />
          </div>
          <h3 className="text-lg font-medium">
            {search ? "No campaigns match your search" : "No open campaigns right now"}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
            {search
              ? "Try a different search term."
              : "Check back soon — brands post new campaigns regularly."}
          </p>
          {search && (
            <Button variant="ghost" className="mt-4 text-sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      )}

      <SubmitVideoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  BRAND VIEW — full campaign management + AI builder                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<FsCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = fsSubscribeCampaigns((data) => {
      setCampaigns(data);
      setIsLoading(false);
    }, user.uid);
    return unsub;
  }, [user?.uid]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    campaigns.filter(c =>
      !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.niche.toLowerCase().includes(search.toLowerCase())
    ), [campaigns, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":    return <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>;
      case "draft":     return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
      case "paused":    return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Paused</Badge>;
      case "completed": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Completed</Badge>;
      case "archived":  return <Badge variant="outline" className="opacity-50">Archived</Badge>;
      default:          return <Badge variant="outline">{status}</Badge>;
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
          <Button onClick={() => navigate('/campaigns/new')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" data-testid="button-ai-campaign">
            <Sparkles className="h-4 w-4" /> Create with AI
          </Button>
          <Link href="/campaigns/new">
            <Button variant="outline" className="gap-2" data-testid="button-create-campaign">
              <Plus className="h-4 w-4" /> Manual
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-transparent p-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Wand2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI Campaign Builder</p>
          <p className="text-xs text-muted-foreground">Describe your product and goal in plain English — AI writes the full campaign brief.</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0" onClick={() => navigate('/campaigns/new')}>
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
                      <div className="font-medium text-foreground">{campaign.videosNeeded ?? 0}</div>
                      <div className="text-muted-foreground">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-primary">${campaign.totalBudget.toLocaleString()}</div>
                      <div className="text-muted-foreground">Budget</div>
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
              <Button onClick={() => navigate('/campaigns/new')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Sparkles className="h-4 w-4" /> Create with AI
              </Button>
              <Link href="/campaigns/new"><Button variant="outline">Manual Setup</Button></Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ROOT — route to correct view based on account type                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function Campaigns() {
  const onboarding = getOnboarded();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";
  return isCreator ? <CreatorCampaignsPage /> : <BrandCampaignsPage />;
}

