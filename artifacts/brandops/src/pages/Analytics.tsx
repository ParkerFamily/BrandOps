import { useState, useRef, useEffect } from "react";
import { useGetAnalytics, useListCreators } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  DollarSign, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Sparkles, Bot, TrendingUp, Lightbulb, Star, Award, Zap,
  BarChart3, Video, Users, ThumbsDown, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

interface AIInsight {
  icon: "trending_up" | "warning" | "tip" | "star";
  title: string;
  body: string;
}

function InsightIcon({ type }: { type: string }) {
  switch (type) {
    case "trending_up": return <TrendingUp className="h-4 w-4 text-primary" />;
    case "warning":     return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case "tip":         return <Lightbulb className="h-4 w-4 text-blue-400" />;
    case "star":        return <Star className="h-4 w-4 text-purple-400" />;
    default:            return <Sparkles className="h-4 w-4 text-primary" />;
  }
}

function KpiCard({
  title, value, sub, icon: Icon, accent = false, warn = false,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; accent?: boolean; warn?: boolean;
}) {
  return (
    <Card className="bg-card border-card-border group hover:border-primary/30 transition-all duration-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            accent ? "bg-primary/10 text-primary" :
            warn ? "bg-yellow-500/10 text-yellow-400" :
            "bg-white/5 text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={cn("text-2xl font-bold tracking-tight", accent && "text-primary")}>
          {value}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CreatorRow({
  rank, creator,
}: {
  rank: number;
  creator: { id: number; name: string; handle: string; platform: string; metric: number; metricLabel: string; approvedVideos?: number };
}) {
  return (
    <Link href={`/creators/${creator.id}`}>
      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors cursor-pointer">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">#{rank}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold">{creator.name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{creator.name}</div>
          <div className="text-xs text-muted-foreground truncate">{creator.handle}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-primary">{creator.metric}{creator.metricLabel === "approval rate" ? "%" : "d"}</div>
          <div className="text-[10px] text-muted-foreground">{creator.metricLabel}</div>
        </div>
      </div>
    </Link>
  );
}

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalytics();
  const { data: creators } = useListCreators();

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchInsights = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch(`${BASE}api/openai/dashboard-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.json() as Promise<{ insights: AIInsight[] }>;
    },
    onSuccess: (d) => { setInsights(d.insights ?? []); setInsightsLoading(false); },
    onError: () => setInsightsLoading(false),
  });

  useEffect(() => {
    if (analytics && !fetchedRef.current) {
      fetchedRef.current = true;
      setInsightsLoading(true);
      fetchInsights.mutate({
        totalBudget: analytics.totalBudget,
        approvedPayouts: analytics.approvedPayouts,
        approvalRate: analytics.approvalRate,
        pendingApprovals: analytics.pendingApprovals,
        videosApproved: analytics.videosApproved,
        costPerApprovedVideo: analytics.costPerApprovedVideo,
        avgDeliveryDays: analytics.avgDeliveryDays,
        budgetRemaining: analytics.budgetRemaining,
        creatorsCount: creators?.length ?? 0,
      });
    }
  }, [analytics, creators]);

  function refreshInsights() {
    if (!analytics) return;
    fetchedRef.current = false;
    setInsights([]);
    setInsightsLoading(true);
    fetchInsights.mutate({
      totalBudget: analytics.totalBudget,
      approvedPayouts: analytics.approvedPayouts,
      approvalRate: analytics.approvalRate,
      pendingApprovals: analytics.pendingApprovals,
      videosApproved: analytics.videosApproved,
      costPerApprovedVideo: analytics.costPerApprovedVideo,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">UGC Operations</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-20 text-muted-foreground">Failed to load operations data.</div>;
  }

  const budgetPct = analytics.totalBudget > 0
    ? Math.round((analytics.approvedPayouts / analytics.totalBudget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UGC Operations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real production metrics — budget, delivery, approval, and payout performance.
          </p>
        </div>
        <button
          onClick={refreshInsights}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", insightsLoading && "animate-spin")} />
          Refresh AI
        </button>
      </div>

      {/* Top row: Budget KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Campaign Budget"
          value={`$${analytics.totalBudget.toLocaleString()}`}
          sub={`${budgetPct}% allocated`}
          icon={DollarSign}
        />
        <KpiCard
          title="Approved Payouts"
          value={`$${analytics.approvedPayouts.toLocaleString()}`}
          sub="Paid to creators"
          icon={CheckCircle2}
          accent
        />
        <KpiCard
          title="Pending Approvals"
          value={String(analytics.pendingApprovals)}
          sub="Awaiting your review"
          icon={Clock}
          warn={analytics.pendingApprovals > 0}
        />
        <KpiCard
          title="Budget Remaining"
          value={`$${analytics.budgetRemaining.toLocaleString()}`}
          sub="Available for payouts"
          icon={DollarSign}
        />
      </div>

      {/* Second row: Production KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Videos Delivered"
          value={String(analytics.videosDelivered)}
          sub={`${analytics.videosApproved} approved`}
          icon={Video}
        />
        <KpiCard
          title="Approval Rate"
          value={`${analytics.approvalRate}%`}
          sub="Across all submissions"
          icon={CheckCircle2}
          accent={analytics.approvalRate >= 80}
          warn={analytics.approvalRate > 0 && analytics.approvalRate < 60}
        />
        <KpiCard
          title="Avg Delivery Time"
          value={analytics.avgDeliveryDays > 0 ? `${analytics.avgDeliveryDays}d` : "—"}
          sub="Average creator turnaround"
          icon={Clock}
        />
        <KpiCard
          title="Cost / Approved Video"
          value={analytics.costPerApprovedVideo > 0 ? `$${analytics.costPerApprovedVideo.toLocaleString()}` : "—"}
          sub="Based on paid payouts"
          icon={BarChart3}
        />
      </div>

      {/* Budget + Revision quick stats */}
      <div className="flex items-center gap-6 flex-wrap border border-white/8 rounded-xl px-5 py-3 bg-white/2 text-sm">
        <div className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Videos approved:</span>
          <span className="font-bold text-white">{analytics.videosApproved}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Revision requests:</span>
          <span className="font-bold text-white">{analytics.revisionRequests}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Creators on roster:</span>
          <span className="font-bold text-white">{creators?.length ?? 0}</span>
        </div>
        {analytics.pendingApprovals > 0 && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <Link href="/submissions">
              <div className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold">{analytics.pendingApprovals} videos need review</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </Link>
          </>
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">AI Operations Intelligence</span>
          <span className="ml-auto text-xs text-muted-foreground">Based on your live data</span>
        </div>
        {insightsLoading ? (
          <div className="grid md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/3 border border-white/5 rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-3">
            {insights.map((ins, i) => (
              <div key={i} className="bg-white/3 border border-white/5 rounded-lg p-4 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <InsightIcon type={ins.icon} />
                  <span className="text-sm font-semibold">{ins.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                icon: "trending_up" as const,
                title: analytics.approvalRate >= 80 ? "Strong approval rate" : "Approval rate needs attention",
                body: analytics.approvalRate >= 80
                  ? `Your ${analytics.approvalRate}% approval rate means most creators are delivering quality content on first submission.`
                  : `Your approval rate is ${analytics.approvalRate}%. Consider tightening your creative brief or being more selective with creator invites.`,
              },
              {
                icon: "tip" as const,
                title: "Cost efficiency",
                body: analytics.costPerApprovedVideo > 0
                  ? `You're paying $${analytics.costPerApprovedVideo} per approved video. Industry benchmark for UGC is $75–$200 depending on production quality.`
                  : "Add creator payouts to start tracking your cost per approved video — this is your most important production metric.",
              },
              {
                icon: analytics.pendingApprovals > 5 ? "warning" as const : "star" as const,
                title: analytics.pendingApprovals > 5 ? "Review backlog building" : "Pipeline healthy",
                body: analytics.pendingApprovals > 5
                  ? `You have ${analytics.pendingApprovals} videos pending review. Delayed approvals slow down creator payouts and hurt retention.`
                  : analytics.budgetRemaining > 0
                    ? `$${analytics.budgetRemaining.toLocaleString()} remains in campaign budgets. You can approve more payouts or invite additional creators.`
                    : "All budgets are fully allocated. Create a new campaign to continue producing UGC.",
              },
            ].map((ins, i) => (
              <div key={i} className="bg-white/3 border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <InsightIcon type={ins.icon} />
                  <span className="text-sm font-semibold">{ins.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly spend chart */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Spend vs Approved Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlySpend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar yAxisId="left" dataKey="spend" name="Paid ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="approved" name="Approved Videos" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Creator leaderboards */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Top by approval rate */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Highest Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topCreators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Add creator approval rates to see rankings.
              </div>
            ) : (
              <div className="space-y-1">
                {analytics.topCreators.map((c, i) => (
                  <CreatorRow key={c.id} rank={i + 1} creator={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fastest by turnaround */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Fastest Turnaround
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.fastestCreators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Add turnaround data to creator profiles.
              </div>
            ) : (
              <div className="space-y-1">
                {analytics.fastestCreators.map((c, i) => (
                  <CreatorRow key={c.id} rank={i + 1} creator={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs attention */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-yellow-400" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.creatorsNeedingAttention.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20 text-primary" />
                All creators performing well.
              </div>
            ) : (
              <div className="space-y-1">
                {analytics.creatorsNeedingAttention.map((c, i) => (
                  <CreatorRow key={c.id} rank={i + 1} creator={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
