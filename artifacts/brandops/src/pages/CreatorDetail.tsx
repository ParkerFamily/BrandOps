import { useRoute } from "wouter";
import { useState, useEffect } from "react";
import {
  fsGetCreator, fsUpdateCreator, type FsCreator,
} from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  UserCircle2, Mail, PlayCircle, Sparkles, Loader2, Target,
  TrendingUp, DollarSign, Star, CreditCard, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

interface CreatorMatchResult {
  matchScore: number;
  tier: string;
  whyFits: string;
  suggestedPayoutRange: string;
  bestCampaignType: string;
  audienceInsight: string;
  riskFactors: string;
}

type PaymentMethodType = "paypal" | "venmo" | "zelle" | "bank_transfer" | "check";

const PAYMENT_METHODS: { value: PaymentMethodType; label: string; placeholder: string }[] = [
  { value: "paypal",        label: "PayPal",         placeholder: "PayPal email address" },
  { value: "venmo",         label: "Venmo",          placeholder: "Venmo handle (e.g. @username)" },
  { value: "zelle",         label: "Zelle",          placeholder: "Phone number or email for Zelle" },
  { value: "bank_transfer", label: "Bank Transfer",  placeholder: "Routing #, Account #, Bank name" },
  { value: "check",         label: "Check",          placeholder: "Mailing address for check" },
];

function MatchScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-primary" : score >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className={cn("text-xl font-black z-10", color)}>{score}</span>
    </div>
  );
}

function PaymentSetupCard({
  creatorId,
  currentMethod,
  currentDetails,
  onUpdated,
}: {
  creatorId: string;
  currentMethod: string | null | undefined;
  currentDetails: string | null | undefined;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(!currentMethod);
  const [method, setMethod] = useState<PaymentMethodType | "">(
    (currentMethod as PaymentMethodType) ?? ""
  );
  const [details, setDetails] = useState(currentDetails ?? "");
  const [isPending, setIsPending] = useState(false);

  const methodMeta = PAYMENT_METHODS.find(m => m.value === method);
  const isSetup = !!currentMethod && !!currentDetails;

  const handleSave = async () => {
    if (!method || !details.trim()) {
      toast({ title: "Fill in all payment fields", variant: "destructive" });
      return;
    }
    setIsPending(true);
    try {
      await fsUpdateCreator(creatorId, { paymentMethod: method, paymentDetails: details.trim() });
      toast({ title: "Payment info saved" });
      setEditing(false);
      onUpdated();
    } catch {
      toast({ title: "Failed to save payment info", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  const handleClear = async () => {
    setIsPending(true);
    try {
      await fsUpdateCreator(creatorId, { paymentMethod: undefined, paymentDetails: undefined });
      toast({ title: "Payment info removed" });
      setMethod("");
      setDetails("");
      setEditing(true);
      onUpdated();
    } catch {
      toast({ title: "Failed to remove payment info", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="bg-card border-card-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment Setup
          </span>
          {isSetup && !editing && (
            <span className="flex items-center gap-1.5 text-xs text-primary font-normal">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
            </span>
          )}
          {!isSetup && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-normal">
              <AlertCircle className="h-3.5 w-3.5" /> Not set up
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && isSetup ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Method</span>
                <span className="text-sm font-semibold">
                  {PAYMENT_METHODS.find(m => m.value === currentMethod)?.label ?? currentMethod}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">Details</span>
                <span className="text-sm text-right break-all">{currentDetails}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMethod((currentMethod as PaymentMethodType) ?? ""); setDetails(currentDetails ?? ""); setEditing(true); }}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleClear} disabled={isPending}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      method === m.value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {method && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  {methodMeta?.label} Details
                </Label>
                <Input
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder={methodMeta?.placeholder}
                  className="bg-muted/20 border-border"
                />
              </div>
            )}

            <div className="flex gap-2">
              {isSetup && (
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                className={cn("bg-primary text-primary-foreground hover:bg-primary/90", isSetup ? "flex-1" : "w-full")}
                onClick={handleSave}
                disabled={isPending || !method || !details.trim()}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Payment Info"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreatorDetail() {
  const [, params] = useRoute("/creators/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();

  const [creator, setCreator] = useState<FsCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchResult, setMatchResult] = useState<CreatorMatchResult | null>(null);

  const loadCreator = () => {
    if (!id) return;
    fsGetCreator(id).then(c => { setCreator(c); setIsLoading(false); });
  };

  useEffect(() => { loadCreator(); }, [id]);

  const matchMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}api/openai/creator-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: creator?.name,
          niche: creator?.niche,
          platform: creator?.platform,
          followerCount: creator?.followerCount,
          engagementRate: creator?.engagementRate,
        }),
      });
      if (!r.ok) throw new Error("Match analysis failed");
      return r.json() as Promise<CreatorMatchResult>;
    },
    onSuccess: (d) => setMatchResult(d),
    onError: () => toast({ title: "AI analysis failed", variant: "destructive" }),
  });

  const handleToggleStatus = async () => {
    if (!creator) return;
    const newStatus = creator.status === "active" ? "suspended" : "active";
    try {
      await fsUpdateCreator(id, { status: newStatus } as Partial<FsCreator>);
      setCreator(prev => prev ? { ...prev, status: newStatus } : prev);
      toast({ title: `Creator ${newStatus === "active" ? "activated" : "suspended"}` });
    } catch {
      toast({ title: "Failed to update creator", variant: "destructive" });
    }
  };

  const tierColor = (tier?: string) => {
    if (!tier) return "text-muted-foreground";
    if (tier.toLowerCase().includes("excellent")) return "text-primary";
    if (tier.toLowerCase().includes("good")) return "text-blue-400";
    if (tier.toLowerCase().includes("fair")) return "text-yellow-400";
    return "text-red-400";
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  if (!creator) {
    return <div className="text-center py-12 text-muted-foreground">Creator not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-card-border overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
          <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
        </div>
        <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-14 sm:-mt-10 mb-5">
            <div className="w-24 h-24 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-14 h-14 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{creator.name}</h1>
                    <Badge
                      variant={(creator as any).status === "active" ? "default" : "outline"}
                      className={(creator as any).status === "active" ? "bg-primary/20 text-primary border-primary/30" : ""}
                    >
                      {(creator as any).status ?? "active"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{creator.handle}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>{creator.email}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                  {(creator as any).status === "active" ? "Suspend" : "Activate"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 py-5 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Approval Rate</div>
              <div className="font-semibold text-lg text-primary">
                {(creator.approvalRate ?? 0) > 0 ? `${creator.approvalRate}%` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">On-Time Delivery</div>
              <div className="font-semibold text-lg">
                {(creator.onTimeDeliveryRate ?? 0) > 0 ? `${creator.onTimeDeliveryRate}%` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Campaigns Done</div>
              <div className="font-semibold text-lg">{creator.completedCampaigns ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total Earned</div>
              <div className="font-semibold text-lg">${(creator.totalEarnings ?? 0).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="text-base">Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                <PlayCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No recent submissions from this creator.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="text-base">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Approved Videos", value: creator.approvedVideos ?? 0 },
                  { label: "Approval Rate", value: (creator.approvalRate ?? 0) > 0 ? `${creator.approvalRate}%` : "—", accent: true },
                  { label: "On-Time Delivery", value: (creator.onTimeDeliveryRate ?? 0) > 0 ? `${creator.onTimeDeliveryRate}%` : "—" },
                  { label: "Avg Turnaround", value: (creator.avgTurnaroundDays ?? 0) > 0 ? `${creator.avgTurnaroundDays} days` : "—" },
                  { label: "Brand Rating", value: (creator.brandRating ?? 0) > 0 ? `${creator.brandRating} / 5` : "—", yellow: true },
                  { label: "Suggested Payout", value: (creator.suggestedPayout ?? 0) > 0 ? `$${creator.suggestedPayout}/video` : "—" },
                ].map(({ label, value, accent, yellow }) => (
                  <div key={label} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm font-medium">{label}</div>
                    <div className={cn("font-bold", accent ? "text-primary" : yellow ? "text-yellow-400" : "")}>{value}</div>
                  </div>
                ))}
                {(creator.contentStyles ?? []).length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-sm font-medium mb-2">Content Styles</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(creator.contentStyles ?? []).map((s: string) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PaymentSetupCard
            creatorId={id}
            currentMethod={creator.paymentMethod}
            currentDetails={creator.paymentDetails}
            onUpdated={loadCreator}
          />

          <Card className="bg-card border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Creator Match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!matchResult && !matchMutation.isPending && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Target className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Analyze creator fit</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI scores this creator's campaign fit, suggests payout, and highlights their best use cases.
                    </p>
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full"
                    onClick={() => matchMutation.mutate()}
                  >
                    <Sparkles className="h-4 w-4" /> Run AI Analysis
                  </Button>
                </div>
              )}

              {matchMutation.isPending && (
                <div className="text-center py-8 space-y-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm">Analyzing creator profile…</p>
                </div>
              )}

              {matchResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                    <MatchScoreRing score={matchResult.matchScore} />
                    <div>
                      <div className={cn("text-sm font-bold", tierColor(matchResult.tier))}>
                        {matchResult.tier}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Match Score</div>
                      <Progress
                        value={matchResult.matchScore}
                        className="h-1 mt-2 w-24 bg-muted [&>div]:bg-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="h-3 w-3" /> Why They Fit
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{matchResult.whyFits}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                      <DollarSign className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Suggested Payout</div>
                        <div className="text-sm font-semibold">{matchResult.suggestedPayoutRange}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                      <TrendingUp className="h-4 w-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">Best Campaign Type</div>
                        <div className="text-sm font-semibold">{matchResult.bestCampaignType}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <div className="text-xs font-semibold text-blue-400 mb-1">Audience Insight</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{matchResult.audienceInsight}</p>
                  </div>

                  {matchResult.riskFactors && matchResult.riskFactors.toLowerCase() !== "none identified" && (
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
                      <div className="text-xs font-semibold text-yellow-400 mb-1">Considerations</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{matchResult.riskFactors}</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setMatchResult(null); matchMutation.mutate(); }}
                  >
                    Re-analyze
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
