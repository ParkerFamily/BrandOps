import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Check, Zap, ShoppingBag, Building2, Users, Rocket,
  User, Laptop, DollarSign, Target, TrendingUp, Megaphone,
  Smartphone, Globe, Loader2, Sparkles, Bot, BarChart3,
  Play, ArrowRight, UserCheck, Video, Star, ChevronRight,
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "brandops_onboarded";
const ACCOUNT_TYPE_KEY = "brandops_account_type";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface OnboardingData {
  accountType: string;
  goal: string;
  platforms: string[];
  budget: string;
  niches: string[];
  teamSize: string;
}

/* ─── Left panel visual data per step ──────────────────────────────────── */

const AI_MESSAGES: Record<number, string[]> = {
  0: ["Let's build your creator operation.", "Personalized to your exact use case.", "Takes about 60 seconds."],
  1: ["Goal unlocks your AI campaign templates.", "Matching strategy to your outcome…", "Most agencies prioritize awareness first."],
  2: ["Platform data syncs with your dashboard.", "Creator pools pre-filtered by platform.", "TikTok has the highest avg. engagement rate."],
  3: ["Budget unlocks creator tier recommendations.", "AI payout strategies auto-configured.", "ROI modeling based on your budget range."],
  4: ["Niche sharpens your creator matching.", "AI finds top-performing niche creators.", "Category benchmarks loaded into your dashboard."],
  5: ["Team size configures collaboration tools.", "Roles and permissions auto-assigned.", "Your workspace is almost ready."],
};

const STEP_STATS: Record<number, { label: string; value: string; delta?: string }[]> = {
  0: [
    { label: "Creators indexed", value: "2.4M+" },
    { label: "Avg. campaign ROI", value: "4.2x" },
    { label: "Brands launched", value: "12,800" },
  ],
  1: [
    { label: "Sales campaigns", value: "3.8x ROI" },
    { label: "Awareness reach", value: "18M avg" },
    { label: "App install CPR", value: "$0.38" },
  ],
  2: [
    { label: "TikTok creators", value: "940K" },
    { label: "Instagram creators", value: "820K" },
    { label: "YouTube creators", value: "410K" },
  ],
  3: [
    { label: "Avg. creator deal", value: "$340" },
    { label: "Budget efficiency", value: "89%" },
    { label: "Payout speed", value: "< 24h" },
  ],
  4: [
    { label: "Beauty creators", value: "182K" },
    { label: "Fitness creators", value: "96K" },
    { label: "Tech creators", value: "74K" },
  ],
  5: [
    { label: "Team features", value: "Unlocked" },
    { label: "AI briefs/mo", value: "Unlimited" },
    { label: "Setup time", value: "< 2 min" },
  ],
};

const FLOATING_CREATORS = [
  { name: "Maya Chen", handle: "@mayabeauty", eng: "7.2%", badge: "Top Pick", color: "from-purple-500/20 to-pink-500/20" },
  { name: "Jake Rivers", handle: "@jakefit", eng: "9.1%", badge: "High ROI", color: "from-blue-500/20 to-cyan-500/20" },
  { name: "Sofia Valle", handle: "@sofiastyle", eng: "6.4%", badge: "Trending", color: "from-orange-500/20 to-amber-500/20" },
  { name: "Liam Park", handle: "@liamtech", eng: "11.3%", badge: "Best Match", color: "from-[#C6FF00]/20 to-lime-500/20" },
];

/* ─── Sub-components ───────────────────────────────────────────────────── */

function FloatingCreatorCard({ creator, delay, y }: { creator: typeof FLOATING_CREATORS[0]; delay: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [y, y - 10, y] }}
      transition={{ opacity: { delay, duration: 0.4 }, scale: { delay, duration: 0.4 }, y: { duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay: delay * 0.5 } }}
      className={cn("absolute bg-gradient-to-br border border-white/10 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2.5 shadow-lg", creator.color)}
    >
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {creator.name[0]}
      </div>
      <div className="min-w-0">
        <div className="text-white text-xs font-semibold truncate">{creator.name}</div>
        <div className="text-white/50 text-[10px]">{creator.handle}</div>
      </div>
      <div className="ml-1 flex flex-col items-end">
        <div className="text-[#C6FF00] text-xs font-bold">{creator.eng}</div>
        <div className="text-white/40 text-[9px]">eng</div>
      </div>
    </motion.div>
  );
}

function LiveNotification({ text, delay }: { text: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs"
        >
          <div className="w-1.5 h-1.5 bg-[#C6FF00] rounded-full animate-pulse shrink-0" />
          <span className="text-white/70">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LeftPanel({ step, data }: { step: number; data: OnboardingData }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = AI_MESSAGES[Math.min(step, 5)] ?? AI_MESSAGES[0];
  const stats = STEP_STATS[Math.min(step, 5)] ?? STEP_STATS[0];

  useEffect(() => {
    setMsgIdx(0);
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 2800);
    return () => clearInterval(t);
  }, [step, messages.length]);

  const contextLabel = data.accountType
    ? `Configured for ${data.accountType}`
    : "Personalizing your workspace…";

  return (
    <div className="hidden lg:flex flex-col h-full bg-[#0d0d0d] border-r border-white/5 relative overflow-hidden p-8 justify-between">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-[#C6FF00]/4 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/5 blur-[80px] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2 mb-8">
        <img src={logoPath} alt="BrandOps" className="h-8 w-auto" />
        <span className="text-white font-bold text-lg">BrandOps</span>
      </div>

      {/* Floating creator cards */}
      <div className="relative flex-1 min-h-0">
        <div className="relative h-full">
          {FLOATING_CREATORS.map((c, i) => (
            <FloatingCreatorCard
              key={c.name}
              creator={c}
              delay={i * 0.2}
              y={[0, 80, 160, 240][i]}
            />
          ))}

          {/* Mini dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-0 right-0 w-56 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#0d0d0d] px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/70" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
              <div className="w-2 h-2 rounded-full bg-[#C6FF00]/70" />
              <span className="text-white/20 text-[9px] ml-1">dashboard</span>
            </div>
            <div className="p-3 space-y-2">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.12 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-white/40 text-[9px]">{s.label}</span>
                  <span className="text-[#C6FF00] text-[10px] font-bold">{s.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live notifications */}
      <div className="relative z-10 space-y-2 my-4">
        <LiveNotification text="New creator matched to your profile" delay={1200} />
        <LiveNotification text="AI campaign template ready" delay={2400} />
      </div>

      {/* Context label */}
      <div className="relative z-10 flex items-center gap-2 bg-[#C6FF00]/8 border border-[#C6FF00]/20 rounded-xl px-3 py-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-[#C6FF00] shrink-0" />
        <span className="text-[#C6FF00] text-xs font-medium">{contextLabel}</span>
      </div>

      {/* AI message */}
      <div className="relative z-10 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-[#C6FF00]" />
        </div>
        <div className="flex-1 bg-white/4 border border-white/8 rounded-2xl rounded-tl-sm px-3 py-2.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-white/70 text-xs leading-relaxed"
            >
              {messages[msgIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SelectCard({ icon: Icon, label, desc, selected, onClick }: {
  icon: React.ElementType; label: string; desc?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative text-left p-4 rounded-2xl border transition-all duration-200 group",
        selected
          ? "border-[#C6FF00]/60 bg-[#C6FF00]/8 shadow-[0_0_24px_rgba(198,255,0,0.12)]"
          : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center">
          <Check className="h-3 w-3 text-black" />
        </div>
      )}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", selected ? "bg-[#C6FF00]/20" : "bg-white/5 group-hover:bg-white/8")}>
        <Icon className={cn("h-5 w-5", selected ? "text-[#C6FF00]" : "text-white/50 group-hover:text-white/70")} />
      </div>
      <div className={cn("font-semibold text-sm mb-0.5", selected ? "text-white" : "text-white/70")}>{label}</div>
      {desc && <div className="text-white/30 text-xs leading-snug">{desc}</div>}
    </motion.button>
  );
}

function PillToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
        selected
          ? "border-[#C6FF00]/60 bg-[#C6FF00]/10 text-[#C6FF00]"
          : "border-white/10 bg-white/2 text-white/50 hover:border-white/20 hover:text-white/80"
      )}
    >
      {label}
    </motion.button>
  );
}

/* ─── Step configs ──────────────────────────────────────────────────────── */

const ACCOUNT_TYPES = [
  { icon: ShoppingBag, label: "Brand", desc: "Sell products via UGC campaigns" },
  { icon: Building2, label: "Agency", desc: "Manage multiple brand clients" },
  { icon: Rocket, label: "Startup", desc: "Scale growth through creators" },
  { icon: User, label: "Solo Founder", desc: "Bootstrap with creator content" },
  { icon: Laptop, label: "App Founder", desc: "Drive installs via creators" },
  { icon: Globe, label: "Ecommerce Brand", desc: "Convert with product UGC" },
  { icon: Users, label: "Creator Manager", desc: "Manage a roster of creators" },
  { icon: Star, label: "Creator", desc: "Join brand campaigns & earn" },
];

const GOALS = [
  { icon: TrendingUp, label: "Drive Sales", desc: "Turn UGC into direct revenue" },
  { icon: Megaphone, label: "Brand Awareness", desc: "Grow reach and share of voice" },
  { icon: Smartphone, label: "App Installs", desc: "Acquire users via creator content" },
  { icon: Sparkles, label: "Organic UGC", desc: "Build an authentic content library" },
  { icon: Target, label: "Paid Ads", desc: "Source high-performing ad creative" },
  { icon: Video, label: "Product Launch", desc: "Create launch momentum fast" },
];

const PLATFORMS = [
  { icon: SiTiktok, label: "TikTok", stat: "940K creators" },
  { icon: SiInstagram, label: "Instagram", stat: "820K creators" },
  { icon: SiYoutube, label: "YouTube", stat: "410K creators" },
  { icon: Globe, label: "All Platforms", stat: "2.4M total" },
];

const BUDGETS = [
  { label: "< $1k/mo", value: "under-1k", roi: "2.1x avg ROI" },
  { label: "$1k–$5k", value: "1k-5k", roi: "3.4x avg ROI" },
  { label: "$5k–$20k", value: "5k-20k", roi: "4.2x avg ROI" },
  { label: "$20k–$50k", value: "20k-50k", roi: "5.8x avg ROI" },
  { label: "$50k+", value: "50k-plus", roi: "7.1x avg ROI" },
];

const NICHES = ["Beauty", "Fitness", "Food & Drink", "Fashion", "Tech", "Lifestyle", "Finance", "Gaming", "Travel", "Health", "Pets", "Home & Decor"];

const TEAM_SIZES = [
  { icon: User, label: "Just me", desc: "Solo operator" },
  { icon: Users, label: "2–5 people", desc: "Small team" },
  { icon: Building2, label: "6–20 people", desc: "Growing team" },
  { icon: Globe, label: "20+ people", desc: "Enterprise" },
];

const CREATOR_ROLES = ["Creator", "Creator Manager"];
const TOTAL_STEPS = 6;

/* ─── AI Loading screen ─────────────────────────────────────────────────── */

function AILoadingScreen({ data, onDone }: { data: OnboardingData; onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const isCreator = CREATOR_ROLES.includes(data.accountType);
  const steps = [
    "Analyzing your profile…",
    `Building ${data.accountType || "your"} creator recommendations…`,
    `Calibrating for ${data.goal || "your goals"}…`,
    `Loading ${data.platforms.join(" & ") || "platform"} creator pools…`,
    "Configuring AI campaign templates…",
    "Your workspace is ready ✓",
  ];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setStepIdx(i);
      if (i >= steps.length - 1) {
        clearInterval(t);
        setTimeout(onDone, 1000);
      }
    }, 650);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C6FF00]/6 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-10"
      >
        <div className="absolute inset-0 bg-[#C6FF00]/25 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-3xl bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-12 w-12 text-[#C6FF00]" />
          </motion.div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-black text-white mb-3 text-center"
      >
        {isCreator ? "Setting up your creator hub" : "Building your AI workspace"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/40 mb-12 text-center text-sm"
      >
        Personalizing everything for {data.accountType || "you"}…
      </motion.p>

      <div className="w-full max-w-sm space-y-3.5">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn("flex items-center gap-3 text-sm", i <= stepIdx ? "text-white" : "text-white/20")}
          >
            {i < stepIdx ? (
              <div className="w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-black" />
              </div>
            ) : i === stepIdx ? (
              <Loader2 className="h-5 w-5 text-[#C6FF00] animate-spin shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" />
            )}
            {s}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-12 w-full max-w-sm h-0.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#C6FF00] rounded-full"
          animate={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

/* ─── Main Onboarding component ─────────────────────────────────────────── */

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);

  const prefilledType = localStorage.getItem(ACCOUNT_TYPE_KEY) ?? "";
  const [data, setData] = useState<OnboardingData>({
    accountType: prefilledType,
    goal: "",
    platforms: [],
    budget: "",
    niches: [],
    teamSize: "",
  });

  const isCreator = CREATOR_ROLES.includes(data.accountType);

  const set = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const toggle = (k: "platforms" | "niches", v: string) =>
    setData((d) => {
      const arr = d[k] as string[];
      return { ...d, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const canProceed = () => {
    if (step === 0) return !!data.accountType;
    if (step === 1) return !!data.goal;
    if (step === 2) return data.platforms.length > 0;
    if (step === 3) return !!data.budget;
    if (step === 4) return data.niches.length > 0;
    if (step === 5) return !!data.teamSize;
    return true;
  };

  const next = () => {
    if (!canProceed()) return;
    setDir(1);
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else setLoading(true);
  };

  const prev = () => {
    if (step === 0) return;
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleDone = async () => {
    const payload = { ...data, completedAt: new Date().toISOString() };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(payload));
    localStorage.removeItem(ACCOUNT_TYPE_KEY);
    if (auth.currentUser) {
      try { await updateProfile(auth.currentUser, { displayName: auth.currentUser.displayName ?? "" }); } catch {}
    }
    setLocation(isCreator ? "/settings" : "/dashboard");
  };

  const STEP_TITLES = [
    { label: "Account type", question: "Who are you?", sub: "This personalizes your entire BrandOps experience." },
    { label: "Goal", question: "What's your #1 goal?", sub: "Your primary outcome drives your AI campaign strategy." },
    { label: "Platforms", question: "Where does your audience live?", sub: "Select all platforms you want to activate creators on." },
    { label: "Budget", question: "What's your monthly creator budget?", sub: "Used to configure creator tiers and ROI projections." },
    { label: "Niche", question: "What's your product niche?", sub: "AI matches you with creators who know your category." },
    { label: "Team", question: "How big is your team?", sub: "Configures collaboration tools and workspace permissions." },
  ];

  const current = STEP_TITLES[step];

  if (loading) {
    return <AILoadingScreen data={data} onDone={handleDone} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* ── Left panel (desktop only) ─────────────────────────── */}
      <div className="w-[380px] shrink-0">
        <LeftPanel step={step} data={data} />
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logoPath} alt="BrandOps" className="h-7 w-auto" />
            <span className="font-bold text-white text-sm">BrandOps</span>
          </div>
          <div className="hidden lg:block" />

          {/* Step pills */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 h-2 bg-[#C6FF00]"
                    : i < step
                    ? "w-2 h-2 bg-[#C6FF00]/40"
                    : "w-2 h-2 bg-white/10"
                )}
              />
            ))}
          </div>

          <span className="text-white/30 text-xs">Step {step + 1} of {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="h-px bg-white/5">
          <motion.div
            className="h-full bg-[#C6FF00]"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 py-10">
          <div className="w-full max-w-xl">
            <AnimatePresence custom={dir} mode="wait">
              <motion.div
                key={step}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="space-y-8"
              >
                {/* Header */}
                <div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-2 bg-[#C6FF00]/8 border border-[#C6FF00]/20 rounded-full px-3 py-1 text-xs text-[#C6FF00] mb-4"
                  >
                    <Sparkles className="h-3 w-3" />
                    {current.label}
                  </motion.div>
                  <h2 className="text-3xl font-black text-white mb-2">{current.question}</h2>
                  <p className="text-white/40 text-sm">{current.sub}</p>
                </div>

                {/* ── Step 0: Account type ──────────────────────── */}
                {step === 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ACCOUNT_TYPES.map(({ icon, label, desc }) => (
                      <SelectCard key={label} icon={icon} label={label} desc={desc} selected={data.accountType === label} onClick={() => set("accountType", label)} />
                    ))}
                  </div>
                )}

                {/* ── Step 1: Goal ──────────────────────────────── */}
                {step === 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GOALS.map(({ icon, label, desc }) => (
                      <SelectCard key={label} icon={icon} label={label} desc={desc} selected={data.goal === label} onClick={() => set("goal", label)} />
                    ))}
                  </div>
                )}

                {/* ── Step 2: Platforms ────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PLATFORMS.map(({ icon: Icon, label, stat }) => (
                        <motion.button
                          key={label}
                          onClick={() => toggle("platforms", label)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all",
                            data.platforms.includes(label)
                              ? "border-[#C6FF00]/60 bg-[#C6FF00]/8"
                              : "border-white/8 bg-white/2 hover:border-white/20"
                          )}
                        >
                          <Icon className={cn("h-6 w-6", data.platforms.includes(label) ? "text-[#C6FF00]" : "text-white/50")} />
                          <span className={cn("font-semibold text-sm", data.platforms.includes(label) ? "text-white" : "text-white/60")}>{label}</span>
                          <span className="text-white/30 text-xs">{stat}</span>
                        </motion.button>
                      ))}
                    </div>
                    {data.platforms.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 bg-[#C6FF00]/5 border border-[#C6FF00]/15 rounded-xl px-3 py-2.5 text-xs text-[#C6FF00]"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        {data.platforms.length} platform{data.platforms.length > 1 ? "s" : ""} selected — AI will filter creators accordingly
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Budget ───────────────────────────── */}
                {step === 3 && (
                  <div className="space-y-4">
                    {BUDGETS.map(({ label, value, roi }) => (
                      <motion.button
                        key={value}
                        onClick={() => set("budget", value)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                          data.budget === value
                            ? "border-[#C6FF00]/60 bg-[#C6FF00]/8"
                            : "border-white/8 bg-white/2 hover:border-white/15"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            data.budget === value ? "border-[#C6FF00] bg-[#C6FF00]" : "border-white/20"
                          )}>
                            {data.budget === value && <div className="w-2 h-2 rounded-full bg-black" />}
                          </div>
                          <span className={cn("font-semibold text-sm", data.budget === value ? "text-white" : "text-white/70")}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", data.budget === value ? "text-[#C6FF00]" : "text-white/25 group-hover:text-white/40")}>
                            {roi}
                          </span>
                          <ChevronRight className={cn("h-3.5 w-3.5 transition-colors", data.budget === value ? "text-[#C6FF00]" : "text-white/20")} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* ── Step 4: Niche ────────────────────────────── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {NICHES.map((n) => (
                        <PillToggle key={n} label={n} selected={data.niches.includes(n)} onClick={() => toggle("niches", n)} />
                      ))}
                    </div>
                    {data.niches.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 bg-[#C6FF00]/5 border border-[#C6FF00]/15 rounded-xl px-3 py-2.5 text-xs text-[#C6FF00]"
                      >
                        <Bot className="h-3.5 w-3.5 shrink-0" />
                        AI matching {data.niches.length} niche{data.niches.length > 1 ? "s" : ""} across 2.4M creators
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── Step 5: Team size ────────────────────────── */}
                {step === 5 && (
                  <div className="grid grid-cols-2 gap-3">
                    {TEAM_SIZES.map(({ icon, label, desc }) => (
                      <SelectCard key={label} icon={icon} label={label} desc={desc} selected={data.teamSize === label} onClick={() => set("teamSize", label)} />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer nav */}
        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              step === 0 ? "text-white/15 cursor-default" : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            ← Back
          </button>

          <motion.button
            onClick={next}
            disabled={!canProceed()}
            whileHover={canProceed() ? { scale: 1.03 } : {}}
            whileTap={canProceed() ? { scale: 0.97 } : {}}
            className={cn(
              "px-7 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2",
              canProceed()
                ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33] shadow-[0_0_20px_rgba(198,255,0,0.2)]"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            {step === TOTAL_STEPS - 1 ? (
              <><Zap className="h-4 w-4" /> Launch BrandOps</>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
