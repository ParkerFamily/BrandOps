import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Check, User, Briefcase, Globe, CreditCard, Shield, LogOut,
  Zap, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboarded, clearOnboarded } from "@/lib/onboarding";

const BASE = import.meta.env.BASE_URL;
const PROFILE_KEY = "brandops_profile";

interface OnboardingData {
  accountType: string;
  goal: string;
  platforms: string[];
  budget: string;
  niches: string[];
  teamSize: string;
  turnaround: string;
  completedAt?: string;
}

interface Profile {
  brandName: string;
  website: string;
}

interface UserStripeStatus {
  stripeConnectAccountId: string | null;
  stripeConnectOnboarded: boolean;
  stripeCustomerId: string | null;
}

interface ConnectStatus {
  connected: boolean;
  accountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  requiresAction?: boolean;
}

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as Profile;
  } catch {}
  return { brandName: "", website: "" };
}

/* ─── Creator Payout Setup Card ─────────────────────────────────────────── */

function CreatorPayoutSetup({ uid, email, name }: { uid: string; email: string; name?: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectNotEnabled, setConnectNotEnabled] = useState(false);

  const { data: connectStatus, isLoading } = useQuery<ConnectStatus>({
    queryKey: ["creator-connect-status", uid],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/stripe/creator-connect/status?uid=${encodeURIComponent(uid)}`);
      if (!res.ok) return { connected: false, payoutsEnabled: false };
      return res.json() as Promise<ConnectStatus>;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const startOnboarding = async () => {
    setStarting(true);
    setConnectNotEnabled(false);
    try {
      const res = await fetch(`${BASE}api/stripe/creator-connect/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, name, returnUrl: window.location.origin }),
      });
      const data = await res.json() as { url?: string; error?: string; activationUrl?: string };
      if (res.status === 402 && data.error === "connect_not_enabled") {
        setConnectNotEnabled(true);
        setStarting(false);
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to start onboarding");
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Setup failed", description: String(err), variant: "destructive" });
      setStarting(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["creator-connect-status", uid] });
    setRefreshing(false);
  };

  const isReady = connectStatus?.payoutsEnabled && connectStatus?.detailsSubmitted;
  const inProgress = connectStatus?.connected && !isReady;

  return (
    <Card className="bg-card border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Payout Setup
          </CardTitle>
          {isLoading ? null : isReady ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : inProgress ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
              <Clock className="h-3 w-3 mr-1" /> Incomplete
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Not set up
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your bank account via Stripe so you get paid for approved videos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stripe Connect not enabled — actionable step */}
        {connectNotEnabled && (
          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stripe Connect needs to be enabled on your account
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stripe Connect is the feature that lets platforms pay out to individual creators.
              It's a one-time activation — takes about 2 minutes in your Stripe dashboard.
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
              <li>Click the button below to open your Stripe dashboard</li>
              <li>Click <span className="text-foreground font-medium">"Get started with Connect"</span></li>
              <li>Complete the short activation form</li>
              <li>Come back here and click <span className="text-foreground font-medium">"Set Up Payouts"</span> again</li>
            </ol>
            <a
              href="https://dashboard.stripe.com/connect/accounts/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium underline underline-offset-2"
            >
              <ExternalLink className="h-3 w-3" />
              Open Stripe Dashboard → Connect
            </a>
          </div>
        )}

        {!connectNotEnabled && (
          isReady ? (
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Payouts enabled
              </div>
              <p className="text-xs text-muted-foreground">
                Your bank account is connected and payouts are live. Brands send earnings directly to you.
              </p>
            </div>
          ) : inProgress ? (
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                <Clock className="h-4 w-4" /> Onboarding incomplete
              </div>
              <p className="text-xs text-muted-foreground">
                Your Stripe account was created but still needs more info. Click below to finish.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect a bank account or debit card to receive payments. Takes ~2 minutes via
                Stripe's secure onboarding.
              </p>
            </div>
          )
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={startOnboarding}
            disabled={starting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-[0_0_20px_rgba(198,255,0,0.1)]"
          >
            {starting ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Redirecting…</>
            ) : isReady ? (
              <><ExternalLink className="h-3.5 w-3.5" /> Manage Payout Account</>
            ) : inProgress ? (
              <><ExternalLink className="h-3.5 w-3.5" /> Finish Setup</>
            ) : (
              <><Zap className="h-3.5 w-3.5" /> Set Up Payouts</>
            )}
          </Button>
          {connectStatus?.connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              disabled={refreshing}
              className="text-muted-foreground gap-1.5 h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Brand Payment Method Setup Card ───────────────────────────────────── */

function BrandPaymentSetup({ uid, email, name }: { uid: string; email: string; name?: string | null }) {
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const { data: profileData } = useQuery<UserStripeStatus>({
    queryKey: ["user-stripe-status", uid],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/users/${uid}`);
      if (!res.ok) return { stripeConnectAccountId: null, stripeConnectOnboarded: false, stripeCustomerId: null };
      return res.json() as Promise<UserStripeStatus>;
    },
    staleTime: 30_000,
  });

  const hasPaymentMethod = !!profileData?.stripeCustomerId;

  const startSetup = async () => {
    setStarting(true);
    try {
      const res = await fetch(`${BASE}api/stripe/brand-setup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, name, returnUrl: window.location.origin }),
      });
      if (!res.ok) throw new Error("Failed to start payment setup");
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      toast({ title: "Setup failed", description: String(err), variant: "destructive" });
      setStarting(false);
    }
  };

  return (
    <Card className="bg-card border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment Method
          </CardTitle>
          {hasPaymentMethod ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> On file
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Required
            </Badge>
          )}
        </div>
        <CardDescription>
          Add a card or bank account to fund campaigns and pay creators.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPaymentMethod ? (
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Payment method on file
            </div>
            <p className="text-xs text-muted-foreground">
              You're ready to pay creators. Manage your payment methods or invoices via Stripe.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
              <AlertTriangle className="h-4 w-4" /> No payment method yet
            </div>
            <p className="text-xs text-muted-foreground">
              You need to add a card before you can issue payouts to creators through the platform.
            </p>
          </div>
        )}

        <Button
          onClick={startSetup}
          disabled={starting}
          className={cn(
            "gap-2",
            hasPaymentMethod
              ? "bg-muted text-foreground border border-border hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.1)]"
          )}
        >
          {starting ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Redirecting…</>
          ) : hasPaymentMethod ? (
            <><ExternalLink className="h-3.5 w-3.5" /> Manage Payment Methods</>
          ) : (
            <><CreditCard className="h-3.5 w-3.5" /> Add Payment Method</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Main Settings Page ─────────────────────────────────────────────────── */

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const onboarding = getOnboarded() as OnboardingData | null;
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [saved, setSaved] = useState(false);

  // Handle Stripe return callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnect = params.get("stripe_connect");
    const stripeSetup = params.get("stripe_setup");

    if (stripeConnect === "complete") {
      toast({ title: "Stripe connected!", description: "Your payout account is being verified. Refresh to see your status." });
      queryClient.invalidateQueries({ queryKey: ["creator-connect-status"] });
      navigate("/settings", { replace: true });
    } else if (stripeConnect === "refresh") {
      toast({ title: "Session expired", description: "Please start the Stripe setup again." });
      navigate("/settings", { replace: true });
    } else if (stripeSetup === "complete") {
      toast({ title: "Payment method saved!", description: "You can now fund campaigns and pay creators." });
      queryClient.invalidateQueries({ queryKey: ["user-stripe-status"] });
      navigate("/settings", { replace: true });
    } else if (stripeSetup === "cancelled") {
      navigate("/settings", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    toast({ title: "Profile saved", description: "Your workspace profile has been updated." });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace and account.</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Account Info */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account
            </CardTitle>
            <CardDescription>Your signed-in account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.displayName ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              {onboarding?.accountType && (
                <span className="ml-auto shrink-0 text-xs bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 font-medium">
                  {onboarding.accountType}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-muted-foreground border-border hover:text-foreground gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Workspace Profile */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {isCreator ? "Creator Profile" : "Workspace Profile"}
            </CardTitle>
            <CardDescription>
              {isCreator ? "Update your creator info." : "Update your brand information."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">{isCreator ? "Display Name" : "Brand Name"}</Label>
              <Input
                id="brand-name"
                placeholder={isCreator ? "Your creator name" : "Your brand name"}
                value={profile.brandName}
                onChange={(e) => setProfile((p) => ({ ...p, brandName: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                {isCreator ? "Portfolio / Link" : "Website"}
              </Label>
              <Input
                id="website"
                placeholder={isCreator ? "https://yourportfolio.com" : "https://yourbrand.com"}
                value={profile.website}
                onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <Button
              onClick={handleSave}
              className={cn(
                "gap-2 transition-all",
                saved ? "bg-green-600 hover:bg-green-600" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Role-specific Stripe Setup */}
        {user && (
          isCreator
            ? <CreatorPayoutSetup uid={user.uid} email={user.email ?? ""} name={user.displayName} />
            : <BrandPaymentSetup uid={user.uid} email={user.email ?? ""} name={user.displayName} />
        )}

        {/* Workspace Configuration */}
        {onboarding && (
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Workspace Configuration
              </CardTitle>
              <CardDescription>
                Your onboarding selections — these personalize your AI and workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Account Type", value: onboarding.accountType },
                  { label: isCreator ? "Content Style" : "Primary Goal", value: onboarding.goal },
                  { label: isCreator ? "Target Rate" : "Budget", value: onboarding.budget },
                  { label: isCreator ? "Turnaround" : "Team Size", value: isCreator ? onboarding.turnaround : onboarding.teamSize },
                ].filter((r) => r.value).map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                    <p className="font-medium text-sm">{value}</p>
                  </div>
                ))}
                {onboarding.niches?.length > 0 && (
                  <div className="col-span-2 p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Niches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onboarding.niches.map((n) => (
                        <span key={n} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                {onboarding.platforms?.length > 0 && !isCreator && (
                  <div className="col-span-2 p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Video Channels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onboarding.platforms.map((p) => (
                        <span key={p} className="text-xs bg-white/5 text-foreground border border-border rounded-full px-2 py-0.5">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                To change these,{" "}
                <button
                  onClick={() => { clearOnboarded(); window.location.href = "/onboarding"; }}
                  className="text-primary underline underline-offset-2"
                >
                  re-run onboarding
                </button>.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
