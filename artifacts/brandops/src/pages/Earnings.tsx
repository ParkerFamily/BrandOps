import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, ExternalLink, Zap, Clock, CheckCircle2,
  AlertCircle, ArrowUpRight, Loader2, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

interface AccountStatus {
  connected: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  onboarded?: boolean;
}

interface Balance {
  available: number;
  pending: number;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string;
  description?: string;
  method?: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-primary/20 text-primary border-primary/30">Paid</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    case "in_transit":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Transit</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "canceled":
      return <Badge variant="outline">Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Earnings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [acctRes, balRes, payRes] = await Promise.all([
        fetch(`${BASE}api/stripe/connect/account?uid=${user.uid}`),
        fetch(`${BASE}api/stripe/connect/balance?uid=${user.uid}`),
        fetch(`${BASE}api/stripe/connect/payouts?uid=${user.uid}`),
      ]);
      const [acct, bal, pay] = await Promise.all([acctRes.json(), balRes.json(), payRes.json()]);
      setAccountStatus(acct);
      setBalance(bal);
      setPayouts(pay.data ?? []);
    } catch {
      toast({ title: "Failed to load earnings data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.uid, toast]);

  useEffect(() => {
    // Handle return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true" || params.get("refresh") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchAll();
  }, [fetchAll]);

  const handleConnect = async () => {
    if (!user?.uid) return;
    setOnboarding(true);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const res = await fetch(`${BASE}api/stripe/connect/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, email: user.email, returnUrl }),
      });
      if (!res.ok) throw new Error("Failed to start onboarding");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast({ title: "Could not start Stripe onboarding", variant: "destructive" });
      setOnboarding(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!user?.uid) return;
    setOpeningDashboard(true);
    try {
      const res = await fetch(`${BASE}api/stripe/connect/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      if (!res.ok) throw new Error("Failed to get login link");
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      toast({ title: "Could not open Stripe dashboard", variant: "destructive" });
    } finally {
      setOpeningDashboard(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const isConnected = accountStatus?.connected;
  const isOnboarded = accountStatus?.onboarded;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Earnings & Payouts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Stripe Express handles your bank account, taxes, and direct deposits.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Connect banner — not yet connected */}
      {!isConnected && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base">Connect your Stripe account</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Set up your bank account, verify your identity, and receive direct deposits. Powered by Stripe Express.
                </div>
              </div>
              <Button
                onClick={handleConnect}
                disabled={onboarding}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-2"
              >
                {onboarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {onboarding ? "Redirecting…" : "Connect with Stripe"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Onboarding incomplete */}
      {isConnected && !isOnboarded && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Onboarding incomplete</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Finish setting up your Stripe account to enable payouts.
                </div>
              </div>
              <Button size="sm" onClick={handleConnect} disabled={onboarding} variant="outline" className="gap-1.5 shrink-0 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                {onboarding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Continue setup
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Onboarded — full status */}
      {isConnected && isOnboarded && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Stripe Express connected</div>
                  <div className="text-xs text-muted-foreground">Bank account verified — payouts active</div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleOpenDashboard}
                disabled={openingDashboard}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                {openingDashboard
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ArrowUpRight className="h-3.5 w-3.5" />}
                Open Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Balance cards */}
      <motion.div
        className="grid grid-cols-2 gap-4"
        variants={fadeUp} initial="hidden" animate="visible" custom={2}
      >
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${fmt(balance?.available ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready to pay out to bank</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-yellow-400" /> Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${fmt(balance?.pending ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Arriving within 2–7 days</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payout history */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <div className="text-sm">
                  {isOnboarded
                    ? "No payouts yet — balances are deposited automatically by Stripe."
                    : "Connect your Stripe account to start receiving payouts."}
                </div>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {payouts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i * 0.5}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="text-sm font-medium">${fmt(p.amount)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Arrives {format(new Date(p.arrivalDate), "MMM d, yyyy")}
                        {p.method && <span className="ml-1.5 capitalize">· {p.method}</span>}
                      </div>
                    </div>
                    {statusBadge(p.status)}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fine print */}
      {isConnected && (
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="text-xs text-muted-foreground text-center pb-2"
        >
          Bank account details, identity verification, and tax forms are managed securely by Stripe.
          Open your Stripe Express dashboard to update them.
        </motion.p>
      )}
    </div>
  );
}
