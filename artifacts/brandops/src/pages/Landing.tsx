import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles, Zap, Users, CheckCircle2, TrendingUp,
  ArrowRight, Star, ChevronDown, Bot,
  Megaphone, CreditCard, Eye, BarChart3,
  Clock, DollarSign, Shield, Cpu, Play,
  Check, Menu, X
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function Navbar() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoPath} alt="BrandOps" className="h-7 w-auto" />
          <span className="font-bold text-lg tracking-tight text-white">BrandOps</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <button
              onClick={() => setLocation("/dashboard")}
              className="px-5 py-2 rounded-lg bg-[#C6FF00] text-black font-semibold text-sm hover:bg-[#d4ff33] transition-colors"
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button
                onClick={() => setLocation("/login")}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => setLocation("/signup")}
                className="px-5 py-2 rounded-lg bg-[#C6FF00] text-black font-semibold text-sm hover:bg-[#d4ff33] transition-colors"
              >
                Start Free
              </button>
            </>
          )}
        </div>

        <button
          className="md:hidden text-white/70 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-[#0a0a0a]"
          >
            <div className="px-6 py-4 space-y-3">
              {["#how", "#features", "#pricing", "#faq"].map((href, i) => (
                <a key={href} href={href} className="block text-sm text-white/60 hover:text-white" onClick={() => setMobileOpen(false)}>
                  {["How it works", "Features", "Pricing", "FAQ"][i]}
                </a>
              ))}
              <button
                onClick={() => setLocation("/signup")}
                className="w-full mt-2 py-2.5 rounded-lg bg-[#C6FF00] text-black font-semibold text-sm"
              >
                Start Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-[#C6FF00]/10 rounded-2xl blur-3xl" />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#0d0d0d] border-b border-white/5 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 mx-4 bg-white/5 rounded-md h-5 text-xs text-white/30 flex items-center px-3">
            app.brandops.io/dashboard
          </div>
        </div>

        <div className="flex h-[340px]">
          <div className="w-44 border-r border-white/5 bg-[#0d0d0d] p-3 space-y-1 shrink-0">
            <div className="mb-4 px-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#C6FF00]/20 flex items-center justify-center">
                <Zap className="h-3 w-3 text-[#C6FF00]" />
              </div>
              <span className="text-xs font-bold text-white">BrandOps</span>
            </div>
            {["Dashboard", "Campaigns", "Creators", "Analytics", "AI Assistant"].map((item, i) => (
              <div key={item} className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                i === 0 ? "bg-[#C6FF00]/10 text-[#C6FF00]" : "text-white/40"
              )}>
                <div className="w-3 h-3 rounded-sm bg-current opacity-60" />
                {item}
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-semibold">Command Center</div>
                <div className="text-white/40 text-xs">AI-powered insights</div>
              </div>
              <div className="bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#C6FF00]" />
                <span className="text-[#C6FF00] text-xs font-medium">Create with AI</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Active Campaigns", val: "12", icon: Megaphone, trend: "+3" },
                { label: "Total Views", val: "2.4M", icon: Eye, trend: "+18%" },
                { label: "Payout Queue", val: "$8,240", icon: DollarSign, trend: "6 pending" },
                { label: "Avg ROI", val: "4.2x", icon: TrendingUp, trend: "+0.8x" },
              ].map(({ label, val, icon: Icon, trend }) => (
                <div key={label} className="bg-white/3 border border-white/5 rounded-lg p-2.5">
                  <div className="text-white/40 text-xs mb-1 flex items-center justify-between">
                    <span>{label}</span>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="text-white font-bold text-sm">{val}</div>
                  <div className="text-[#C6FF00] text-xs mt-0.5">{trend}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#C6FF00]/5 border border-[#C6FF00]/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-3.5 w-3.5 text-[#C6FF00]" />
                <span className="text-[#C6FF00] text-xs font-medium">AI Insight</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">
                Fitness creators 50k–150k are outperforming larger creators by 31% this month. Scale budget here.
              </p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-8 top-8 bg-[#111] border border-white/10 rounded-xl p-3 shadow-xl w-44"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#C6FF00]/20 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#C6FF00]" />
          </div>
          <span className="text-white text-xs font-medium">Payout sent!</span>
        </div>
        <div className="text-white/50 text-xs">@taylorm earned $450</div>
        <div className="text-[#C6FF00] text-xs mt-1">via Stripe Connect</div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-8 bottom-12 bg-[#111] border border-white/10 rounded-xl p-3 shadow-xl w-48"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-[#C6FF00]" />
          <span className="text-white text-xs font-medium">AI Match Found</span>
        </div>
        <div className="text-white/50 text-xs">3 creators, 94% fit score</div>
        <div className="mt-2 flex -space-x-1.5">
          {["#C6FF00", "#a3e635", "#84cc16"].map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border border-[#111] flex items-center justify-center" style={{ backgroundColor: c + "33" }}>
              <Users className="h-3 w-3" style={{ color: c }} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const HOW_IT_WORKS = [
  { step: "01", icon: DollarSign, title: "Set your budget", desc: "Define your campaign budget, platform, and creator requirements in seconds." },
  { step: "02", icon: Sparkles, title: "AI builds your campaign", desc: "Our AI generates the full brief — hooks, CTAs, creator instructions, and timeline." },
  { step: "03", icon: Users, title: "Creators submit videos", desc: "Matched creators receive your brief and submit UGC content directly to BrandOps." },
  { step: "04", icon: CheckCircle2, title: "AI reviews, you approve", desc: "AI scores every video across 5 dimensions. You approve with one click." },
  { step: "05", icon: CreditCard, title: "Automatic payouts", desc: "Approved creators are paid instantly via Stripe Connect. No manual work." },
];

const FEATURES = [
  {
    icon: Sparkles,
    tag: "AI Campaign Builder",
    title: "Launch campaigns in 60 seconds",
    desc: "Describe your product. Our AI generates the entire campaign brief — hook ideas, CTAs, creator instructions, usage rights, payout strategy, and timeline.",
    bullets: ["Streaming AI generation", "Editable sections", "Regenerate any section", "Publish directly to creators"],
    color: "from-[#C6FF00]/20 to-transparent",
    mockup: (
      <div className="bg-[#0d0d0d] rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#C6FF00]" />
          <span className="text-white text-sm font-medium">AI Campaign Generator</span>
        </div>
        <div className="space-y-2">
          {["Generating campaign title...", "Writing creator brief...", "Crafting hook ideas...", "Setting payout strategy..."].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6FF00]" />
              <span className="text-white/60 text-xs">{step}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#C6FF00]/5 border border-[#C6FF00]/10 rounded-lg p-3">
          <div className="text-white text-sm font-semibold mb-1">Summer Glow Campaign 🌟</div>
          <div className="text-white/50 text-xs leading-relaxed">Create an authentic unboxing video showing your first impression. Hook: "I tried this product for 30 days and..."</div>
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    tag: "Creator Discovery",
    title: "Find creators that actually convert",
    desc: "AI matches creators to your campaign based on niche, engagement rate, audience quality, and past performance — not just follower count.",
    bullets: ["AI match scoring", "Engagement rate analysis", "Audience overlap detection", "Performance history"],
    color: "from-blue-500/20 to-transparent",
    mockup: (
      <div className="bg-[#0d0d0d] rounded-xl border border-white/5 p-4 space-y-2">
        {[
          { name: "@fitnessguru", handle: "TikTok", match: 97, followers: "142k", eng: "6.8%" },
          { name: "@lifestylejen", handle: "Instagram", match: 91, followers: "89k", eng: "5.2%" },
          { name: "@healthyvibes", handle: "YouTube", match: 88, followers: "203k", eng: "4.1%" },
        ].map(({ name, handle, match, followers, eng }) => (
          <div key={name} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg p-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C6FF00]/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-[#C6FF00]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium">{name}</div>
              <div className="text-white/40 text-xs">{followers} · {eng} eng</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[#C6FF00] text-xs font-bold">{match}%</div>
              <div className="text-white/30 text-xs">match</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Eye,
    tag: "AI Submission Review",
    title: "Review content 10x faster with AI",
    desc: "Every submitted video is automatically scored across Hook Strength, Brand Fit, Conversion Potential, Authenticity, and Product Visibility.",
    bullets: ["5-dimension AI scoring", "Instant recommendations", "Approve or revision requests", "Auto payout on approval"],
    color: "from-purple-500/20 to-transparent",
    mockup: (
      <div className="bg-[#0d0d0d] rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">AI Score Card</span>
          <span className="text-[#C6FF00] font-bold">87/100</span>
        </div>
        {[
          { label: "Hook Strength", score: 92 },
          { label: "Brand Fit", score: 88 },
          { label: "Conversion Potential", score: 84 },
          { label: "Authenticity", score: 90 },
          { label: "Product Visibility", score: 81 },
        ].map(({ label, score }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">{label}</span>
              <span className="text-white/80">{score}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#C6FF00] rounded-full" style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Head of Marketing, Luminary",
    avatar: "SC",
    quote: "BrandOps cut our campaign setup time from days to 20 minutes. The AI brief generator is genuinely magic — our creators say they've never had such clear instructions.",
    stars: 5,
  },
  {
    name: "Marcus Williams",
    role: "Founder, GrowthStack Agency",
    avatar: "MW",
    quote: "We manage 40+ brands and BrandOps has replaced 3 different tools. The AI submission review alone saves us 15+ hours per week.",
    stars: 5,
  },
  {
    name: "Priya Sharma",
    role: "eCommerce Director, Nuvela",
    avatar: "PS",
    quote: "The creator match algorithm is incredible. Our ROI jumped 3.2x in the first month because we were finally reaching the right audiences.",
    stars: 5,
  },
];

const PRICING = [
  {
    name: "Starter",
    monthlyPrice: 49,
    annualMonthly: 24.5,
    annualTotal: 294,
    desc: "For solo founders and small brands just getting started.",
    features: ["3 active campaigns", "50 creator slots", "AI campaign builder", "Basic analytics", "Stripe payouts", "Email support"],
    cta: "Start Free Trial",
    highlight: false,
    stripeMonthly: "price_1TcK62BUl8zlcM3knvtdpFiN",
    stripeAnnual: "price_1TcK6TBUl8zlcM3kxKUJu2Wt",
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    annualMonthly: 74.5,
    annualTotal: 894,
    desc: "For growing brands running multiple campaigns.",
    features: ["Unlimited campaigns", "500 creator slots", "AI campaign builder", "AI submission review", "Advanced analytics", "AI assistant", "Priority support", "Team members (5)"],
    cta: "Start Free Trial",
    highlight: true,
    stripeMonthly: "price_1TcK62BUl8zlcM3k0XFy9OXv",
    stripeAnnual: "price_1TcK6TBUl8zlcM3kmsgowctu",
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualMonthly: null,
    annualTotal: null,
    desc: "For agencies and enterprise brands at scale.",
    features: ["Unlimited everything", "Custom creator network", "White-label option", "Custom AI training", "Dedicated account manager", "SLA guarantee", "Custom integrations"],
    cta: "Contact Sales",
    highlight: false,
    stripeMonthly: null,
    stripeAnnual: null,
  },
];

const FAQS = [
  {
    q: "How does the AI campaign builder work?",
    a: "You enter your product details, budget, and goals. Our AI (powered by GPT-4) generates a complete campaign brief including creator instructions, hook ideas, CTAs, usage rights, and payout strategy — all in under 60 seconds.",
  },
  {
    q: "How are creators paid?",
    a: "BrandOps uses Stripe Connect for all payouts. Once you approve a submission, payment is automatically triggered to the creator's connected Stripe account. No manual work required.",
  },
  {
    q: "How does AI creator matching work?",
    a: "Our matching algorithm analyzes engagement rate, audience demographics, niche alignment, content style, and past campaign performance to score each creator's fit for your specific campaign.",
  },
  {
    q: "Can I use BrandOps for multiple brands or clients?",
    a: "Yes. Our Growth and Enterprise plans support team members and multiple workspace configurations, making BrandOps perfect for agencies managing multiple brand clients.",
  },
  {
    q: "How does BrandOps handle video distribution?",
    a: "BrandOps manages the production side — briefs, submissions, and approvals. Once you approve a video, you own it fully and run it on your own brand channels, paid ad accounts, product pages, or anywhere else you choose. Creators produce the content; you control where it goes.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — Starter and Growth plans both come with a 14-day free trial with no credit card required. You can test the full AI feature set during your trial.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-white font-medium text-sm">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-white/40 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-white/50 text-sm leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C6FF00]/4 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-blue-500/3 blur-[100px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-purple-500/3 blur-[80px] rounded-full" />
      </div>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto"
        >
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-full px-4 py-1.5 text-sm text-[#C6FF00] mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered creator campaign management
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              The AI Operating System
              <br />
              <span className="text-[#C6FF00]">for Creator Campaigns</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              Launch UGC campaigns, manage creators, review submissions, and automate payouts — all powered by AI. From brief to payout in one platform.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setLocation("/signup")}
                className="px-8 py-4 rounded-xl bg-[#C6FF00] text-black font-bold text-base hover:bg-[#d4ff33] transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(198,255,0,0.3)]"
              >
                Start Free — No credit card
              </button>
              <a
                href="#how"
                className="px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-base hover:bg-white/5 transition-colors flex items-center gap-2 justify-center"
              >
                <Play className="h-4 w-4" />
                See how it works
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-white/30 text-sm mt-6">
              14-day free trial · No contracts · Cancel anytime
            </motion.p>
          </div>

          <motion.div variants={fadeUp}>
            <DashboardMockup />
          </motion.div>
        </motion.div>
      </section>

      {/* Trusted by */}
      <section className="py-16 border-y border-white/5 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-white/30 text-sm mb-10 uppercase tracking-widest font-medium">Trusted by modern brands</p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {["Luminary", "NuvelaCo", "GrowthStack", "Veloce", "Brandify", "Nexlify"].map((brand) => (
              <div key={brand} className="text-white/20 font-bold text-lg tracking-tight hover:text-white/40 transition-colors">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-[#C6FF00] text-sm font-semibold tracking-widest uppercase mb-4">How it works</div>
            <h2 className="text-4xl font-black">From idea to payout in 5 steps</h2>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
                )}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-[#C6FF00]/30 transition-colors h-full">
                  <div className="text-[#C6FF00]/40 text-xs font-bold mb-4 font-mono">{step}</div>
                  <div className="w-10 h-10 rounded-xl bg-[#C6FF00]/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-[#C6FF00]" />
                  </div>
                  <div className="font-semibold text-sm mb-2">{title}</div>
                  <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {FEATURES.map(({ icon: Icon, tag, title, desc, bullets, color, mockup }, i) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className={cn("grid md:grid-cols-2 gap-12 items-center", i % 2 === 1 && "md:[&>*:first-child]:order-2")}
            >
              <div>
                <div className="inline-flex items-center gap-2 bg-[#C6FF00]/10 border border-[#C6FF00]/20 rounded-full px-3 py-1 text-xs text-[#C6FF00] mb-6">
                  <Icon className="h-3.5 w-3.5" />
                  {tag}
                </div>
                <h3 className="text-3xl font-black mb-4 leading-tight">{title}</h3>
                <p className="text-white/50 leading-relaxed mb-8">{desc}</p>
                <ul className="space-y-3">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-sm text-white/70">
                      <div className="w-5 h-5 rounded-full bg-[#C6FF00]/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-[#C6FF00]" />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn("relative rounded-2xl p-6 bg-gradient-to-br border border-white/5", color)}>
                {mockup}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-[#C6FF00] text-sm font-semibold tracking-widest uppercase mb-4">Testimonials</div>
            <h2 className="text-4xl font-black">Brands that ship faster with BrandOps</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, avatar, quote, stars }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-[#C6FF00]/20 transition-colors"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(stars)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#C6FF00] text-[#C6FF00]" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-6">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center">
                    <span className="text-[#C6FF00] text-xs font-bold">{avatar}</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{name}</div>
                    <div className="text-white/40 text-xs">{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[#C6FF00] text-sm font-semibold tracking-widest uppercase mb-4">Pricing</div>
            <h2 className="text-4xl font-black mb-4">Simple, transparent pricing</h2>
            <p className="text-white/50 mb-8">14-day free trial on all plans. No credit card required.</p>

            {/* Billing toggle */}
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

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map(({ name, monthlyPrice, annualMonthly, annualTotal, desc, features, cta, highlight }, i) => {
              const displayPrice = annual ? annualMonthly : monthlyPrice;
              const originalPrice = annual ? monthlyPrice : null;
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "rounded-2xl border p-7 flex flex-col relative",
                    highlight
                      ? "bg-[#C6FF00]/5 border-[#C6FF00]/30 shadow-[0_0_60px_rgba(198,255,0,0.08)]"
                      : "bg-white/3 border-white/8"
                  )}
                >
                  {highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C6FF00] text-black text-xs font-bold px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <div className="text-white font-bold text-lg mb-1">{name}</div>
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
                        {annual && annualTotal && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[#C6FF00] text-xs mt-1 font-medium"
                          >
                            Billed ${annualTotal}/year · 50% off
                          </motion.p>
                        )}
                        {!annual && (
                          <p className="text-white/30 text-xs mt-1">or ${annualMonthly}/mo billed yearly</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-3xl font-black">Custom</div>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                        <Check className={cn("h-4 w-4 shrink-0", highlight ? "text-[#C6FF00]" : "text-white/40")} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setLocation("/login")}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold text-sm transition-all",
                      highlight
                        ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33] hover:scale-105"
                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {cta}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-white/[0.01] border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-[#C6FF00] text-sm font-semibold tracking-widest uppercase mb-4">FAQ</div>
            <h2 className="text-4xl font-black">Common questions</h2>
          </motion.div>
          <div>
            {FAQS.map((faq) => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-[#C6FF00]/20 blur-3xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-[#C6FF00]" />
            </div>
          </div>
          <h2 className="text-5xl font-black mb-6">
            Ready to launch your
            <br />
            <span className="text-[#C6FF00]">AI creator operation?</span>
          </h2>
          <p className="text-white/50 text-lg mb-10">
            Join brands that are scaling UGC campaigns with AI — faster, cheaper, and smarter than ever.
          </p>
          <button
            onClick={() => setLocation("/signup")}
            className="px-10 py-5 rounded-xl bg-[#C6FF00] text-black font-bold text-lg hover:bg-[#d4ff33] transition-all hover:scale-105 active:scale-95 shadow-[0_0_60px_rgba(198,255,0,0.4)]"
          >
            Start Free Today →
          </button>
          <p className="text-white/30 text-sm mt-6">14-day trial · No credit card · Cancel anytime</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="BrandOps" className="h-6 w-auto" />
            <span className="font-bold text-sm text-white/60">BrandOps</span>
          </div>
          <div className="flex gap-8 text-sm text-white/30">
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Security</span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">Status</span>
          </div>
          <p className="text-white/20 text-xs">© 2026 BrandOps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
