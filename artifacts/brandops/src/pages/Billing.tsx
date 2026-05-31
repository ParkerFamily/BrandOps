import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CreditCard, Sparkles, Loader2, RefreshCw, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getOnboarded } from "@/lib/onboarding";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;

const PRICING = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    annualMonthly: 24.5,
    annualTotal: 294,
    desc: "For solo founders and small brands just getting started.",
    highlight: false,
    stripeMonthly: "price_1TcYGnL8wN3kCgjXK1ffZG9F",
    stripeAnnual: "price_1TcYGnL8wN3kCgjXLhff0cBU",
    features: ["3 active campaigns", "50 creator slots", "AI campaign builder", "Basic analytics", "Stripe payouts", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 149,
    annualMonthly: 74.5,
    annualTotal: 894,
    desc: "For growing brands running multiple campaigns.",
    highlight: true,
    stripeMonthly: "price_1TcYGoL8wN3kCgjXSrhDw5iB",
    stripeAnnual: "price_1TcYGoL8wN3kCgjXo4rvaJq6",
    features: ["Unlimited campaigns", "500 creator slots", "AI campaign builder", "AI submission review", "Advanced analytics", "AI assistant", "Priority support", "Team members (5)"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualMonthly: null,
    annualTotal: null,
    desc: "For agencies and enterprise brands at scale.",
    highlight: false,
    stripeMonthly: null,
    stripeAnnual: null,
    features: ["Unlimited everything", "Custom creator network", "White-label option", "Custom AI training", "Dedicated account manager", "SLA guarantee", "Custom integrations"],
  },
];

interface BrandSetupStatus { ready: boolean; hasCustomer: boolean; hasPaymentMethod: boolean }

export default function Billing() {
  const { user } = useAuth();
  const onboarding = getOnboarded();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: payStatus } = useQuery<BrandSetupStatus>({
    queryKey: ["brand-setup-status", user?.uid],
    queryFn: async () => {
      if (!user) return { ready: false, hasCustomer: false, hasPaymentMethod: false };
      const r = await fetch(`${BASE}api/stripe/brand-setup/status?uid=${encodeURIComponent(user.uid)}`);
      if (!r.ok) return { ready: false, hasCustomer: false, hasPaymentMethod: false };
      return r.json();
    },
    enabled: !!user && !isCreator,
    staleTime: 30_000,
  });

  const startSubscription = async (priceId: string, planId: string) => {
    if (!user) return;
    setCheckoutLoading(planId);
    try {
      const r = await fetch(`${BASE}api/stripe/subscription/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, email: user.email ?? "", name: user.displayName ?? user.email, priceId, returnUrl: window.location.origin }),
      });
      if (!r.ok) throw new Error("Failed");
      const { url } = await r.json() as { url: string };
      window.location.href = url;
    } catch {
      setCheckoutLoading(null);
    }
  };

  const addPaymentMethod = async () => {
    if (!user) return;
    setCheckoutLoading("payment");
    try {
      const r = await fetch(`${BASE}api/stripe/brand-setup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, email: user.email ?? "", name: user.displayName ?? user.email, returnUrl: window.location.origin }),
      });
      if (!r.ok) throw new Error("Failed");
      const { url } = await r.json() as { url: string };
      window.location.href = url;
    } catch {
      setCheckoutLoading(null);
    }
  };

  if (isCreator) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Creators use BrandOps free — you earn through campaign payouts.</p>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <p className="font-bold text-white">You're on the Creator plan — it's always free</p>
          <p className="text-sm text-white/50">You earn $100–$500 per approved video. Set up your payout account in Settings to start collecting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing &amp; Plans</h1>
          <p className="text-muted-foreground mt-1">14-day free trial on all plans. No credit card required to start.</p>
        </div>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1 shrink-0">
          <button
            onClick={() => setAnnual(false)}
            className={cn("px-5 py-2 rounded-full text-sm font-semibold transition-all", !annual ? "bg-white text-black" : "text-white/50 hover:text-white")}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn("px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2", annual ? "bg-white text-black" : "text-white/50 hover:text-white")}
          >
            Yearly
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full transition-all", annual ? "bg-[#C6FF00] text-black" : "bg-[#C6FF00]/20 text-[#C6FF00]")}>
              Save 50%
            </span>
          </button>
        </div>
      </div>

      {/* Current plan banner */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/8">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <CreditCard className="h-4 w-4 text-white/40" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Current plan: <span className="text-white/50">Free</span></p>
          <p className="text-xs text-white/35">1 campaign · 10 creator slots · manual review only</p>
        </div>
        {payStatus?.ready ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
            <CheckCircle2 className="h-3 w-3" /> Payment method on file
          </span>
        ) : (
          <button
            onClick={addPaymentMethod}
            disabled={checkoutLoading === "payment"}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-full px-3 py-1.5 hover:bg-[#C6FF00]/20 transition-colors disabled:opacity-60"
          >
            {checkoutLoading === "payment" ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
            Add payment method
          </button>
        )}
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {PRICING.map(({ id, name, monthlyPrice, annualMonthly, annualTotal, desc, highlight, stripeMonthly, stripeAnnual, features }, i) => {
          const displayPrice = annual ? annualMonthly : monthlyPrice;
          const priceId = annual ? stripeAnnual : stripeMonthly;
          const isLoading = checkoutLoading === id;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "rounded-2xl border flex flex-col relative",
                highlight ? "pt-8 p-6 bg-[#C6FF00]/5 border-[#C6FF00]/30 shadow-[0_0_40px_rgba(198,255,0,0.06)]" : "p-6 bg-card border-card-border"
              )}
            >
              {highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C6FF00] text-black text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-base">{name}</span>
                  {highlight && <span className="text-[10px] font-bold text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded px-1.5 py-0.5">BEST FIT</span>}
                </div>
                <p className="text-white/40 text-xs">{desc}</p>
              </div>

              <div className="mb-5">
                {displayPrice ? (
                  <div>
                    <div className="flex items-end gap-2">
                      {annual && monthlyPrice && <span className="text-white/25 line-through text-lg font-bold mb-0.5">${monthlyPrice}</span>}
                      <span className="text-3xl font-black">${displayPrice}</span>
                      <span className="text-white/40 text-sm mb-1">/mo</span>
                    </div>
                    <AnimatePresence mode="wait">
                      {annual && annualTotal ? (
                        <motion.p key="a" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[#C6FF00] text-xs mt-1 font-medium">
                          Billed ${annualTotal}/year · 50% off
                        </motion.p>
                      ) : (
                        <motion.p key="m" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-white/30 text-xs mt-1">
                          or ${annualMonthly}/mo billed yearly
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-2xl font-black">Custom</div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className={cn("h-4 w-4 shrink-0", highlight ? "text-[#C6FF00]" : "text-white/40")} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isLoading}
                onClick={() => {
                  if (id === "enterprise") { window.open("mailto:sales@brandops.io?subject=Enterprise inquiry", "_blank"); return; }
                  if (priceId) startSubscription(priceId, id);
                }}
                className={cn(
                  "w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed",
                  highlight ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33]" : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                )}
              >
                {isLoading
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Redirecting…</>
                  : id === "enterprise" ? "Contact Sales" : "Start 14-Day Free Trial"
                }
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Fine print */}
      <p className="text-xs text-white/25 text-center">
        All plans include a 14-day free trial. Cancel anytime, no questions asked. Prices in USD.
      </p>
    </div>
  );
}
