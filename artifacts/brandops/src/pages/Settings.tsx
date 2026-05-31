import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Check, User, Briefcase, Globe, CreditCard, Shield, LogOut,
  Zap, ExternalLink, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  UsersRound, Bell, Sparkles, ChevronRight, Trash2, Mail,
  BrainCircuit, Target, Receipt, Lock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboarded, clearOnboarded } from "@/lib/onboarding";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;
const PROFILE_KEY = "brandops_profile";
const NOTIF_KEY = "brandops_notifications";
const AIPREF_KEY = "brandops_ai_prefs";

interface OnboardingData {
  accountType: string; goal: string; platforms: string[];
  budget: string; niches: string[]; teamSize: string; turnaround: string;
}
interface Profile { brandName: string; website: string }
interface UserStripeStatus { stripeConnectAccountId: string | null; stripeConnectOnboarded: boolean; stripeCustomerId: string | null }
interface ConnectStatus { connected: boolean; accountId?: string; payoutsEnabled?: boolean; chargesEnabled?: boolean; detailsSubmitted?: boolean; requiresAction?: boolean }
interface Notifications { submissions: boolean; campaigns: boolean; payments: boolean; digest: boolean }
interface AiPrefs { defaultNiches: string; defaultGoal: string; contentStyle: string }
interface SubscriptionStatus { plan: "free" | "starter" | "growth" | "enterprise"; memberLimit: number | null; status: string }

function loadProfile(): Profile {
  try { const r = localStorage.getItem(PROFILE_KEY); if (r) return JSON.parse(r); } catch {}
  return { brandName: "", website: "" };
}
function loadNotifs(): Notifications {
  try { const r = localStorage.getItem(NOTIF_KEY); if (r) return JSON.parse(r); } catch {}
  return { submissions: true, campaigns: true, payments: true, digest: false };
}
function loadAiPrefs(): AiPrefs {
  try { const r = localStorage.getItem(AIPREF_KEY); if (r) return JSON.parse(r); } catch {}
  return { defaultNiches: "", defaultGoal: "", contentStyle: "" };
}

/* ─── Toggle ────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-[#C6FF00]" : "bg-white/15"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}

/* ─── Row ───────────────────────────────────────────────────────────────── */
function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ─── Section heading ───────────────────────────────────────────────────── */
function SectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-white">{title}</h2>
      {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
    </div>
  );
}

/* ─── Creator Payout Setup ──────────────────────────────────────────────── */
function CreatorPayoutSetup({ uid, email, name }: { uid: string; email: string; name?: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectNotEnabled, setConnectNotEnabled] = useState(false);
  const [platformProfileIncomplete, setPlatformProfileIncomplete] = useState(false);

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
    setPlatformProfileIncomplete(false);
    try {
      const res = await fetch(`${BASE}api/stripe/creator-connect/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, name, returnUrl: window.location.origin }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (res.status === 402 && data.error === "connect_not_enabled") { setConnectNotEnabled(true); setStarting(false); return; }
      if (res.status === 402 && data.error === "platform_profile_incomplete") { setPlatformProfileIncomplete(true); setStarting(false); return; }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed");
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Setup failed", description: String(err), variant: "destructive" });
      setStarting(false);
    }
  };

  const isReady = connectStatus?.payoutsEnabled && connectStatus?.detailsSubmitted;
  const inProgress = connectStatus?.connected && !isReady;

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/8">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            isReady ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
          )}>
            <Zap className={cn("h-4 w-4", isReady ? "text-green-400" : "text-yellow-400")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {isLoading ? "Checking…" : isReady ? "Payouts enabled" : inProgress ? "Setup incomplete" : "Not connected"}
            </p>
            <p className="text-xs text-white/40">
              {isReady ? "Your bank account is connected and active." : "Connect via Stripe to receive payments."}
            </p>
          </div>
        </div>
        {!isLoading && (isReady
          ? <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
          : inProgress
          ? <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/25 text-xs"><Clock className="h-3 w-3 mr-1" />Incomplete</Badge>
          : <Badge variant="outline" className="text-white/40 text-xs border-white/15"><AlertTriangle className="h-3 w-3 mr-1" />Not set up</Badge>
        )}
      </div>

      {/* Warnings */}
      {(connectNotEnabled || platformProfileIncomplete) && (
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/25 space-y-2">
          <p className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {platformProfileIncomplete ? "Platform profile incomplete" : "Stripe Connect not enabled"}
          </p>
          <a
            href={platformProfileIncomplete
              ? "https://dashboard.stripe.com/settings/connect/platform-profile"
              : "https://dashboard.stripe.com/connect/accounts/overview"}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#C6FF00] font-medium underline underline-offset-2"
          >
            <ExternalLink className="h-3 w-3" />
            Open Stripe Dashboard →
          </a>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={startOnboarding} disabled={starting} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          {starting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Redirecting…</>
            : isReady ? <><ExternalLink className="h-3.5 w-3.5" />Manage Payout Account</>
            : inProgress ? <><ExternalLink className="h-3.5 w-3.5" />Finish Setup</>
            : <><Zap className="h-3.5 w-3.5" />Set Up Payouts</>}
        </Button>
        {connectStatus?.connected && (
          <Button variant="ghost" size="sm" onClick={async () => {
            setRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ["creator-connect-status", uid] });
            setRefreshing(false);
          }} disabled={refreshing} className="text-white/40 gap-1.5 h-9">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Brand Payment Setup ───────────────────────────────────────────────── */
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
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      toast({ title: "Setup failed", description: String(err), variant: "destructive" });
      setStarting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact payment row */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/8">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            hasPaymentMethod ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/10"
          )}>
            <CreditCard className={cn("h-4 w-4", hasPaymentMethod ? "text-green-400" : "text-white/40")} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {hasPaymentMethod ? "Payment method on file" : "No payment method"}
            </p>
            <p className="text-xs text-white/40">
              {hasPaymentMethod ? "Ready to fund campaigns and pay creators." : "Required to launch campaigns."}
            </p>
          </div>
        </div>
        <button
          onClick={startSetup}
          disabled={starting}
          className="text-xs font-semibold text-[#C6FF00] hover:text-[#d4ff33] transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {starting ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          {hasPaymentMethod ? "Manage →" : "Add →"}
        </button>
      </div>

      {/* Link to full billing */}
      <a
        href={`${BASE}billing`}
        className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.05] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Receipt className="h-4 w-4 text-white/40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Subscription & Plans</p>
            <p className="text-xs text-white/40">Currently on Free plan · 1 campaign</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-white/25 group-hover:text-white/50 transition-colors" />
      </a>
    </div>
  );
}

/* ─── Main Settings Page ─────────────────────────────────────────────────── */

type Tab = "profile" | "workspace" | "team" | "billing" | "notifications" | "ai";

const BRAND_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Briefcase },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Preferences", icon: BrainCircuit },
];

const CREATOR_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Creator Profile", icon: Briefcase },
  { id: "billing", label: "Payouts", icon: Zap },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Preferences", icon: BrainCircuit },
];

const MOCK_TEAM = [
  { name: "You", email: "", role: "Owner", self: true },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const onboarding = getOnboarded() as OnboardingData | null;
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [notifs, setNotifs] = useState<Notifications>(loadNotifs);
  const [aiPrefs, setAiPrefs] = useState<AiPrefs>(loadAiPrefs);
  const [aiSaved, setAiSaved] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const TABS = isCreator ? CREATOR_TABS : BRAND_TABS;

  const { data: subStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", user?.uid],
    queryFn: async () => {
      if (!user?.uid || isCreator) return { plan: "free", memberLimit: 0, status: "none" } as SubscriptionStatus;
      const res = await fetch(`${BASE}api/stripe/subscription/status?uid=${user.uid}`);
      if (!res.ok) return { plan: "free", memberLimit: 0, status: "none" } as SubscriptionStatus;
      return res.json();
    },
    enabled: !!user?.uid && !isCreator,
    staleTime: 1000 * 60 * 5,
  });

  // Handle Stripe return callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnect = params.get("stripe_connect");
    const stripeSetup = params.get("stripe_setup");
    const stripeSub = params.get("stripe_sub");
    if (stripeConnect === "complete") {
      toast({ title: "Stripe connected!", description: "Your payout account is being verified." });
      queryClient.invalidateQueries({ queryKey: ["creator-connect-status"] });
      navigate("/settings", { replace: true });
      setTab("billing");
    } else if (stripeConnect === "refresh") {
      toast({ title: "Session expired", description: "Please start the Stripe setup again." });
      navigate("/settings", { replace: true });
    } else if (stripeSetup === "complete") {
      toast({ title: "Payment method saved!", description: "You can now fund campaigns and pay creators." });
      queryClient.invalidateQueries({ queryKey: ["user-stripe-status"] });
      navigate("/settings", { replace: true });
      setTab("billing");
    } else if (stripeSetup === "cancelled") {
      navigate("/settings", { replace: true });
    } else if (stripeSub === "complete") {
      toast({ title: "Subscription activated!", description: "Your 14-day free trial has started." });
      navigate("/settings", { replace: true });
      setTab("billing");
    } else if (stripeSub === "cancelled") {
      navigate("/settings", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setProfileSaved(true);
    toast({ title: "Profile saved" });
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveNotifs = (next: Notifications) => {
    setNotifs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  const saveAiPrefs = () => {
    localStorage.setItem(AIPREF_KEY, JSON.stringify(aiPrefs));
    setAiSaved(true);
    toast({ title: "AI preferences saved" });
    setTimeout(() => setAiSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account, workspace, and preferences.</p>
      </div>

      <div className="flex gap-8">
        {/* Left nav */}
        <nav className="shrink-0 w-40 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-all",
                tab === id
                  ? "bg-white/8 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/4"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >

              {/* ── PROFILE ───────────────────────────────────────────── */}
              {tab === "profile" && (
                <div className="space-y-6">
                  {/* Avatar + identity */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
                    <SectionHead title="Account" desc="Your identity on BrandOps." />
                    <div className="flex items-center gap-4">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="avatar" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#C6FF00]/20" />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0">
                          <span className="text-lg font-black text-[#C6FF00]">
                            {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">{user?.displayName ?? "—"}</p>
                        <p className="text-sm text-white/40">{user?.email}</p>
                        <span className="inline-block mt-1.5 text-xs bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 rounded px-2 py-0.5 font-medium">
                          {onboarding?.accountType ?? "Brand"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 divide-y divide-white/5">
                      <SettingRow label="Email" desc={user?.email ?? "—"}>
                        <span className="text-xs text-white/30 bg-white/5 border border-white/8 rounded px-2 py-1">Managed by Google</span>
                      </SettingRow>
                      <SettingRow label="Password" desc="Reset via email link">
                        <button
                          onClick={async () => {
                            toast({ title: "Reset email sent", description: "Check your inbox for a password reset link." });
                          }}
                          className="text-xs font-semibold text-[#C6FF00] hover:text-[#d4ff33] transition-colors"
                        >
                          Send reset →
                        </button>
                      </SettingRow>
                      <SettingRow label="Two-factor authentication" desc="Add an extra layer of security">
                        <span className="text-xs text-white/25 bg-white/5 border border-white/8 rounded px-2 py-1">Coming soon</span>
                      </SettingRow>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
                    <SectionHead title="Session" />
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out of BrandOps
                    </button>
                  </div>

                  {/* Danger zone */}
                  <div className="p-5 rounded-2xl bg-red-500/[0.04] border border-red-500/20 space-y-3">
                    <SectionHead title="Danger Zone" desc="Irreversible actions — proceed with care." />
                    <button
                      onClick={() => setDeletingAccount(true)}
                      className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete account
                    </button>
                    {deletingAccount && (
                      <div className="pt-2 space-y-3">
                        <p className="text-xs text-white/50">
                          This permanently deletes your account, all campaigns, and removes you from the platform.
                          This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              toast({ title: "Contact support", description: "Email legal@brandops.io to request account deletion." });
                              setDeletingAccount(false);
                            }}
                            className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Yes, delete my account
                          </button>
                          <button onClick={() => setDeletingAccount(false)} className="text-xs text-white/40 hover:text-white transition-colors px-2">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── WORKSPACE ─────────────────────────────────────────── */}
              {tab === "workspace" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-5">
                    <SectionHead
                      title={isCreator ? "Creator Profile" : "Workspace"}
                      desc={isCreator ? "Your public creator identity." : "Your brand's presence on BrandOps."}
                    />
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="brand-name" className="text-xs text-white/50 uppercase tracking-widest">
                          {isCreator ? "Display Name" : "Brand Name"}
                        </Label>
                        <Input
                          id="brand-name"
                          placeholder={isCreator ? "Your creator name" : "Your brand name"}
                          value={profile.brandName}
                          onChange={(e) => setProfile(p => ({ ...p, brandName: e.target.value }))}
                          className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="website" className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          {isCreator ? "Portfolio / Link" : "Website"}
                        </Label>
                        <Input
                          id="website"
                          placeholder={isCreator ? "https://yourportfolio.com" : "https://yourbrand.com"}
                          value={profile.website}
                          onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                          className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                        />
                      </div>
                      {!isCreator && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-white/50 uppercase tracking-widest">Logo</Label>
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Briefcase className="h-4 w-4 text-white/25" />
                            </div>
                            <div>
                              <p className="text-xs text-white/50">Upload a logo (PNG, SVG, max 2 MB)</p>
                              <button className="text-xs text-[#C6FF00] mt-0.5 font-medium">Choose file →</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={saveProfile}
                      className={cn(
                        "gap-2 transition-all",
                        profileSaved ? "bg-green-600 hover:bg-green-600" : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {profileSaved ? <><Check className="h-3.5 w-3.5" />Saved</> : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── TEAM ──────────────────────────────────────────────── */}
              {tab === "team" && (() => {
                const plan = subStatus?.plan ?? "free";
                const memberLimit = subStatus?.memberLimit ?? 0;
                const canInvite = plan === "growth" || plan === "enterprise";
                const isUnlimited = plan === "enterprise" || memberLimit === null;
                const slotsUsed = 1; // owner counts as 1
                const slotsRemaining = isUnlimited ? null : Math.max(0, (memberLimit ?? 0) - (slotsUsed - 1));

                return (
                  <div className="space-y-6">
                    {/* Paywall banner for free / starter */}
                    {!canInvite && (
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                        {/* blurred bg glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#C6FF00]/5 via-transparent to-transparent pointer-events-none" />
                        <div className="relative p-6 flex flex-col items-center text-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-[#C6FF00]" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">Team members are a paid feature</p>
                            <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto">
                              {plan === "starter"
                                ? "Your Starter plan includes 1 user (owner only). Upgrade to Growth to add up to 5 teammates."
                                : "The free plan includes 1 user (owner only). Upgrade to Growth to add up to 5 teammates, or Enterprise for unlimited."}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => navigate("/billing")}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C6FF00] text-black text-sm font-semibold hover:bg-[#d4ff33] transition-colors"
                            >
                              Upgrade to Growth <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => navigate("/billing")}
                              className="text-sm text-white/40 hover:text-white/70 transition-colors"
                            >
                              View plans
                            </button>
                          </div>
                          {/* Plan comparison hint */}
                          <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-white/6">
                            {[
                              { name: "Starter", seats: "1 seat", locked: true },
                              { name: "Growth", seats: "5 seats", locked: false },
                              { name: "Enterprise", seats: "Unlimited", locked: false },
                            ].map(({ name, seats, locked }) => (
                              <div key={name} className={cn("p-2.5 rounded-xl border text-center", locked ? "border-white/8 bg-white/[0.02]" : "border-[#C6FF00]/20 bg-[#C6FF00]/5")}>
                                <p className={cn("text-xs font-semibold", locked ? "text-white/30" : "text-[#C6FF00]")}>{name}</p>
                                <p className={cn("text-xs mt-0.5", locked ? "text-white/20" : "text-white/50")}>{seats}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Members list — always visible */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-5">
                      <div className="flex items-center justify-between">
                        <SectionHead title="Team Members" desc="People who have access to your BrandOps workspace." />
                        {canInvite && (
                          <span className="text-xs text-white/40 shrink-0">
                            {isUnlimited ? "Unlimited seats" : `${slotsRemaining} seat${slotsRemaining === 1 ? "" : "s"} remaining`}
                          </span>
                        )}
                      </div>

                      {/* Owner row — always visible */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                          <div className="w-8 h-8 rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#C6FF00]">{(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user?.displayName ?? user?.email ?? "You"} <span className="text-white/30 text-xs">(you)</span>
                            </p>
                            <p className="text-xs text-white/35 truncate">{user?.email ?? ""}</p>
                          </div>
                          <span className="text-xs text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded px-2 py-0.5 font-medium shrink-0">Owner</span>
                        </div>

                        {/* Empty seat slots shown for Growth */}
                        {canInvite && !isUnlimited && Array.from({ length: memberLimit ?? 0 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/8 text-white/20">
                            <div className="w-8 h-8 rounded-full border border-dashed border-white/10 flex items-center justify-center shrink-0">
                              <UsersRound className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-xs">Empty seat — invite a teammate</p>
                          </div>
                        ))}
                      </div>

                      {/* Invite form — Growth and Enterprise only */}
                      {canInvite && (
                        <div className="pt-2 space-y-3 border-t border-white/6">
                          <p className="text-sm font-semibold text-white">Invite member</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="teammate@company.com"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                            />
                            <Button
                              onClick={() => {
                                if (!inviteEmail.trim()) return;
                                toast({ title: "Invite sent", description: `An invite was sent to ${inviteEmail}.` });
                                setInviteEmail("");
                              }}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Invite
                            </Button>
                          </div>
                          <p className="text-xs text-white/30">Teammates will receive an email to join your workspace.</p>
                        </div>
                      )}
                    </div>

                    {/* Role guide */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
                      <SectionHead title="Roles" desc="What each role can do." />
                      <div className="space-y-3">
                        {[
                          { role: "Owner", desc: "Full access — billing, settings, team management, all campaigns." },
                          { role: "Admin", desc: "Create and manage campaigns, approve submissions, manage creators." },
                          { role: "Manager", desc: "Manage assigned campaigns, review submissions. No billing access." },
                          { role: "Viewer", desc: "Read-only access to campaigns and analytics." },
                        ].map(({ role, desc }) => (
                          <div key={role} className="flex items-start gap-3">
                            <span className="text-xs text-white/60 bg-white/5 border border-white/10 rounded px-2 py-0.5 font-semibold shrink-0 mt-0.5 w-16 text-center">{role}</span>
                            <p className="text-xs text-white/40">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── BILLING ───────────────────────────────────────────── */}
              {tab === "billing" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-5">
                    <SectionHead
                      title={isCreator ? "Payout Setup" : "Billing"}
                      desc={isCreator ? "Connect your bank account to receive creator payments." : "Manage your payment method and subscription."}
                    />
                    {user && (
                      isCreator
                        ? <CreatorPayoutSetup uid={user.uid} email={user.email ?? ""} name={user.displayName} />
                        : <BrandPaymentSetup uid={user.uid} email={user.email ?? ""} name={user.displayName} />
                    )}
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ─────────────────────────────────────── */}
              {tab === "notifications" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8">
                    <SectionHead title="Email Notifications" desc="Choose what we send to your inbox." />
                    <div className="divide-y divide-white/5">
                      <SettingRow label="Creator submissions" desc="When a creator submits a video to your campaign">
                        <Toggle checked={notifs.submissions} onChange={v => saveNotifs({ ...notifs, submissions: v })} />
                      </SettingRow>
                      <SettingRow label="Campaign updates" desc="Status changes, brief edits, and milestones">
                        <Toggle checked={notifs.campaigns} onChange={v => saveNotifs({ ...notifs, campaigns: v })} />
                      </SettingRow>
                      <SettingRow label="Payment confirmations" desc="Payout receipts and subscription renewals">
                        <Toggle checked={notifs.payments} onChange={v => saveNotifs({ ...notifs, payments: v })} />
                      </SettingRow>
                      <SettingRow label="Weekly digest" desc="A summary of your workspace activity every Monday">
                        <Toggle checked={notifs.digest} onChange={v => saveNotifs({ ...notifs, digest: v })} />
                      </SettingRow>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AI PREFERENCES ────────────────────────────────────── */}
              {tab === "ai" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-5">
                    <SectionHead title="AI Preferences" desc="Tune how the AI Assistant and campaign builder work for you." />
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                          <Target className="h-3 w-3" />
                          Default creator niches
                        </Label>
                        <Input
                          placeholder="e.g. Fitness, Tech, Lifestyle"
                          value={aiPrefs.defaultNiches}
                          onChange={e => setAiPrefs(p => ({ ...p, defaultNiches: e.target.value }))}
                          className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                        />
                        <p className="text-xs text-white/30">These are pre-filled when you create campaigns.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Default campaign goal
                        </Label>
                        <Input
                          placeholder="e.g. Drive product page conversions"
                          value={aiPrefs.defaultGoal}
                          onChange={e => setAiPrefs(p => ({ ...p, defaultGoal: e.target.value }))}
                          className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                          <BrainCircuit className="h-3 w-3" />
                          Content style preferences
                        </Label>
                        <Input
                          placeholder="e.g. Authentic, unboxing-style, no heavy editing"
                          value={aiPrefs.contentStyle}
                          onChange={e => setAiPrefs(p => ({ ...p, contentStyle: e.target.value }))}
                          className="bg-white/5 border-white/10 focus:border-[#C6FF00]/40"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={saveAiPrefs}
                      className={cn("gap-2 transition-all", aiSaved ? "bg-green-600 hover:bg-green-600" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                    >
                      {aiSaved ? <><Check className="h-3.5 w-3.5" />Saved</> : "Save Preferences"}
                    </Button>
                  </div>

                  {/* Onboarding data — collapsed */}
                  {onboarding && (
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHead title="Onboarding Snapshot" desc="Your initial setup — used to personalize AI context." />
                        <button
                          onClick={() => { clearOnboarded(); window.location.href = "/onboarding"; }}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors shrink-0"
                        >
                          Re-run →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Account Type", value: onboarding.accountType },
                          { label: isCreator ? "Content Style" : "Goal", value: onboarding.goal },
                          { label: isCreator ? "Target Rate" : "Budget", value: onboarding.budget },
                          { label: isCreator ? "Turnaround" : "Team Size", value: isCreator ? onboarding.turnaround : onboarding.teamSize },
                        ].filter(r => r.value).map(({ label, value }) => (
                          <div key={label} className="p-3 rounded-lg bg-white/[0.03] border border-white/6">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">{label}</p>
                            <p className="text-sm font-medium text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                      {onboarding.niches?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {onboarding.niches.map(n => (
                            <span key={n} className="text-xs bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/20 rounded-full px-2 py-0.5">{n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
