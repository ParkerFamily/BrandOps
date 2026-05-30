import { useState, useEffect } from "react";
import {
  fsSubscribePayments, fsUpdatePayment, type FsPayment,
} from "@/lib/firestore";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CreditCard, DollarSign, Send, CheckCircle2, Clock, AlertCircle,
  Zap, TriangleAlert, Wallet, TrendingUp, ArrowRight, Video
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { getOnboarded } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

/* ─── shared types ───────────────────────────────────────────────────────── */

interface CreatorEarning {
  stripeId: string | null;
  amount: number;
  currency: string;
  stripeStatus: string;
  campaignTitle: string | null;
  dbStatus: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface CreatorEarningsResponse {
  totalEarned: number;
  pendingAmount: number;
  payments: CreatorEarning[];
}

type StripePayoutStatus = "requires_payment_method" | "requires_confirmation" | "processing" | "succeeded" | "canceled";

interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: StripePayoutStatus;
  creatorEmail: string;
  submissionId: string;
  createdAt: string;
}

/* ─── shared helpers ─────────────────────────────────────────────────────── */

function useStripePayouts() {
  return useQuery<{ data: StripePayout[] }>({
    queryKey: ["stripe-payouts"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/stripe/payouts`);
      if (!res.ok) throw new Error("Failed to fetch Stripe payouts");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useCreatorEarnings(email: string | null | undefined) {
  return useQuery<CreatorEarningsResponse>({
    queryKey: ["creator-earnings", email],
    queryFn: async () => {
      if (!email) return { totalEarned: 0, pendingAmount: 0, payments: [] };
      const res = await fetch(`${BASE}api/stripe/creator-earnings?email=${encodeURIComponent(email)}`);
      if (!res.ok) return { totalEarned: 0, pendingAmount: 0, payments: [] };
      return res.json();
    },
    enabled: !!email,
    staleTime: 60_000,
  });
}

function useCreateStripePayoutIntent() {
  return useMutation({
    mutationFn: async (body: { amount: number; creatorEmail: string; creatorName: string; submissionId: string }) => {
      const res = await fetch(`${BASE}api/stripe/payout-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to create payout intent");
      }
      return res.json() as Promise<{ paymentIntentId: string; clientSecret: string; customerId: string }>;
    },
  });
}

const stripeStatusLabel: Record<string, { label: string; color: string }> = {
  succeeded:               { label: "Paid",       color: "text-primary bg-primary/10 border-primary/30" },
  processing:              { label: "Processing", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  requires_payment_method: { label: "Pending",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  requires_confirmation:   { label: "Queued",     color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  canceled:                { label: "Cancelled",  color: "text-red-400 bg-red-500/10 border-red-500/30" },
};

function StripeStatusBadge({ status }: { status: string }) {
  const cfg = stripeStatusLabel[status] ?? { label: status, color: "text-muted-foreground bg-muted border-muted" };
  return <Badge variant="outline" className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</Badge>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":       return <Badge className="bg-primary/20 text-primary border-primary/30">Paid</Badge>;
    case "processing": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Processing</Badge>;
    case "pending":    return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    case "failed":     return <Badge variant="destructive">Failed</Badge>;
    default:           return <Badge variant="outline">{status}</Badge>;
  }
}

function getTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  if (ts && typeof ts === "object" && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

/* ─────────────────────────── CREATOR EARNINGS ───────────────────────────── */

function CreatorEarningsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useCreatorEarnings(user?.email);

  const payments = data?.payments ?? [];
  const totalEarned = data?.totalEarned ?? 0;
  const pendingAmount = data?.pendingAmount ?? 0;
  const processingAmount = payments
    .filter(p => p.stripeStatus === "processing")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Earnings</h1>
        <p className="text-muted-foreground mt-1">
          Your real-time payouts from approved UGC submissions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-card-border relative overflow-hidden group hover:border-primary/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-24 mt-1" />
              : <div className="text-2xl font-bold">${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            }
            <p className="text-xs text-muted-foreground mt-1">From paid submissions</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Processing</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-24 mt-1" />
              : <div className="text-2xl font-bold">${processingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            }
            <p className="text-xs text-muted-foreground mt-1">In transit</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              </div>
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-24 mt-1" />
              : <div className="text-2xl font-bold">${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            }
            <p className="text-xs text-muted-foreground mt-1">Awaiting brand payment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                <DollarSign className="h-6 w-6 opacity-30" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">No earnings yet</p>
                <p className="text-xs mt-1">Submit videos to active campaigns to start earning.</p>
              </div>
              <Link href="/campaigns">
                <Button size="sm" className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  Browse Campaigns <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p, i) => {
                  const isPaid = p.stripeStatus === "succeeded" || p.dbStatus === "paid";
                  const isCanceled = p.stripeStatus === "canceled";
                  const isProcessing = p.stripeStatus === "processing";
                  return (
                    <TableRow key={p.stripeId ?? i} className="border-border hover:bg-muted/20">
                      <TableCell className="text-muted-foreground text-sm">
                        <div>{format(new Date(p.createdAt), "MMM d, yyyy")}</div>
                        <div className="text-xs opacity-60">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
                            <Video className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{p.campaignTitle ?? "Campaign"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium",
                            isPaid      ? "text-primary bg-primary/10 border-primary/30" :
                            isProcessing ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                            isCanceled  ? "text-red-400 bg-red-500/10 border-red-500/30" :
                                          "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                          )}
                        >
                          {isPaid ? "Paid" : isProcessing ? "Processing" : isCanceled ? "Canceled" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-base">
                        ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">How payouts work</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>1. You submit a video to a campaign</li>
                <li>2. The brand reviews and approves your content</li>
                <li>3. A payout is queued via Stripe for the campaign's payout amount</li>
                <li>4. Once processed, the amount appears as <span className="text-primary font-medium">Paid</span> above</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────── BRAND PAYMENTS ─────────────────────────────── */

function BrandPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<FsPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = fsSubscribePayments((data) => {
      setPayments(data);
      setIsLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const { data: stripePayouts, isLoading: stripeLoading, error: stripeError } = useStripePayouts();
  const createPayoutIntent = useCreateStripePayoutIntent();

  const [payoutDialog, setPayoutDialog] = useState<{
    open: boolean;
    paymentId?: string;
    amount?: number;
    creator?: { name: string; email: string } | null;
    submissionId?: string;
    result?: { paymentIntentId: string };
  }>({ open: false });

  const allPayments = payments;
  const totalPaid       = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalProcessing = allPayments.filter(p => p.status === "processing").reduce((s, p) => s + p.amount, 0);
  const totalPending    = allPayments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const handleProcessPayment = async (id: string) => {
    try {
      await fsUpdatePayment(id, { status: "processing" });
      toast({ title: "Payment marked as processing" });
    } catch {
      toast({ title: "Failed to update payment", variant: "destructive" });
    }
  };

  const handleIssuePayout = (payment: FsPayment) => {
    if (!payment.creatorEmail || !payment.creatorName) {
      toast({ title: "No creator linked to payment", variant: "destructive" });
      return;
    }
    setPayoutDialog({
      open: true,
      paymentId: payment.id,
      amount: payment.amount,
      creator: { name: payment.creatorName, email: payment.creatorEmail },
      submissionId: payment.submissionId,
    });
  };

  const confirmPayout = () => {
    if (!payoutDialog.creator || !payoutDialog.amount || !payoutDialog.submissionId) return;
    createPayoutIntent.mutate(
      {
        amount: payoutDialog.amount,
        creatorEmail: payoutDialog.creator.email,
        creatorName: payoutDialog.creator.name,
        submissionId: payoutDialog.submissionId,
      },
      {
        onSuccess: (data) => {
          setPayoutDialog(d => ({ ...d, result: { paymentIntentId: data.paymentIntentId } }));
          if (payoutDialog.paymentId) {
            fsUpdatePayment(payoutDialog.paymentId, { status: "processing" });
          }
          toast({ title: "Stripe payout intent created", description: `PI: ${data.paymentIntentId}` });
        },
        onError: (err: Error) => {
          toast({ title: "Payout failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and issue payouts to creators for approved content.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Processing</p>
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold">${totalProcessing.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Stripe Payout Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stripeLoading ? (
            <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : stripeError ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
              Stripe not connected or no payouts yet.
            </div>
          ) : stripePayouts?.data.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Stripe PI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripePayouts.data.map(p => (
                  <TableRow key={p.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(p.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-sm">{p.creatorEmail}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.id.slice(0, 24)}…</TableCell>
                    <TableCell><StripeStatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right font-bold">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No Stripe payouts issued yet. Use "Pay via Stripe" below to start.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            All Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : allPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayments.map(payment => (
                  <TableRow key={payment.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(getTimestamp(payment.createdAt)), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-sm">{payment.creatorName ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{payment.creatorEmail}</div>
                      {!payment.creatorEmail && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400 mt-0.5">
                          <TriangleAlert className="h-3 w-3" /> No payment info
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{payment.campaignTitle ?? "Unknown"}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right font-bold">${payment.amount}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {payment.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleProcessPayment(payment.id!)}>
                            Mark Processing
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => handleIssuePayout(payment)}
                          >
                            <Send className="h-3 w-3 mr-1" /> Pay via Stripe
                          </Button>
                        </>
                      )}
                      {payment.status === "processing" && (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleIssuePayout(payment)}
                        >
                          <Send className="h-3 w-3 mr-1" /> Pay via Stripe
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No payments recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payoutDialog.open} onOpenChange={open => { if (!open) setPayoutDialog({ open: false }); }}>
        <DialogContent className="sm:max-w-[480px] bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Issue Stripe Payout
            </DialogTitle>
            <DialogDescription>
              This creates a Stripe Payment Intent for the creator payout. You can complete the transfer from your Stripe Dashboard.
            </DialogDescription>
          </DialogHeader>
          {payoutDialog.result ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Payout intent created!</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{payoutDialog.result.paymentIntentId}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The payment intent has been created in Stripe. Complete the payout from your Stripe Dashboard to finalize the transfer.
              </p>
              <Button className="w-full" onClick={() => setPayoutDialog({ open: false })}>Done</Button>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Creator</p>
                  <p className="font-semibold">{payoutDialog.creator?.name}</p>
                  <p className="text-muted-foreground text-xs">{payoutDialog.creator?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Amount</p>
                  <p className="font-bold text-2xl text-primary">${payoutDialog.amount?.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayoutDialog({ open: false })}>Cancel</Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={confirmPayout}
                  disabled={createPayoutIntent.isPending}
                >
                  {createPayoutIntent.isPending ? "Creating…" : "Confirm & Issue"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── ROOT ───────────────────────────────────────── */

export default function Payments() {
  const onboarding = getOnboarded();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";
  return isCreator ? <CreatorEarningsPage /> : <BrandPaymentsPage />;
}
