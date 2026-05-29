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
  Mail, MonitorPlay, LayoutGrid, Briefcase, Package, RefreshCw, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPE_KEY = "brandops_account_type";

/* ─── Types ────────────────────────────────────────────────────────────── */

interface OnboardingData {
  accountType: string;
  goal: string;
  platforms: string[];
  budget: string;
  niches: string[];
  teamSize: string;
  turnaround: string;
}

/* ─── Left panel visual data per step ──────────────────────────────────── */

const AI_MESSAGES: Record<number, string[]> = {
  0: ["Let's build your creator operation.", "Personalized to your exact use case.", "Takes about 60 seconds."],
  1: ["Goal unlocks your AI campaign templates.", "Matching strategy to your outcome…", "Most agencies prioritize awareness first."],
  2: ["Video use case shapes your brief templates.", "AI configures asset specs for each channel.", "Paid ad UGC converts 4x better than branded content."],
  3: ["Budget unlocks creator tier recommendations.", "AI payout strategies auto-configured.", "ROI modeling based on your budget range."],
  4: ["Niche sharpens your creator matching.", "AI finds top-performing niche creators.", "Category benchmarks loaded into your dashboard."],
  5: ["Team size configures collaboration tools.", "Roles and permissions auto-assigned.", "Your workspace is almost ready."],
};

const CREATOR_AI_MESSAGES: Record<number, string[]> = {
  0: ["Sign up to get paid for your creativity.", "Brands come to you — no cold pitching.", "Takes about 60 seconds to set up."],
  1: ["Content style matches you with relevant briefs.", "Brands filter campaigns by video format.", "Product demos are the highest-demand right now."],
  2: ["Niche brands prefer niche creators.", "Category specialists earn 2x more per video.", "Your niche unlocks exclusive campaigns."],
  3: ["Your rate sets your minimum payout floor.", "AI matches you within your preferred range.", "Top creators here earn $300+ per video."],
  4: ["Fast delivery = more campaign invites.", "Brands prioritize reliable turnarounds.", "2–3 day creators get 3x more offers."],
  5: ["Better equipment = higher earning tier.", "Brands match to your production quality.", "Your setup unlocks the right campaign types."],
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
    { label: "Paid ad conversion lift", value: "4.1x" },
    { label: "Avg cost per video", value: "$220" },
    { label: "Formats supported", value: "All" },
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

const CREATOR_STEP_STATS: Record<number, { label: string; value: string }[]> = {
  0: [
    { label: "Active campaigns", value: "4,800+" },
    { label: "Avg payout / video", value: "$220" },
    { label: "Creators earning", value: "38,000" },
  ],
  1: [
    { label: "Product demo demand", value: "High" },
    { label: "Campaigns open now", value: "1,200+" },
    { label: "Avg demo payout", value: "$180" },
  ],
  2: [
    { label: "Beauty campaigns", value: "340" },
    { label: "Fitness campaigns", value: "210" },
    { label: "Tech campaigns", value: "185" },
  ],
  3: [
    { label: "Top creator rate", value: "$500+" },
    { label: "Avg deal size", value: "$220" },
    { label: "Payout speed", value: "< 24h" },
  ],
  4: [
    { label: "Fastest turnaround", value: "6h" },
    { label: "On-time rate target", value: "98%" },
    { label: "Avg revisions", value: "< 1" },
  ],
  5: [
    { label: "Smartphone creators", value: "68%" },
    { label: "DSLR tier earnings +", value: "40%" },
    { label: "Pro studio avg rate", value: "$420" },
  ],
};

const FLOATING_CREATORS = [
  { name: "Maya Chen", handle: "@mayabeauty", stat: "96% approval", badge: "Top Pick", color: "from-purple-500/20 to-pink-500/20" },
  { name: "Jake Rivers", handle: "@jakefit", stat: "3d avg", badge: "Fast Turnaround", color: "from-blue-500/20 to-cyan-500/20" },
  { name: "Sofia Valle", handle: "@sofiastyle", stat: "98% on-time", badge: "Reliable", color: "from-orange-500/20 to-amber-500/20" },
  { name: "Liam Park", handle: "@liamtech", stat: "94% approval", badge: "Best Match", color: "from-[#C6FF00]/20 to-lime-500/20" },
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
        <div className="text-[#C6FF00] text-xs font-bold">{creator.stat}</div>
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

function LeftPanel({ step, data, isCreator }: { step: number; data: OnboardingData; isCreator: boolean }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = (isCreator ? CREATOR_AI_MESSAGES : AI_MESSAGES)[Math.min(step, 5)] ?? AI_MESSAGES[0];
  const stats = (isCreator ? CREATOR_STEP_STATS : STEP_STATS)[Math.min(step, 5)] ?? STEP_STATS[0];

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

const NICHES = ["Beauty", "Fitness", "Food & Drink", "Fashion", "Tech", "Lifestyle", "Finance", "Gaming", "Travel", "Health", "Pets", "Home & Decor"];
const APP_NICHES = ["Gaming", "Productivity", "Health & Fitness", "Finance", "Social", "Shopping", "Education", "Entertainment", "Travel", "Food & Drink"];

const CREATOR_ROLES = ["Creator", "Creator Manager"];
const TOTAL_STEPS = 6;

/* ─── Per-account-type flow config ──────────────────────────────────────── */

type StepType = "grid-single" | "radio" | "multi-grid" | "multi-pills";
type ScalarField = "goal" | "budget" | "teamSize" | "turnaround";
type ArrayField = "platforms" | "niches";

interface FlowStep {
  label: string;
  question: string;
  sub: string;
  type: StepType;
  field: ScalarField | ArrayField;
  options: Array<{ icon?: LucideIcon; label: string; desc?: string; note?: string; stat?: string }>;
  confirmMsg?: (n: number) => string;
}

const BRAND_FLOW: FlowStep[] = [
  { label: "Goal", question: "What's your #1 goal?", sub: "Your primary outcome drives your AI campaign strategy.", type: "grid-single", field: "goal",
    options: [
      { icon: TrendingUp, label: "Drive Sales", desc: "Turn UGC into direct revenue" },
      { icon: Megaphone, label: "Brand Awareness", desc: "Grow reach and share of voice" },
      { icon: Sparkles, label: "Organic UGC", desc: "Build an authentic content library" },
      { icon: Target, label: "Paid Ad Creative", desc: "Source high-performing ad assets" },
      { icon: Video, label: "Product Launch", desc: "Create launch momentum fast" },
      { icon: Globe, label: "All of the above", desc: "Full-funnel UGC strategy" },
    ] },
  { label: "Video Use", question: "Where will you run the videos?", sub: "Select all channels where the brand distributes the content.", type: "multi-grid", field: "platforms",
    options: [
      { icon: Megaphone, label: "Paid Ads", stat: "Highest ROI" },
      { icon: ShoppingBag, label: "Product Pages", stat: "Boosts CVR" },
      { icon: MonitorPlay, label: "Organic Social", stat: "Brand channels" },
      { icon: Mail, label: "Email Campaigns", stat: "Embed in flows" },
      { icon: Globe, label: "Brand Website", stat: "Hero & landing" },
      { icon: LayoutGrid, label: "Everything", stat: "Multi-channel" },
    ],
    confirmMsg: (n) => `${n} channel${n > 1 ? "s" : ""} selected — brief templates configured` },
  { label: "Budget", question: "What's your monthly creator budget?", sub: "Configures creator tiers and payout recommendations.", type: "radio", field: "budget",
    options: [
      { label: "< $1k / mo", note: "2.1x avg ROI" },
      { label: "$1k – $5k", note: "3.4x avg ROI" },
      { label: "$5k – $20k", note: "4.2x avg ROI" },
      { label: "$20k – $50k", note: "5.8x avg ROI" },
      { label: "$50k+", note: "7.1x avg ROI" },
    ] },
  { label: "Niche", question: "What's your product niche?", sub: "AI matches you with creators who know your category.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `AI matching ${n} niche${n > 1 ? "s" : ""} across 2.4M creators` },
  { label: "Team", question: "How big is your team?", sub: "Configures collaboration tools and workspace permissions.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Just me", desc: "Solo operator" },
      { icon: Users, label: "2–5 people", desc: "Small team" },
      { icon: Building2, label: "6–20 people", desc: "Growing team" },
      { icon: Globe, label: "20+ people", desc: "Enterprise" },
    ] },
];

const AGENCY_FLOW: FlowStep[] = [
  { label: "Service Type", question: "What campaigns do you lead with?", sub: "Determines your default dashboard view and AI suggestions.", type: "grid-single", field: "goal",
    options: [
      { icon: TrendingUp, label: "Performance / ROAS", desc: "Drive measurable revenue" },
      { icon: Megaphone, label: "Brand & Awareness", desc: "Build recognition and reach" },
      { icon: Video, label: "Content Production", desc: "Scale high-volume UGC output" },
      { icon: Target, label: "Paid Media Buying", desc: "Source creative for paid ads" },
      { icon: LayoutGrid, label: "Full Service", desc: "End-to-end campaign management" },
      { icon: BarChart3, label: "Mixed / Varies", desc: "Depends on the client" },
    ] },
  { label: "Client Niches", question: "What niches are your clients in?", sub: "Pre-filters your creator pool by client industry.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} niche${n > 1 ? "s" : ""} added — creator pools filtered for your clients` },
  { label: "Total Spend", question: "Combined monthly UGC spend across all clients?", sub: "Configures your platform tier and account limits.", type: "radio", field: "budget",
    options: [
      { label: "< $10k / mo", note: "Starter agency" },
      { label: "$10k – $50k", note: "Growing agency" },
      { label: "$50k – $200k", note: "Mid-market" },
      { label: "$200k – $1M", note: "Enterprise agency" },
      { label: "$1M+", note: "Top-tier agency" },
    ] },
  { label: "Services", question: "What do you handle for your clients?", sub: "Unlocks the right workflow modules in your agency dashboard.", type: "multi-grid", field: "platforms",
    options: [
      { icon: FileText, label: "Brief Writing", stat: "Core service" },
      { icon: Users, label: "Creator Sourcing", stat: "High demand" },
      { icon: LayoutGrid, label: "Campaign Management", stat: "Most popular" },
      { icon: DollarSign, label: "Payment Processing", stat: "Full service" },
      { icon: BarChart3, label: "Reporting & Analytics", stat: "Retention driver" },
      { icon: Globe, label: "Everything", stat: "White-label" },
    ],
    confirmMsg: (n) => `${n} service${n > 1 ? "s" : ""} enabled — workflow tools configured` },
  { label: "Agency Size", question: "How big is your agency?", sub: "Sets up team roles, sub-accounts, and permissions.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Solo Consultant", desc: "Just you" },
      { icon: Users, label: "2–10 people", desc: "Boutique agency" },
      { icon: Building2, label: "11–50 people", desc: "Mid-size agency" },
      { icon: Globe, label: "50+ people", desc: "Large / enterprise" },
    ] },
];

const STARTUP_FLOW: FlowStep[] = [
  { label: "Stage", question: "What stage is your startup at?", sub: "Sets your growth benchmarks and AI campaign recommendations.", type: "grid-single", field: "goal",
    options: [
      { icon: Rocket, label: "Pre-launch", desc: "Building toward launch" },
      { icon: Zap, label: "Just Launched", desc: "Live, getting first users" },
      { icon: TrendingUp, label: "Early Traction", desc: "Seeing real growth signals" },
      { icon: BarChart3, label: "Scaling Fast", desc: "Strong PMF, growing quick" },
      { icon: Building2, label: "Series A+", desc: "Funded and expanding" },
      { icon: DollarSign, label: "Profitable", desc: "Profitable and reinvesting" },
    ] },
  { label: "Growth Goals", question: "What are you trying to achieve?", sub: "Select all goals you want to hit with UGC campaigns.", type: "multi-grid", field: "platforms",
    options: [
      { icon: Users, label: "Acquire Users", stat: "Most common" },
      { icon: DollarSign, label: "Drive Revenue", stat: "High ROI" },
      { icon: Megaphone, label: "Build Brand", stat: "Long-term" },
      { icon: Video, label: "Generate Content", stat: "Always on" },
      { icon: Target, label: "Lower CAC", stat: "Efficiency" },
      { icon: Star, label: "Go Viral", stat: "High upside" },
    ],
    confirmMsg: (n) => `${n} goal${n > 1 ? "s" : ""} selected — AI strategy configured` },
  { label: "Budget", question: "Monthly UGC budget?", sub: "Sets creator tier recommendations and pacing suggestions.", type: "radio", field: "budget",
    options: [
      { label: "< $1k / mo", note: "Lean startup" },
      { label: "$1k – $3k", note: "Early growth" },
      { label: "$3k – $10k", note: "Scaling up" },
      { label: "$10k – $50k", note: "Series A spend" },
      { label: "$50k+", note: "Growth-stage fuel" },
    ] },
  { label: "Category", question: "What category is your product in?", sub: "Unlocks niche creator pools and category benchmarks.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} categor${n > 1 ? "ies" : "y"} — creator matching configured` },
  { label: "Team", question: "How big is your team right now?", sub: "Configures workflows and collaboration permissions for your size.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Solo Founder", desc: "Just me for now" },
      { icon: Users, label: "2–5 people", desc: "Small founding team" },
      { icon: Building2, label: "6–20 people", desc: "Growing startup" },
      { icon: Rocket, label: "VC-backed team", desc: "Funded and hiring" },
    ] },
];

const SOLO_FLOW: FlowStep[] = [
  { label: "What You're Building", question: "What are you building?", sub: "Shapes your AI templates and creator brief formats.", type: "grid-single", field: "goal",
    options: [
      { icon: Laptop, label: "SaaS / App", desc: "Software or digital product" },
      { icon: Package, label: "Physical Product", desc: "Ships to customers" },
      { icon: Briefcase, label: "Service Business", desc: "Freelance or consulting" },
      { icon: ShoppingBag, label: "E-commerce", desc: "Online store" },
      { icon: MonitorPlay, label: "Content / Media", desc: "Newsletter, course, media" },
      { icon: Globe, label: "Something Else", desc: "Tell us later" },
    ] },
  { label: "Top Priorities", question: "What do you need most right now?", sub: "Focuses your AI recommendations on what actually matters.", type: "multi-grid", field: "platforms",
    options: [
      { icon: Target, label: "Validate idea", stat: "Low cost" },
      { icon: DollarSign, label: "Drive first sales", stat: "High priority" },
      { icon: Star, label: "Social proof", stat: "Converts best" },
      { icon: UserCheck, label: "Get testimonials", stat: "High impact" },
      { icon: Megaphone, label: "Grow brand", stat: "Organic" },
      { icon: Video, label: "Content for ads", stat: "ROI focused" },
    ],
    confirmMsg: (n) => `${n} priority area${n > 1 ? "s" : ""} — AI focused on what matters most` },
  { label: "Budget", question: "Monthly creator budget?", sub: "No fluff — bootstrappers keep it lean and we're built for that.", type: "radio", field: "budget",
    options: [
      { label: "< $500 / mo", note: "Pure bootstrap" },
      { label: "$500 – $2k", note: "Scrappy but growing" },
      { label: "$2k – $5k", note: "Gaining traction" },
      { label: "$5k – $15k", note: "Reinvesting revenue" },
      { label: "$15k+", note: "Scaling solo" },
    ] },
  { label: "Niche", question: "What niche are you in?", sub: "AI finds creators who genuinely know your space.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} niche${n > 1 ? "s" : ""} — matching creators who know your audience` },
  { label: "Setup", question: "How are you operating?", sub: "Configures your workflow for the way you actually work.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Fully solo", desc: "I handle everything" },
      { icon: Users, label: "I have a VA", desc: "Virtual assistant support" },
      { icon: Laptop, label: "I use contractors", desc: "Flexible outside help" },
      { icon: Rocket, label: "Hiring soon", desc: "Building the team" },
    ] },
];

const APP_FLOW: FlowStep[] = [
  { label: "Primary KPI", question: "What's your primary KPI?", sub: "Shapes creator brief templates and campaign goals.", type: "grid-single", field: "goal",
    options: [
      { icon: Smartphone, label: "Drive Installs", desc: "Volume of new app downloads" },
      { icon: Target, label: "Reduce CPI", desc: "Lower cost per install" },
      { icon: TrendingUp, label: "Improve Retention", desc: "D1/D7/D30 retention rates" },
      { icon: DollarSign, label: "In-App Revenue", desc: "Purchases, subscriptions, IAP" },
      { icon: Star, label: "App Store Rating", desc: "Reviews and star rating lift" },
      { icon: RefreshCw, label: "Re-engagement", desc: "Win back lapsed users" },
    ] },
  { label: "Ad Channels", question: "Where do you run paid installs?", sub: "Creators produce assets optimized for your active channels.", type: "multi-grid", field: "platforms",
    options: [
      { icon: Megaphone, label: "Meta Ads", stat: "Highest volume" },
      { icon: Target, label: "Google UAC", stat: "Broad reach" },
      { icon: Video, label: "TikTok Ads", stat: "Fastest growth" },
      { icon: Smartphone, label: "Apple Search", stat: "High intent" },
      { icon: MonitorPlay, label: "YouTube", stat: "Long-form" },
      { icon: Globe, label: "All channels", stat: "Full scale" },
    ],
    confirmMsg: (n) => `${n} channel${n > 1 ? "s" : ""} — creators briefed for your ad formats` },
  { label: "Budget", question: "Monthly creator budget?", sub: "Sets creator tier recommendations for app UA campaigns.", type: "radio", field: "budget",
    options: [
      { label: "< $2k / mo", note: "Testing phase" },
      { label: "$2k – $10k", note: "Early UA spend" },
      { label: "$10k – $50k", note: "Scaling UA" },
      { label: "$50k – $200k", note: "Performance UA" },
      { label: "$200k+", note: "Enterprise UA" },
    ] },
  { label: "App Category", question: "What category is your app?", sub: "Unlocks creators with experience in your app vertical.", type: "multi-pills", field: "niches",
    options: APP_NICHES.map((l) => ({ label: l })),
    confirmMsg: (n) => `${n} categor${n > 1 ? "ies" : "y"} — matching app-vertical creators` },
  { label: "Team", question: "How big is your team?", sub: "Configures workspace and collaboration permissions.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Just me", desc: "Solo app founder" },
      { icon: Users, label: "2–5 people", desc: "Small founding team" },
      { icon: Building2, label: "6–20 people", desc: "Growing startup" },
      { icon: Globe, label: "20+ people", desc: "Established company" },
    ] },
];

const ECOM_FLOW: FlowStep[] = [
  { label: "Priority", question: "What's your top priority right now?", sub: "AI builds campaign templates around your most urgent goal.", type: "grid-single", field: "goal",
    options: [
      { icon: TrendingUp, label: "Improve ROAS", desc: "More revenue per ad dollar" },
      { icon: Rocket, label: "Product Launch", desc: "Build launch momentum fast" },
      { icon: Video, label: "Content Library", desc: "Build reusable UGC assets" },
      { icon: Target, label: "Reduce CAC", desc: "Lower cost to acquire customers" },
      { icon: BarChart3, label: "Scale Winning Ads", desc: "Double down on what works" },
      { icon: Globe, label: "Enter New Market", desc: "Expand to new audiences" },
    ] },
  { label: "Sales Channels", question: "Where are you selling?", sub: "Creators produce content optimized for your distribution.", type: "multi-grid", field: "platforms",
    options: [
      { icon: ShoppingBag, label: "Shopify / DTC", stat: "Most common" },
      { icon: Globe, label: "Amazon", stat: "High volume" },
      { icon: Video, label: "TikTok Shop", stat: "Fast growing" },
      { icon: MonitorPlay, label: "Instagram Shop", stat: "Visual-first" },
      { icon: Building2, label: "Walmart / Retail", stat: "Scale" },
      { icon: LayoutGrid, label: "Multi-channel", stat: "Full coverage" },
    ],
    confirmMsg: (n) => `${n} channel${n > 1 ? "s" : ""} — creators briefed for your storefronts` },
  { label: "Budget", question: "Monthly creator budget?", sub: "Sets pacing and creator tier recommendations.", type: "radio", field: "budget",
    options: [
      { label: "< $2k / mo", note: "Early testing" },
      { label: "$2k – $10k", note: "Growing spend" },
      { label: "$10k – $50k", note: "Scaling creative" },
      { label: "$50k – $200k", note: "Performance brand" },
      { label: "$200k+", note: "Enterprise DTC" },
    ] },
  { label: "Category", question: "What are you selling?", sub: "Matches creators who already know your product category.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} categor${n > 1 ? "ies" : "y"} — creator pool filtered for your products` },
  { label: "Team", question: "How big is your team?", sub: "Configures workflows and approval chains.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "Solo founder", desc: "I run the whole store" },
      { icon: Users, label: "2–5 people", desc: "Small ecom team" },
      { icon: Building2, label: "6–20 people", desc: "Growing brand" },
      { icon: Globe, label: "20+ people", desc: "Enterprise brand" },
    ] },
];

const CREATOR_MGR_FLOW: FlowStep[] = [
  { label: "Roster Type", question: "What best describes your roster?", sub: "Shapes how BrandOps organizes and matches your creators.", type: "grid-single", field: "goal",
    options: [
      { icon: Video, label: "UGC Specialists", desc: "Creators who only do UGC ads" },
      { icon: Star, label: "Lifestyle Creators", desc: "Natural, authentic content" },
      { icon: LayoutGrid, label: "Multi-format", desc: "Adapt to any brief type" },
      { icon: Target, label: "Niche Specific", desc: "Deep in one category" },
      { icon: Users, label: "Mixed Roster", desc: "All types across niches" },
      { icon: Rocket, label: "Just Starting Out", desc: "Building my first roster" },
    ] },
  { label: "Creator Niches", question: "What niches is your roster in?", sub: "Used to match your creators with the right brand campaigns.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} niche${n > 1 ? "s" : ""} — campaigns matched to your roster` },
  { label: "Deal Size", question: "Average deal size per video?", sub: "AI prioritizes campaigns that fit your creators' tier.", type: "radio", field: "budget",
    options: [
      { label: "< $100 / video", note: "Entry-level creators" },
      { label: "$100 – $300", note: "Mid-tier roster" },
      { label: "$300 – $750", note: "Established creators" },
      { label: "$750 – $2k", note: "Premium roster" },
      { label: "$2k+", note: "Top-tier talent" },
    ] },
  { label: "Services", question: "What do you handle for your creators?", sub: "Unlocks the right management tools in your dashboard.", type: "multi-grid", field: "platforms",
    options: [
      { icon: Target, label: "Campaign Matching", stat: "Core" },
      { icon: FileText, label: "Contract Review", stat: "Legal" },
      { icon: DollarSign, label: "Payment Collection", stat: "Always" },
      { icon: Check, label: "Content QA", stat: "Quality" },
      { icon: Megaphone, label: "Brand Relations", stat: "Retention" },
      { icon: Globe, label: "Full Management", stat: "White-glove" },
    ],
    confirmMsg: (n) => `${n} service${n > 1 ? "s" : ""} — management workflow configured` },
  { label: "Roster Size", question: "How many creators are you managing?", sub: "Sets account limits and bulk campaign tools.", type: "grid-single", field: "teamSize",
    options: [
      { icon: User, label: "1–5 creators", desc: "Building my roster" },
      { icon: Users, label: "6–15 creators", desc: "Small managed roster" },
      { icon: Building2, label: "16–30 creators", desc: "Established manager" },
      { icon: Globe, label: "30+ creators", desc: "Full-scale operation" },
    ] },
];

const CREATOR_FLOW: FlowStep[] = [
  { label: "Content Style", question: "What type of videos do you make?", sub: "Brands filter campaigns by format — pick your style.", type: "grid-single", field: "goal",
    options: [
      { icon: Video, label: "Product Demos", desc: "Review products on camera" },
      { icon: Play, label: "Lifestyle / B-roll", desc: "Natural, candid footage" },
      { icon: User, label: "Talking Head", desc: "Direct-to-camera testimonials" },
      { icon: ShoppingBag, label: "Unboxing", desc: "First impressions & reveals" },
      { icon: Megaphone, label: "Voiceover Ads", desc: "Narrate over footage or stills" },
      { icon: Star, label: "Multiple Styles", desc: "I can do all of the above" },
    ] },
  { label: "Your Niche", question: "What category do you create in?", sub: "Niche brands prefer niche creators — unlocks relevant campaigns.", type: "multi-pills", field: "niches", options: [],
    confirmMsg: (n) => `${n} niche${n > 1 ? "s" : ""} selected — unlocking matching brand campaigns` },
  { label: "Your Rate", question: "What's your target payout per video?", sub: "Sets your minimum — AI only shows campaigns within your range.", type: "radio", field: "budget",
    options: [
      { label: "< $50 / video", note: "Great for building portfolio" },
      { label: "$50 – $150", note: "Most common entry range" },
      { label: "$150 – $300", note: "Mid-tier specialist" },
      { label: "$300 – $500", note: "High-demand creators" },
      { label: "$500+", note: "Premium production quality" },
    ] },
  { label: "Turnaround", question: "How fast can you deliver?", sub: "Faster turnaround = more campaign invites from brands.", type: "grid-single", field: "turnaround",
    options: [
      { icon: Zap, label: "Same day", desc: "Deliver within 24 hours" },
      { icon: TrendingUp, label: "2–3 days", desc: "Most campaigns request this" },
      { icon: BarChart3, label: "Within a week", desc: "Standard project timelines" },
      { icon: Target, label: "Depends on brief", desc: "Varies by scope & revisions" },
    ] },
  { label: "Your Setup", question: "What's your filming setup?", sub: "Brands match to your production quality for the right brief type.", type: "grid-single", field: "teamSize",
    options: [
      { icon: Smartphone, label: "Smartphone", desc: "iPhone or Android camera" },
      { icon: Laptop, label: "DSLR / Mirrorless", desc: "Cinema-quality footage" },
      { icon: MonitorPlay, label: "Pro Studio", desc: "Lighting, backdrops, full rig" },
      { icon: LayoutGrid, label: "Multiple setups", desc: "Adapts to any brief" },
    ] },
];

function getFlow(accountType: string): FlowStep[] {
  switch (accountType) {
    case "Agency": return AGENCY_FLOW;
    case "Startup": return STARTUP_FLOW;
    case "Solo Founder": return SOLO_FLOW;
    case "App Founder": return APP_FLOW;
    case "Ecommerce Brand": return ECOM_FLOW;
    case "Creator Manager": return CREATOR_MGR_FLOW;
    case "Creator": return CREATOR_FLOW;
    default: return BRAND_FLOW;
  }
}

/* ─── Generic step renderer ─────────────────────────────────────────────── */

function StepContent({ config, data, onChange, onToggle }: {
  config: FlowStep;
  data: OnboardingData;
  onChange: <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void;
  onToggle: (k: "platforms" | "niches", v: string) => void;
}) {
  const { type, field, options, confirmMsg } = config;

  if (type === "grid-single") {
    const val = data[field as ScalarField] as string;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map(({ icon, label, desc }) => (
          <SelectCard key={label} icon={icon!} label={label} desc={desc ?? ""} selected={val === label}
            onClick={() => onChange(field as ScalarField, label as never)} />
        ))}
      </div>
    );
  }

  if (type === "radio") {
    const val = data[field as ScalarField] as string;
    return (
      <div className="space-y-3">
        {options.map(({ label, note }) => (
          <motion.button key={label}
            onClick={() => onChange(field as ScalarField, label as never)}
            whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
              val === label ? "border-[#C6FF00]/60 bg-[#C6FF00]/8" : "border-white/8 bg-white/2 hover:border-white/15")}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                val === label ? "border-[#C6FF00] bg-[#C6FF00]" : "border-white/20")}>
                {val === label && <div className="w-2 h-2 rounded-full bg-black" />}
              </div>
              <span className={cn("font-semibold text-sm", val === label ? "text-white" : "text-white/70")}>{label}</span>
            </div>
            <div className="flex items-center gap-2">
              {note && <span className={cn("text-xs font-medium", val === label ? "text-[#C6FF00]" : "text-white/25 group-hover:text-white/40")}>{note}</span>}
              <ChevronRight className={cn("h-3.5 w-3.5 transition-colors", val === label ? "text-[#C6FF00]" : "text-white/20")} />
            </div>
          </motion.button>
        ))}
      </div>
    );
  }

  if (type === "multi-grid") {
    const arr = data[field as ArrayField] as string[];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {options.map(({ icon: Icon, label, desc, stat }) => (
            <motion.button key={label}
              onClick={() => onToggle(field as ArrayField, label)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className={cn("flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all",
                arr.includes(label) ? "border-[#C6FF00]/60 bg-[#C6FF00]/8" : "border-white/8 bg-white/2 hover:border-white/20")}
            >
              {Icon && <Icon className={cn("h-6 w-6", arr.includes(label) ? "text-[#C6FF00]" : "text-white/50")} />}
              <span className={cn("font-semibold text-sm text-center", arr.includes(label) ? "text-white" : "text-white/60")}>{label}</span>
              {(stat ?? desc) && <span className="text-white/30 text-xs text-center">{stat ?? desc}</span>}
            </motion.button>
          ))}
        </div>
        {arr.length > 0 && confirmMsg && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-[#C6FF00]/5 border border-[#C6FF00]/15 rounded-xl px-3 py-2.5 text-xs text-[#C6FF00]">
            <Check className="h-3.5 w-3.5 shrink-0" />
            {confirmMsg(arr.length)}
          </motion.div>
        )}
      </div>
    );
  }

  if (type === "multi-pills") {
    const arr = data[field as ArrayField] as string[];
    const pillItems = options.length > 0 ? options.map((o) => o.label) : NICHES;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {pillItems.map((label) => (
            <PillToggle key={label} label={label} selected={arr.includes(label)}
              onClick={() => onToggle(field as ArrayField, label)} />
          ))}
        </div>
        {arr.length > 0 && confirmMsg && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-[#C6FF00]/5 border border-[#C6FF00]/15 rounded-xl px-3 py-2.5 text-xs text-[#C6FF00]">
            <Bot className="h-3.5 w-3.5 shrink-0" />
            {confirmMsg(arr.length)}
          </motion.div>
        )}
      </div>
    );
  }

  return null;
}

/* ─── AI Loading screen ─────────────────────────────────────────────────── */

function AILoadingScreen({ data, onDone }: { data: OnboardingData; onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const steps = [
    "Analyzing your profile…",
    `Personalizing your ${data.accountType || "account"} workspace…`,
    `Configuring AI for ${data.goal || "your goals"}…`,
    "Setting up campaign preferences…",
    "Loading creator recommendations…",
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
        {"Building your AI workspace"}
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
  const { user, markOnboarded } = useAuth();
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
    turnaround: "",
  });

  const isCreator = CREATOR_ROLES.includes(data.accountType);

  const set = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const toggle = (k: "platforms" | "niches", v: string) =>
    setData((d) => {
      const arr = d[k] as string[];
      return { ...d, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const flow = getFlow(data.accountType);

  const canProceed = () => {
    if (step === 0) return !!data.accountType;
    const cfg = flow[step - 1];
    if (!cfg) return true;
    if (cfg.type === "multi-grid" || cfg.type === "multi-pills") {
      return (data[cfg.field as ArrayField] as string[]).length > 0;
    }
    return !!(data[cfg.field as ScalarField] as string);
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
    localStorage.removeItem(ACCOUNT_TYPE_KEY);
    await markOnboarded(payload);
    if (auth.currentUser) {
      try { await updateProfile(auth.currentUser, { displayName: auth.currentUser.displayName ?? "" }); } catch {}
    }
    setLocation(isCreator ? "/settings" : "/subscribe");
  };

  const STEP_TITLES = [
    { label: "Account type", question: "Who are you?", sub: "This personalizes your entire BrandOps experience." },
    ...flow.map((s) => ({ label: s.label, question: s.question, sub: s.sub })),
  ];

  const current = STEP_TITLES[step];

  if (loading) {
    return <AILoadingScreen data={data} onDone={handleDone} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* ── Left panel (desktop only) ─────────────────────────── */}
      <div className="w-[380px] shrink-0">
        <LeftPanel step={step} data={data} isCreator={isCreator} />
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

                {/* ── Steps 1–5: driven by account-type flow config ── */}
                {step > 0 && flow[step - 1] && (
                  <StepContent
                    config={flow[step - 1]}
                    data={data}
                    onChange={set}
                    onToggle={toggle}
                  />
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
