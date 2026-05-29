import { useGetDashboardStats, useGetRecentActivity, useListCampaigns, useListPayments, useListSubmissions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, Megaphone, CheckCircle2, Clock, Plus, Sparkles,
  TrendingUp, AlertTriangle, Lightbulb, Star, ArrowRight, Zap,
  PlayCircle, Users, ChevronRight, Upload, Video, Inbox, Wallet,
  CalendarDays, ExternalLink
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getOnboarded } from "@/lib/onboarding";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL;

interface DashboardInsight {
  icon: "trending_up" | "warning" | "tip" | "star";
  title: string;
  body: string;
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!target || started.current) return;
    started.current = true;
    const steps = 40;
    const inc = target / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.round(cur));
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

function AnimatedStatCard({ title, rawValue, icon: Icon, color, description, prefix = "" }: {
  title: string; rawValue: number; icon: React.ElementType; color: string; description?: string; prefix?: string;
}) {
  const displayVal = useCountUp(rawValue);
  return (
    <Card className="bg-card border-card-border relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{prefix}{displayVal.toLocaleString()}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function InsightIcon({ type }: { type: string }) {
  switch (type) {
    case "trending_up": return <TrendingUp className="h-4 w-4 text-primary" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case "tip": return <Lightbulb className="h-4 w-4 text-blue-400" />;
    case "star": return <Star className="h-4 w-4 text-purple-400" />;
    default: return <Sparkles className="h-4 w-4 text-primary" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "approved": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Approved</Badge>;
    case "pending": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Pending</Badge>;
    case "reviewing": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">In Review</Badge>;
    case "rejected": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Rejected</Badge>;
    case "revision_requested": return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Revision</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

/* ─────────────────────────── CREATOR DASHBOARD ─────────────────────────── */

interface CreatorEarnings {
  totalEarned: number;
  pendingAmount: number;
  payments: Array<{
    stripeId: string | null;
    amount: number;
    currency: string;
    stripeStatus: string;
    campaignTitle: string | null;
    dbStatus: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
}

function CreatorDashboard() {
  const { user } = useAuth();
  const { data: campaigns, isLoading: campaignsLoading } = useListCampaigns();
  const { data: submissions, isLoading: submissionsLoading } = useListSubmissions({});
  const [, navigate] = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);

  // Real Stripe + DB earnings for this creator, keyed by their Firebase email
  const { data: earningsData, isLoading: earningsLoading } = useQuery<CreatorEarnings>({
    queryKey: ["creator-earnings", user?.email],
    queryFn: async () => {
      if (!user?.email) return { totalEarned: 0, pendingAmount: 0, payments: [] };
      const res = await fetch(`${BASE}api/stripe/creator-earnings?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) return { totalEarned: 0, pendingAmount: 0, payments: [] };
      return res.json() as Promise<CreatorEarnings>;
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  const activeCampaigns = campaigns?.filter(c => c.status === "active") ?? [];
  const mySubmissions = submissions ?? [];
  const approvedCount = mySubmissions.filter(s => s.status === "approved").length;
  const pendingCount = mySubmissions.filter(s => s.status === "pending" || s.status === "reviewing").length;
  const totalEarned = earningsData?.totalEarned ?? 0;
  const realPayments = earningsData?.payments ?? [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Hub</h1>
          <p className="text-muted-foreground mt-1">Your campaigns, submissions, and earnings — all in one place.</p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
        >
          <Upload className="h-4 w-4" /> Submit a Video
        </Button>
      </div>

      {/* CTA Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-6">
        <div className="absolute -right-8 -top-8 w-48 h-48 opacity-[0.04]">
          <Video className="w-full h-full" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                {activeCampaigns.length} Active Campaign{activeCampaigns.length !== 1 ? "s" : ""} Available
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Open</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Browse open briefs, pick your best fit, and submit your video to earn.
              </p>
            </div>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0"
            onClick={() => navigate("/campaigns")}
          >
            Browse Campaigns <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedStatCard
          title="Total Earned"
          rawValue={totalEarned}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          description="From approved videos"
          prefix="$"
        />
        <AnimatedStatCard
          title="Open Campaigns"
          rawValue={activeCampaigns.length}
          icon={Megaphone}
          color="bg-blue-500/10 text-blue-400"
          description="Available to submit"
        />
        <AnimatedStatCard
          title="Pending Review"
          rawValue={pendingCount}
          icon={Clock}
          color="bg-yellow-500/10 text-yellow-400"
          description="Awaiting brand approval"
        />
        <AnimatedStatCard
          title="Approved Videos"
          rawValue={approvedCount}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-400"
          description="Ready to publish"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left / main */}
        <div className="lg:col-span-2 space-y-6">

          {/* Available Campaigns */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  Available Campaigns
                </CardTitle>
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    View all <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaignsLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
              ) : activeCampaigns.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No open campaigns right now. Check back soon.
                </div>
              ) : activeCampaigns.slice(0, 4).map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`}>
                  <div className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">{c.title}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{c.platform}</span>
                          <span>·</span>
                          <span>{c.niche}</span>
                          <span>·</span>
                          <CalendarDays className="h-3 w-3 inline" /> Due {format(new Date(c.deadline), "MMM d")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-primary">${Number(c.payoutPerVideo).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">per video</div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* My Submissions */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                  My Submissions
                  {mySubmissions.length > 0 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">{mySubmissions.length}</Badge>
                  )}
                </CardTitle>
                <Link href="/submissions">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    View all <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : mySubmissions.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Video className="h-7 w-7 mx-auto mb-2 opacity-20" />
                  No submissions yet.{" "}
                  <button onClick={() => setUploadOpen(true)} className="text-primary hover:underline">Submit your first video →</button>
                </div>
              ) : (
                <div className="space-y-1">
                  {mySubmissions.slice(0, 5).map(sub => (
                    <Link href="/submissions" key={sub.id}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{sub.campaign?.title ?? "Campaign"}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                        {statusBadge(sub.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* My Earnings */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  My Earnings
                  {earningsData?.pendingAmount ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      ${earningsData.pendingAmount.toFixed(0)} pending
                    </Badge>
                  ) : null}
                </CardTitle>
                <Link href="/payments">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    All <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : realPayments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <DollarSign className="h-7 w-7 mx-auto mb-2 opacity-20" />
                  No earnings yet — submit a video to get paid.
                </div>
              ) : (
                <div className="space-y-1">
                  {realPayments.slice(0, 5).map((p, i) => {
                    const isPaid = p.stripeStatus === "succeeded" || p.dbStatus === "paid";
                    const isCanceled = p.stripeStatus === "canceled";
                    return (
                      <div key={p.stripeId ?? i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.campaignTitle ?? "Campaign"}</div>
                          <Badge variant="outline" className={cn("text-xs mt-0.5",
                            isPaid ? "text-green-400 border-green-500/30" :
                            isCanceled ? "text-red-400 border-red-500/30" :
                            "text-yellow-400 border-yellow-500/30"
                          )}>
                            {isPaid ? "Paid" : isCanceled ? "Canceled" : "Pending"}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-primary ml-3 shrink-0">${p.amount.toLocaleString()}</div>
                      </div>
                    );
                  })}
                  {totalEarned > 0 && (
                    <div className="pt-2 mt-1 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total paid out</span>
                      <span className="font-bold text-foreground">${totalEarned.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: <Video className="h-4 w-4 text-primary" />, tip: "Keep videos between 15–60 seconds for best approval rates." },
                { icon: <CheckCircle2 className="h-4 w-4 text-green-400" />, tip: "Read the campaign brief carefully before filming — it speeds up approval." },
                { icon: <DollarSign className="h-4 w-4 text-yellow-400" />, tip: "Submit before the deadline to guarantee your slot in the campaign." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitVideoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

/* ─────────────────────────── BRAND DASHBOARD ───────────────────────────── */

function BrandDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: campaigns } = useListCampaigns();
  const { data: payments } = useListPayments();
  const { data: submissions } = useListSubmissions({});
  const [, navigate] = useLocation();

  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const insightsFetched = useRef(false);

  const fetchInsightsMutation = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch(`${BASE}api/openai/dashboard-insights`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      return r.json() as Promise<{ insights: DashboardInsight[] }>;
    },
    onSuccess: (d) => setInsights(d.insights ?? []),
  });

  useEffect(() => {
    if (stats && !insightsFetched.current) {
      insightsFetched.current = true;
      setInsightsLoading(true);
      fetchInsightsMutation.mutateAsync({
        activeCampaigns: stats.activeCampaigns,
        pendingSubmissions: stats.pendingSubmissions,
        approvedVideos: stats.approvedVideos,
        totalSpend: stats.totalSpend,
        budgetUsed: stats.campaignBudgetUsed,
      }).finally(() => setInsightsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const activeCampaigns = campaigns?.filter(c => c.status === "active") ?? [];
  const pendingPayments = payments?.filter(p => p.status === "pending") ?? [];
  const pendingSubmissions = submissions?.filter(s => s.status === "pending" || s.status === "reviewing") ?? [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">The AI operating system for your UGC campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/campaigns/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </Link>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            onClick={() => navigate("/campaigns")}
          >
            <Sparkles className="h-4 w-4" /> Create with AI
          </Button>
        </div>
      </div>

      {/* AI Quick Launch Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-6">
        <div className="absolute -right-8 -top-8 w-48 h-48 opacity-[0.04]">
          <Zap className="w-full h-full" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                Launch in 60 Seconds
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">AI Powered</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tell us your budget and goal — AI generates your full campaign brief instantly.
              </p>
            </div>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0"
            onClick={() => navigate("/campaigns")}
          >
            Start Now <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 flex items-center">
          {["Set Budget", "Define Goal", "Creator Type", "AI Generates", "Publish"].map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={cn(
                  "w-6 h-6 rounded-full border text-xs flex items-center justify-center font-medium",
                  i <= 2 ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block whitespace-nowrap">{step}</span>
              </div>
              {i < 4 && <div className={cn("h-px flex-1 mx-1", i < 2 ? "bg-primary/25" : "bg-border/50")} />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-card" />)}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AnimatedStatCard
            title="Total Spend"
            rawValue={stats.totalSpend}
            icon={DollarSign}
            color="bg-primary/10 text-primary"
            description={`${stats.campaignBudgetUsed.toFixed(1)}% of budget used`}
            prefix="$"
          />
          <AnimatedStatCard
            title="Active Campaigns"
            rawValue={stats.activeCampaigns}
            icon={Megaphone}
            color="bg-blue-500/10 text-blue-400"
          />
          <AnimatedStatCard
            title="Pending Review"
            rawValue={stats.pendingSubmissions}
            icon={Clock}
            color="bg-yellow-500/10 text-yellow-400"
            description="Awaiting your approval"
          />
          <AnimatedStatCard
            title="Approved Videos"
            rawValue={stats.approvedVideos}
            icon={CheckCircle2}
            color="bg-green-500/10 text-green-400"
            description="Ready to publish"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Campaign Pipeline */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  Active Campaign Pipeline
                </CardTitle>
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    View all <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeCampaigns.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No active campaigns.{" "}
                  <Link href="/campaigns/new" className="text-primary hover:underline">Create one →</Link>
                </div>
              ) : activeCampaigns.slice(0, 4).map((c) => {
                const pct = c.totalBudget > 0 ? Math.min(100, ((c.totalSpent ?? 0) / c.totalBudget) * 100) : 0;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`}>
                    <div className="p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">{c.title}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.creatorCount ?? 0}</span>
                          <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" />{c.approvedCount ?? 0} approved</span>
                          <span className="text-primary font-medium">${(c.totalSpent ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1 bg-muted [&>div]:bg-primary" />
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  Pending Approvals
                  {pendingSubmissions.length > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{pendingSubmissions.length}</Badge>
                  )}
                </CardTitle>
                <Link href="/submissions">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    Review all <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-7 w-7 mx-auto mb-2 opacity-20" />
                  All caught up — no pending submissions!
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingSubmissions.slice(0, 5).map(sub => (
                    <Link href="/submissions" key={sub.id}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{sub.campaign?.title ?? "Unknown Campaign"}</div>
                          <div className="text-xs text-muted-foreground">by {sub.creator?.name ?? "Unknown"}</div>
                        </div>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 text-xs shrink-0">
                          {sub.status === "reviewing" ? "In Review" : "Pending"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Queue */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Payout Queue
                  {pendingPayments.length > 0 && (
                    <Badge variant="outline" className="text-muted-foreground text-xs">{pendingPayments.length}</Badge>
                  )}
                </CardTitle>
                <Link href="/payments">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground h-7">
                    Manage <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <DollarSign className="h-7 w-7 mx-auto mb-2 opacity-20" />
                  No pending payouts right now.
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingPayments.slice(0, 4).map(p => (
                    <Link href="/payments" key={p.id}>
                      <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                        <div>
                          <div className="text-sm font-medium">{p.creator?.name ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{p.campaign?.title ?? "Unknown campaign"}</div>
                        </div>
                        <div className="text-sm font-bold text-primary">${p.amount}</div>
                      </div>
                    </Link>
                  ))}
                  {pendingPayments.length > 0 && (
                    <div className="pt-2 mt-1 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total queued</span>
                      <span className="font-bold text-foreground">
                        ${pendingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Insights */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[68px] w-full rounded-lg" />)}
                </div>
              ) : insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <InsightIcon type={ins.icon} />
                        <span className="text-xs font-semibold">{ins.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>Generating insights…</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.slice(0, 7).map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm leading-snug">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">No recent activity.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── ROOT ──────────────────────────────────────── */

export default function Dashboard() {
  const onboarding = getOnboarded();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";
  return isCreator ? <CreatorDashboard /> : <BrandDashboard />;
}
