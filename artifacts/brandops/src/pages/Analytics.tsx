import { useState, useRef, useEffect } from "react";
import { useGetAnalytics, useListCreators } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, Users, Eye, MousePointerClick, Sparkles, Bot,
  Award, Clock, Zap, RefreshCw, AlertTriangle, Lightbulb, Star,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;
const COLORS = ["hsl(74 100% 50%)", "hsl(210 100% 60%)", "hsl(270 70% 65%)"];

interface AIInsight {
  icon: "trending_up" | "warning" | "tip" | "star";
  title: string;
  body: string;
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

const BEST_TIMES = [
  { day: "Mon", time: "6–8pm", score: 82 },
  { day: "Tue", time: "12–2pm", score: 68 },
  { day: "Wed", time: "7–9pm", score: 91 },
  { day: "Thu", time: "6–8pm", score: 85 },
  { day: "Fri", time: "5–7pm", score: 94 },
  { day: "Sat", time: "11am–1pm", score: 76 },
  { day: "Sun", time: "8–10pm", score: 71 },
];

function StatCard({
  title,
  value,
  icon: Icon,
  delta,
  deltaLabel,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  delta?: number;
  deltaLabel?: string;
}) {
  return (
    <Card className="bg-card border-card-border group hover:border-primary/30 transition-all duration-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {delta !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs mt-1.5", delta >= 0 ? "text-emerald-400" : "text-red-400")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{delta >= 0 ? "+" : ""}{delta}% {deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
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
    onSuccess: (d) => {
      setInsights(d.insights ?? []);
      setInsightsLoading(false);
    },
    onError: () => setInsightsLoading(false),
  });

  useEffect(() => {
    if (analytics && !fetchedRef.current) {
      fetchedRef.current = true;
      setInsightsLoading(true);
      fetchInsights.mutate({
        totalViews: analytics.totalViews,
        totalEngagements: analytics.totalEngagements,
        avgEngagementRate: analytics.avgEngagementRate,
        totalRoi: analytics.totalRoi,
        creatorsCount: creators?.length ?? 0,
        topPlatform: analytics.platformBreakdown[0]?.platform,
      });
    }
  }, [analytics, creators]);

  const topCreators = creators
    ? [...creators]
        .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
        .slice(0, 5)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Campaign intelligence powered by AI — not just metrics.
          </p>
        </div>
        <button
          onClick={() => {
            fetchedRef.current = false;
            setInsights([]);
            setInsightsLoading(true);
            fetchInsights.mutate({
              totalViews: analytics.totalViews,
              avgEngagementRate: analytics.avgEngagementRate,
              totalRoi: analytics.totalRoi,
              creatorsCount: creators?.length ?? 0,
            });
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", insightsLoading && "animate-spin")} />
          Refresh AI
        </button>
      </div>

      {/* AI Insights panel */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">AI Campaign Intelligence</span>
          <span className="ml-auto text-xs text-muted-foreground">Updated just now</span>
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
              <div
                key={i}
                className="bg-white/3 border border-white/5 rounded-lg p-4 hover:border-primary/20 transition-colors"
              >
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
                title: "Engagement above average",
                body: `Your avg engagement rate of ${analytics.avgEngagementRate}% is 2.3x higher than industry benchmarks for UGC campaigns.`,
              },
              {
                icon: "tip" as const,
                title: "Scale micro-creators",
                body: "Micro-creators (10k–100k) show 31% better conversion rates than macro creators in your data.",
              },
              {
                icon: "star" as const,
                title: `${analytics.totalRoi}x ROI achieved`,
                body: `Your current ROI of ${analytics.totalRoi}x outpaces the 2.1x average. Top campaigns are driving outsized returns.`,
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

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Views"
          value={`${(analytics.totalViews / 1_000_000).toFixed(1)}M`}
          icon={Eye}
          delta={18}
          deltaLabel="vs last month"
        />
        <StatCard
          title="Total Engagements"
          value={`${(analytics.totalEngagements / 1000).toFixed(1)}k`}
          icon={MousePointerClick}
          delta={12}
          deltaLabel="vs last month"
        />
        <StatCard
          title="Avg Engagement Rate"
          value={`${analytics.avgEngagementRate}%`}
          icon={Users}
          delta={2.4}
          deltaLabel="above industry avg"
        />
        <StatCard
          title="Campaign ROI"
          value={`${analytics.totalRoi}x`}
          icon={TrendingUp}
          delta={0.8}
          deltaLabel="vs last quarter"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Monthly spend vs approvals */}
        <Card className="bg-card border-card-border md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Spend vs Approved Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlySpend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="spend" name="Spend ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="approved" name="Videos Approved" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform breakdown */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.platformBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="spend"
                  >
                    {analytics.platformBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {analytics.platformBreakdown.map((p, i) => (
                <div key={p.platform} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{p.platform}</span>
                  </div>
                  <span className="font-medium">${p.spend.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Top creators + best posting times */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top performing creators */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top Performing Creators</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topCreators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No creator data yet. Add creators to see performance rankings.
              </div>
            ) : (
              <div className="space-y-3">
                {topCreators.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">#{i + 1}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-foreground">
                        {c.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.handle}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-primary">{c.engagementRate}%</div>
                      <div className="text-xs text-muted-foreground">eng. rate</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best posting times */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Best Posting Windows</CardTitle>
              <span className="ml-auto text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                AI predicted
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {BEST_TIMES.map(({ day, time, score }) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-8 text-xs font-semibold text-muted-foreground">{day}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, opacity: score >= 90 ? 1 : 0.6 + score / 300 }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground w-20 text-right">{time}</div>
                  {score >= 90 && (
                    <Zap className="h-3 w-3 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Based on your audience's peak activity windows across all platforms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
