import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Check, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnboarded } from "@/lib/onboarding";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const PRICING = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    annualMonthly: 24.5,
    annualTotal: 294,
    desc: "For solo founders and small brands just getting started.",
    features: [
      "3 active campaigns",
      "50 creator slots",
      "AI campaign builder",
      "Basic analytics",
      "Stripe payouts",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 149,
    annualMonthly: 74.5,
    annualTotal: 894,
    desc: "For growing brands running multiple campaigns.",
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
    cta: "Start Free Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    annualMonthly: null,
    annualTotal: null,
    desc: "For agencies and enterprise brands at scale.",
    features: [
      "Unlimited everything",
      "Custom creator network",
      "White-label option",
      "Custom AI training",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
    ],
    cta: "Contact Sales",
  },
];

function recommendPlan(budget: string, teamSize: string): "starter" | "growth" | "enterprise" {
  const budgetLower = (budget ?? "").toLowerCase();
  const teamLower = (teamSize ?? "").toLowerCase();

  // Enterprise signals
  const enterpriseBudget = ["$20k", "$50k", "$200k", "$1m", "1m+"];
  const enterpriseTeam = ["20+", "50+", "11–50", "enterprise"];
  if (enterpriseBudget.some(k => budgetLower.includes(k.toLowerCase()))) return "enterprise";
  if (enterpriseTeam.some(k => teamLower.includes(k.toLowerCase()))) return "enterprise";

  // Growth signals
  const growthBudget = ["$1k", "$5k", "$10k"];
  const growthTeam = ["2–5", "2–10", "6–20"];
  if (growthBudget.some(k => budgetLower.includes(k.toLowerCase()))) return "growth";
  if (growthTeam.some(k => teamLower.includes(k.toLowerCase()))) return "growth";

  return "starter";
}

function getPersonalizedReason(
  recommended: string,
  budget: string,
  teamSize: string,
  goal: string,
  accountType: string
): string {
  const budgetNote = budget ? `your ${budget} budget` : "your budget";
  const teamNote = teamSize ? teamSize.toLowerCase() : "your team";

  if (recommended === "enterprise") {
    return `With ${budgetNote} and ${teamNote}, Enterprise gives you unlimited scale, a dedicated account manager, and custom AI training.`;
  }
  if (recommended === "growth") {
    const goalMap: Record<string, string> = {
      "get_creators": "scaling your creator roster",
      "run_campaigns": "running multiple campaigns",
      "scale_ugc": "scaling UGC production",
      "performance": "driving ROAS",
      "brand": "building brand awareness",
    };
    const goalText = goalMap[goal] ?? "your goals";
    return `Growth is the right fit — unlimited campaigns, AI submission review, and the advanced analytics you need for ${goalText}.`;
  }
  return `Starter covers everything you need to launch your first campaigns, source creators, and run payouts — no bloat, just results.`;
}

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const [annual, setAnnual] = useState(false);
  const onboarding = getOnboarded();

  const budget = onboarding?.budget ?? "";
  const teamSize = onboarding?.teamSize ?? "";
  const goal = onboarding?.goal ?? "";
  const accountType = onboarding?.accountType ?? "Brand";
  const niches = onboarding?.niches ?? [];

  const recommended = recommendPlan(budget, teamSize);
  const reason = getPersonalizedReason(recommended, budget, teamSize, goal, accountType);

  const firstName = (() => {
    try {
      const name = (window as Window & { __brandops_user_name?: string }).__brandops_user_name;
      return name?.split(" ")[0] ?? "";
    } catch { return ""; }
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
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

      <div className="flex-1 flex flex-col items-center justify-start px-6 py-12 overflow-y-auto">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full max-w-5xl space-y-10"
        >
          {/* Headline */}
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-full px-4 py-1.5 text-xs font-semibold text-[#C6FF00] mb-2">
              <Sparkles className="h-3 w-3" />
              You're set up — pick your plan
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              {firstName ? `${firstName}, you're` : "You're"} one step away
            </h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
              14-day free trial. No credit card required. Cancel anytime.
            </p>
          </motion.div>

          {/* Personalized recommendation callout */}
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
                <span className="text-[#C6FF00]">
                  {PRICING.find(p => p.id === recommended)?.name}
                </span>
                {budget && (
                  <span className="text-white/50 font-normal"> based on your {budget} budget</span>
                )}
                {niches.length > 0 && (
                  <span className="text-white/50 font-normal"> in {niches.slice(0, 2).join(", ")}</span>
                )}
              </p>
              <p className="text-sm text-white/50 leading-relaxed">{reason}</p>
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
            {PRICING.map(({ id, name, monthlyPrice, annualMonthly, annualTotal, desc, features, cta }, i) => {
              const isRecommended = id === recommended;
              const displayPrice = annual ? annualMonthly : monthlyPrice;
              const originalPrice = annual ? monthlyPrice : null;

              return (
                <motion.div
                  key={id}
                  variants={fadeUp}
                  transition={{ delay: i * 0.07 }}
                  className={cn(
                    "rounded-2xl border p-7 flex flex-col relative",
                    isRecommended
                      ? "bg-[#C6FF00]/5 border-[#C6FF00]/35 shadow-[0_0_60px_rgba(198,255,0,0.1)]"
                      : "bg-white/[0.03] border-white/8"
                  )}
                >
                  {isRecommended && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C6FF00] text-black text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap">
                      Recommended for you
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-lg">{name}</span>
                      {isRecommended && (
                        <span className="text-[10px] font-bold text-[#C6FF00] bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded px-1.5 py-0.5">BEST FIT</span>
                      )}
                    </div>
                    <p className="text-white/40 text-sm">{desc}</p>
                  </div>

                  <div className="mb-6">
                    {displayPrice ? (
                      <div>
                        <div className="flex items-end gap-2">
                          {originalPrice && annual && (
                            <span className="text-white/30 line-through text-xl font-bold mb-0.5">${originalPrice}</span>
                          )}
                          <span className="text-4xl font-black">${displayPrice}</span>
                          <span className="text-white/40 text-sm mb-1">/mo</span>
                        </div>
                        <AnimatePresence mode="wait">
                          {annual && annualTotal ? (
                            <motion.p
                              key="annual"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="text-[#C6FF00] text-xs mt-1 font-medium"
                            >
                              Billed ${annualTotal}/year · 50% off
                            </motion.p>
                          ) : (
                            <motion.p
                              key="monthly"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="text-white/30 text-xs mt-1"
                            >
                              or ${annualMonthly}/mo billed yearly
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="text-3xl font-black">Custom</div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                        <Check className={cn(
                          "h-4 w-4 shrink-0",
                          isRecommended ? "text-[#C6FF00]" : "text-white/30"
                        )} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setLocation("/dashboard")}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
                      isRecommended
                        ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33] hover:scale-[1.02] shadow-[0_0_30px_rgba(198,255,0,0.2)]"
                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {cta}
                    {isRecommended && <ArrowRight className="h-4 w-4" />}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Skip */}
          <motion.div variants={fadeUp} className="text-center pb-6">
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-sm text-white/25 hover:text-white/50 transition-colors underline underline-offset-4"
            >
              Skip for now — explore the dashboard first
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
