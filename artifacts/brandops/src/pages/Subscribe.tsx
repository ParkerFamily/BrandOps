import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Check, Sparkles, ArrowRight, ChevronRight, Lock, Zap, X,
  BarChart3, Bot, Users, Infinity, Video, CreditCard, Star,
  Play, TrendingUp, DollarSign, Shield, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboarded } from "@/lib/onboarding";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL;

/* ─── Pricing data ─────────────────────────────────────────────────────── */

const PRICING = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    annualMonthly: 24.5,
    annualTotal: 294,
    desc: "For solo founders and small brands just getting started.",
    stripeMonthly: "price_1TcYGnL8wN3kCgjXK1ffZG9F",
    stripeAnnual: "price_1TcYGnL8wN3kCgjXLhff0cBU",
    features: [
      "3 active campaigns",
      "50 creator slots",
      "AI campaign builder",
      "Basic analytics",
      "Stripe payouts",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 149,
    annualMonthly: 74.5,
    annualTotal: 894,
    desc: "For growing brands running multiple campaigns.",
    stripeMonthly: "price_1TcYGoL8wN3kCgjXSrhDw5iB",
    stripeAnnual: "price_1TcYGoL8wN3kCgjXo4rvaJq6",
    features: [
      "Unlimited campaigns",
      "500 creator slots",
      "AI campaign builder",
      "AI submission review",
      "Advanced analytics",
      "AI assistant",
      "Priority support",
      "Team members (5)",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualMonthly: null,
    annualTotal: null,
    desc: "For agencies and enterprise brands at scale.",
    stripeMonthly: null,
    stripeAnnual: null,
    features: [
      "Unlimited everything",
      "Custom creator network",
      "White-label option",
      "Custom AI training",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
    ],
  },
];

/* ─── Free tier limit comparison ───────────────────────────────────────── */

const FREE_LIMITS = [
  { icon: Video,    label: "Active campaigns",    free: "1 campaign",      paid: "3 – Unlimited" },
  { icon: Users,    label: "Creator slots",        free: "10 creators",     paid: "50 – 500+" },
  { icon: Bot,      label: "AI campaign builder",  free: "❌ Not included",  paid: "✓ Full access" },
  { icon: BarChart3,label: "Analytics",            free: "Basic only",      paid: "Advanced + AI insights" },
  { icon: Bot,      label: "AI submission review", free: "❌ Manual only",   paid: "✓ Automated" },
  { icon: Shield,   label: "Support",              free: "Community",       paid: "Email → Priority" },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function recommendPlan(budget: string, teamSize: string): "starter" | "growth" | "enterprise" {
  const b = (budget ?? "").toLowerCase();
  const t = (teamSize ?? "").toLowerCase();
  if (["$20k", "$50k", "$200k", "$1m", "1m+"].some(k => b.includes(k.toLowerCase()))) return "enterprise";
  if (["20+", "50+", "11–50", "enterprise"].some(k => t.includes(k.toLowerCase()))) return "enterprise";
  if (["$1k", "$5k", "$10k"].some(k => b.includes(k.toLowerCase()))) return "growth";
  if (["2–5", "2–10", "6–20"].some(k => t.includes(k.toLowerCase()))) return "growth";
  return "starter";
}

/* ─── Animation variants ────────────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ─── Creator upsell page ───────────────────────────────────────────────── */

function CreatorSubscribe({ name }: { name: string }) {
  const [, setLocation] = useLocation();

  const steps = [
    { icon: CreditCard, label: "Connect your bank", desc: "Set up Stripe payouts — takes 3 minutes. Required to receive payments." },
    { icon: Play,       label: "Browse active campaigns", desc: "See what brands are looking for and pick briefs that match your style." },
    { icon: DollarSign, label: "Submit & get paid",   desc: "Upload your video. Brand reviews it. Cash hits your account on approval." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] bg-[#C6FF00]/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#C6FF00] rounded-sm flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-black" />
          </div>
          <span className="font-bold text-base tracking-tight">BrandOps</span>
        </div>
        <button
          onClick={() => setLocation("/settings")}
          className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          Skip for now <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-2xl space-y-12"
        >
          {/* Hero */}
          <motion.div variants={fadeUp} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-full px-4 py-1.5 text-xs font-semibold text-[#C6FF00] mb-2">
              <Star className="h-3 w-3 fill-current" />
              You're in the creator network
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
              {name ? `${name},` : ""} start earning<br />
              <span className="text-[#C6FF00]">from your content</span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Brands pay <span className="text-white font-semibold">$100–$500 per approved video.</span><br />
              Set up your payout account to start collecting.
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div variants={stagger} className="space-y-4">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-[#C6FF00]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#C6FF00]/60 uppercase tracking-wider">Step {i + 1}</span>
                  </div>
                  <p className="font-bold text-white text-sm mb-0.5">{s.label}</p>
                  <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Earning proof */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 text-center">
            {[
              { val: "$250", sub: "avg. payout per video" },
              { val: "3–7d", sub: "avg. approval time" },
              { val: "94%", sub: "creator satisfaction" },
            ].map((stat) => (
              <div key={stat.val} className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <p className="text-2xl font-black text-[#C6FF00]">{stat.val}</p>
                <p className="text-xs text-white/40 mt-1">{stat.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={popIn} className="flex flex-col gap-3">
            <button
              onClick={() => setLocation("/settings")}
              className="w-full py-4 rounded-2xl bg-[#C6FF00] text-black font-black text-base hover:bg-[#d4ff33] transition-all hover:scale-[1.02] shadow-[0_0_40px_rgba(198,255,0,0.25)] flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" />
              Set Up Payouts — It's Free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLocation("/campaigns")}
              className="text-sm text-white/30 hover:text-white/60 transition-colors text-center"
            >
              Browse campaigns first →
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Brand upsell page ─────────────────────────────────────────────────── */

function BrandSubscribe({ name, onboarding }: {
  name: string;
  onboarding: ReturnType<typeof getOnboarded>;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [phase, setPhase] = useState<"reveal" | "plans">("reveal");

  const budget = onboarding?.budget ?? "";
  const teamSize = onboarding?.teamSize ?? "";
  const niches = onboarding?.niches ?? [];
  const recommended = recommendPlan(budget, teamSize);

  useEffect(() => {
    const t = setTimeout(() => setPhase("plans"), 2200);
    return () => clearTimeout(t);
  }, []);

  const startSubscription = async (priceId: string, planId: string) => {
    if (!user) return;
    setCheckoutLoading(planId);
    try {
      const r = await fetch(`${BASE}api/stripe/subscription/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email ?? "",
          name: user.displayName ?? user.email,
          priceId,
          returnUrl: window.location.origin,
        }),
      });
      if (!r.ok) throw new Error("Failed to start checkout");
      const { url } = await r.json() as { url: string };
      window.location.href = url;
    } catch {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[40%] w-[700px] h-[700px] bg-[#C6FF00]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#C6FF00] rounded-sm flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-black" />
          </div>
          <span className="font-bold text-base tracking-tight">BrandOps</span>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          Skip for now <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Phase 1: Cinematic hero reveal ── */}
      <AnimatePresence>
        {phase === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.5 } }}
            className="relative z-10 fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center space-y-5 px-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-full px-4 py-1.5 text-sm font-semibold text-[#C6FF00]"
              >
                <div className="w-2 h-2 rounded-full bg-[#C6FF00] animate-pulse" />
                Workspace ready
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-5xl sm:text-6xl font-black tracking-tight"
              >
                {name ? `${name}, you're` : "You're"}<br />
                <span className="text-[#C6FF00]">live.</span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex items-center justify-center gap-6"
              >
                {[
                  { val: niches.length ? niches[0] : "UGC", sub: "niche loaded" },
                  { val: budget || "Ready", sub: "budget configured" },
                  { val: "AI", sub: "assistant active" },
                ].map((s) => (
                  <div key={s.val} className="text-center">
                    <p className="text-xl font-black text-white">{s.val}</p>
                    <p className="text-xs text-white/35">{s.sub}</p>
                  </div>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                className="text-white/30 text-sm"
              >
                Setting up your plan…
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: Plans ── */}
      <AnimatePresence>
        {phase === "plans" && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative z-10 flex-1 overflow-y-auto"
          >
            <div className="flex flex-col items-center px-6 py-12">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="w-full max-w-5xl space-y-10"
              >
                {/* Headline */}
                <motion.div variants={fadeUp} className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-full px-4 py-1.5 text-xs font-semibold text-[#C6FF00]">
                    <Sparkles className="h-3 w-3" />
                    Your workspace is live — unlock the full platform
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                    {name ? `${name}, you're` : "You're"} on <span className="text-white/30">Free</span>
                  </h1>
                  <p className="text-white/50 text-base max-w-lg mx-auto leading-relaxed">
                    14-day free trial — no credit card required.
                    Start growing with the plan that fits your scale.
                  </p>
                </motion.div>

                {/* Free vs paid comparison */}
                <motion.div variants={fadeUp} className="rounded-2xl border border-white/8 overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/8">
                    <div className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Feature</div>
                    <div className="px-5 py-4 border-l border-white/8 text-center">
                      <span className="text-xs font-bold text-white/35 uppercase tracking-wider">Free plan</span>
                    </div>
                    <div className="px-5 py-4 border-l border-[#C6FF00]/20 bg-[#C6FF00]/5 text-center">
                      <span className="text-xs font-bold text-[#C6FF00] uppercase tracking-wider">✦ Starter / Growth</span>
                    </div>
                  </div>

                  {FREE_LIMITS.map(({ icon: Icon, label, free, paid }, i) => (
                    <div
                      key={label}
                      className={cn(
                        "grid grid-cols-3 border-b border-white/5 last:border-0",
                        i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                      )}
                    >
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
                        <span className="text-sm text-white/60">{label}</span>
                      </div>
                      <div className="flex items-center justify-center px-5 py-3.5 border-l border-white/5">
                        <span className={cn(
                          "text-sm text-center",
                          free.startsWith("❌") ? "text-red-400/70" : "text-white/35"
                        )}>
                          {free.startsWith("❌") ? (
                            <span className="flex items-center gap-1.5">
                              <X className="h-3.5 w-3.5" /> {free.replace("❌ ", "")}
                            </span>
                          ) : free}
                        </span>
                      </div>
                      <div className="flex items-center justify-center px-5 py-3.5 border-l border-[#C6FF00]/10 bg-[#C6FF00]/[0.03]">
                        <span className="text-sm text-[#C6FF00] font-medium text-center">
                          {paid.startsWith("✓") ? (
                            <span className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" /> {paid.replace("✓ ", "")}
                            </span>
                          ) : paid}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* AI recommendation callout */}
                <motion.div
                  variants={fadeUp}
                  className="max-w-xl mx-auto rounded-2xl border border-[#C6FF00]/20 bg-[#C6FF00]/5 p-5 flex gap-4"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#C6FF00]/15 border border-[#C6FF00]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-[#C6FF00]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      We recommend{" "}
                      <span className="text-[#C6FF00]">{PRICING.find(p => p.id === recommended)?.name}</span>
                      {budget && <span className="text-white/40 font-normal"> based on your {budget} budget</span>}
                      {niches.length > 0 && <span className="text-white/40 font-normal"> in {niches.slice(0, 2).join(", ")}</span>}
                    </p>
                    <p className="text-sm text-white/45 leading-relaxed">
                      {recommended === "growth"
                        ? "Unlimited campaigns and AI review tools will remove every bottleneck as your UGC volume scales."
                        : recommended === "enterprise"
                        ? "At your scale, dedicated support and custom AI training will compound your results."
                        : "Starter covers everything you need to launch your first campaigns, source creators, and run payouts."}
                    </p>
                  </div>
                </motion.div>

                {/* Billing toggle */}
                <motion.div variants={fadeUp} className="flex justify-center">
                  <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1">
                    <button
                      onClick={() => setAnnual(false)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-semibold transition-all",
                        !annual ? "bg-white text-black" : "text-white/50 hover:text-white"
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setAnnual(true)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
                        annual ? "bg-white text-black" : "text-white/50 hover:text-white"
                      )}
                    >
                      Yearly
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full transition-all",
                        annual ? "bg-[#C6FF00] text-black" : "bg-[#C6FF00]/20 text-[#C6FF00]"
                      )}>
                        Save 50%
                      </span>
                    </button>
                  </div>
                </motion.div>

                {/* Pricing cards */}
                <motion.div variants={stagger} className="grid md:grid-cols-3 gap-5">
                  {PRICING.map(({ id, name: planName, monthlyPrice, annualMonthly, annualTotal, desc, stripeMonthly, stripeAnnual, features }, i) => {
                    const isRec = id === recommended;
                    const displayPrice = annual ? annualMonthly : monthlyPrice;
                    const priceId = annual ? stripeAnnual : stripeMonthly;
                    const isLoading = checkoutLoading === id;

                    return (
                      <motion.div
                        key={id}
                        variants={popIn}
                        transition={{ delay: i * 0.07 }}
                        className={cn(
                          "rounded-2xl border p-7 flex flex-col relative",
                          isRec
                            ? "bg-[#C6FF00]/5 border-[#C6FF00]/35 shadow-[0_0_60px_rgba(198,255,0,0.1)]"
                            : "bg-white/[0.03] border-white/8"
                        )}
                      >
                        {isRec && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C6FF00] text-black text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap">
                            Recommended for you
                          </div>
                        )}

                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-lg">{planName}</span>
                            {isRec && (
                              <span className="text-[10px] font-bold text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded px-1.5 py-0.5">BEST FIT</span>
                            )}
                          </div>
                          <p className="text-white/40 text-sm">{desc}</p>
                        </div>

                        <div className="mb-5">
                          {displayPrice ? (
                            <div>
                              <div className="flex items-end gap-2">
                                {annual && monthlyPrice && (
                                  <span className="text-white/25 line-through text-xl font-bold mb-0.5">${monthlyPrice}</span>
                                )}
                                <span className="text-4xl font-black">${displayPrice}</span>
                                <span className="text-white/40 text-sm mb-1">/mo</span>
                              </div>
                              <AnimatePresence mode="wait">
                                {annual && annualTotal ? (
                                  <motion.p key="a" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="text-[#C6FF00] text-xs mt-1 font-medium">
                                    Billed ${annualTotal}/year · 50% off
                                  </motion.p>
                                ) : (
                                  <motion.p key="m" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="text-white/30 text-xs mt-1">
                                    or ${annualMonthly}/mo billed yearly
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <div className="text-3xl font-black">Custom</div>
                          )}
                        </div>

                        <ul className="space-y-3 mb-7 flex-1">
                          {features.map((f) => (
                            <li key={f} className="flex items-center gap-2.5 text-sm text-white/65">
                              <Check className={cn("h-4 w-4 shrink-0", isRec ? "text-[#C6FF00]" : "text-white/30")} />
                              {f}
                            </li>
                          ))}
                        </ul>

                        <button
                          disabled={isLoading || (id !== "enterprise" && !priceId)}
                          onClick={() => {
                            if (id === "enterprise") { setLocation("/dashboard"); return; }
                            if (priceId) startSubscription(priceId, id);
                          }}
                          className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                            isRec
                              ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33] hover:scale-[1.02] shadow-[0_0_30px_rgba(198,255,0,0.2)]"
                              : "bg-white/5 text-white hover:bg-white/10 border border-white/10",
                            isLoading && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {isLoading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Starting trial…</>
                          ) : id === "enterprise" ? (
                            "Contact Sales"
                          ) : (
                            <><TrendingUp className="h-4 w-4" /> Start 14-Day Free Trial {isRec && <ArrowRight className="h-4 w-4" />}</>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Proof strip */}
                <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 text-center">
                  {[
                    { val: "2,847", sub: "brands launched this month" },
                    { val: "14 days", sub: "free trial, no card needed" },
                    { val: "Cancel", sub: "anytime, no questions asked" },
                  ].map((s) => (
                    <div key={s.val}>
                      <p className="text-sm font-bold text-white">{s.val}</p>
                      <p className="text-xs text-white/30">{s.sub}</p>
                    </div>
                  ))}
                </motion.div>

                {/* Skip */}
                <motion.div variants={fadeUp} className="text-center pb-4">
                  <button
                    onClick={() => setLocation("/dashboard")}
                    className="text-sm text-white/20 hover:text-white/45 transition-colors underline underline-offset-4"
                  >
                    Explore the dashboard first — I'll subscribe later
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Root export ───────────────────────────────────────────────────────── */

export default function Subscribe() {
  const { user } = useAuth();
  const onboarding = getOnboarded();
  const accountType = onboarding?.accountType ?? "Brand";
  const isCreator = accountType === "Creator" || accountType === "Creator Manager";
  const name = user?.displayName?.split(" ")[0] ?? "";

  if (isCreator) return <CreatorSubscribe name={name} />;
  return <BrandSubscribe name={name} onboarding={onboarding} />;
}
