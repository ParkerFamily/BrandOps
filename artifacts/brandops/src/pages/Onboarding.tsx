import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles, ArrowRight, Check, Zap, ShoppingBag, Building2,
  Users, Rocket, User, Laptop, DollarSign, Target,
  TrendingUp, Megaphone, Smartphone, Globe, Loader2
} from "lucide-react";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { cn } from "@/lib/utils";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";

const ONBOARDING_KEY = "brandops_onboarded";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

interface OptionCardProps {
  icon: React.ElementType;
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
}

function OptionCard({ icon: Icon, label, selected, onClick, color = "#C6FF00" }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 text-center",
        selected
          ? "border-[#C6FF00]/60 bg-[#C6FF00]/8 shadow-[0_0_20px_rgba(198,255,0,0.1)]"
          : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"
      )}
    >
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center">
          <Check className="h-3 w-3 text-black" />
        </div>
      )}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center",
        selected ? "bg-[#C6FF00]/20" : "bg-white/5"
      )}>
        <Icon className={cn("h-5 w-5", selected ? "text-[#C6FF00]" : "text-white/50")} />
      </div>
      <span className={cn("text-sm font-medium", selected ? "text-white" : "text-white/60")}>{label}</span>
    </button>
  );
}

function BudgetSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { label: "< $1k/mo", value: "under-1k" },
    { label: "$1k–$5k", value: "1k-5k" },
    { label: "$5k–$20k", value: "5k-20k" },
    { label: "$20k–$50k", value: "20k-50k" },
    { label: "$50k+", value: "50k-plus" },
  ];
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {options.map(({ label, value: v }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-5 py-3 rounded-xl border font-medium text-sm transition-all",
            value === v
              ? "border-[#C6FF00]/60 bg-[#C6FF00]/10 text-[#C6FF00]"
              : "border-white/8 bg-white/2 text-white/50 hover:border-white/20 hover:text-white/80"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const ROLES = [
  { icon: ShoppingBag, label: "eCommerce Brand" },
  { icon: Rocket, label: "Startup" },
  { icon: Building2, label: "Agency" },
  { icon: User, label: "Solo Founder" },
  { icon: Users, label: "Creator Manager" },
  { icon: Laptop, label: "App Founder" },
  { icon: Globe, label: "Enterprise Brand" },
  { icon: Target, label: "Marketing Team" },
];

const PLATFORMS = [
  { icon: SiTiktok, label: "TikTok" },
  { icon: SiInstagram, label: "Instagram" },
  { icon: SiYoutube, label: "YouTube" },
  { icon: Globe, label: "All Platforms" },
];

const GOALS = [
  { icon: TrendingUp, label: "Drive Sales" },
  { icon: Megaphone, label: "Brand Awareness" },
  { icon: Smartphone, label: "App Installs" },
  { icon: Sparkles, label: "Organic UGC" },
  { icon: Target, label: "Paid Ads Content" },
  { icon: Users, label: "Build Community" },
];

const NICHES = ["Beauty", "Fitness", "Food & Drink", "Fashion", "Tech", "Lifestyle", "Finance", "Gaming", "Travel", "Health", "Pets", "Home & Decor"];

const EXPERIENCE = [
  { label: "Just starting out", desc: "Never run a UGC campaign" },
  { label: "Some experience", desc: "Run 1–5 campaigns before" },
  { label: "Experienced", desc: "Running campaigns regularly" },
  { label: "Power user", desc: "Managing 10+ campaigns/month" },
];

interface OnboardingData {
  role: string;
  budget: string;
  platforms: string[];
  niches: string[];
  goal: string;
  experience: string;
}

const STEPS = ["Your role", "Budget", "Platforms", "Niche & Goal", "Experience", "Ready"];

function PreparingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyzing your profile...",
    "Configuring AI recommendations...",
    "Setting up creator discovery...",
    "Personalizing your dashboard...",
    "Your workspace is ready ✓",
  ];

  useState(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setStep(i);
      if (i >= steps.length - 1) {
        clearInterval(timer);
        setTimeout(onDone, 800);
      }
    }, 600);
    return () => clearInterval(timer);
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white px-6">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-[#C6FF00]/20 blur-3xl rounded-full" />
        <div className="relative w-20 h-20 rounded-3xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center">
          <Zap className="h-10 w-10 text-[#C6FF00]" />
        </div>
      </div>

      <h2 className="text-3xl font-black mb-3">BrandOps is setting up your workspace</h2>
      <p className="text-white/40 mb-12 text-center">
        Your AI business assistant is personalizing everything based on your profile.
      </p>

      <div className="w-full max-w-sm space-y-4">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: i <= step ? 1 : 0.2, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "flex items-center gap-3 text-sm",
              i <= step ? "text-white" : "text-white/20"
            )}
          >
            {i < step ? (
              <div className="w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-black" />
              </div>
            ) : i === step ? (
              <Loader2 className="h-5 w-5 text-[#C6FF00] animate-spin shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" />
            )}
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [preparing, setPreparing] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    role: "",
    budget: "",
    platforms: [],
    niches: [],
    goal: "",
    experience: "",
  });

  const goNext = () => {
    setDir(1);
    if (currentStep === STEPS.length - 2) {
      setPreparing(true);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep === 0) return;
    setDir(-1);
    setCurrentStep((s) => s - 1);
  };

  const toggleArray = (field: keyof OnboardingData, value: string) => {
    setData((d) => {
      const arr = d[field] as string[];
      return { ...d, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const canProceed = () => {
    if (currentStep === 0) return !!data.role;
    if (currentStep === 1) return !!data.budget;
    if (currentStep === 2) return data.platforms.length > 0;
    if (currentStep === 3) return data.niches.length > 0 && !!data.goal;
    if (currentStep === 4) return !!data.experience;
    return true;
  };

  if (preparing) {
    return (
      <PreparingScreen
        onDone={() => {
          localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
          setLocation("/dashboard");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src={logoPath} alt="BrandOps" className="h-7 w-auto" />
          <span className="font-bold text-base text-white">BrandOps</span>
        </div>
        <div className="text-white/30 text-sm">
          Step {currentStep + 1} of {STEPS.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-[#C6FF00]"
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 py-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === currentStep ? "w-8 bg-[#C6FF00]" : i < currentStep ? "w-4 bg-[#C6FF00]/40" : "w-4 bg-white/10"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-hidden">
        <div className="w-full max-w-2xl">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={currentStep}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Step 0: Role */}
              {currentStep === 0 && (
                <div>
                  <div className="text-center mb-10">
                    <div className="text-[#C6FF00] text-sm font-medium mb-3">Welcome{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}! 👋</div>
                    <h2 className="text-3xl font-black mb-3">What best describes you?</h2>
                    <p className="text-white/40">We'll personalize BrandOps to your specific needs.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ROLES.map(({ icon, label }) => (
                      <OptionCard
                        key={label}
                        icon={icon}
                        label={label}
                        selected={data.role === label}
                        onClick={() => setData((d) => ({ ...d, role: label }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: Budget */}
              {currentStep === 1 && (
                <div>
                  <div className="text-center mb-10">
                    <DollarSign className="h-10 w-10 text-[#C6FF00] mx-auto mb-4 p-2 bg-[#C6FF00]/10 rounded-xl" />
                    <h2 className="text-3xl font-black mb-3">What's your monthly campaign budget?</h2>
                    <p className="text-white/40">This helps us suggest the right creator tiers and payout strategies.</p>
                  </div>
                  <BudgetSelector value={data.budget} onChange={(v) => setData((d) => ({ ...d, budget: v }))} />
                </div>
              )}

              {/* Step 2: Platforms */}
              {currentStep === 2 && (
                <div>
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-black mb-3">Which platforms do you target?</h2>
                    <p className="text-white/40">Select all that apply. You can change this anytime.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
                    {PLATFORMS.map(({ icon, label }) => (
                      <OptionCard
                        key={label}
                        icon={icon}
                        label={label}
                        selected={data.platforms.includes(label)}
                        onClick={() => toggleArray("platforms", label)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Niche & Goal */}
              {currentStep === 3 && (
                <div className="space-y-10">
                  <div>
                    <div className="text-center mb-6">
                      <h2 className="text-3xl font-black mb-3">What's your main niche?</h2>
                      <p className="text-white/40">Select all that apply to your products or services.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {NICHES.map((n) => (
                        <button
                          key={n}
                          onClick={() => toggleArray("niches", n)}
                          className={cn(
                            "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                            data.niches.includes(n)
                              ? "border-[#C6FF00]/60 bg-[#C6FF00]/10 text-[#C6FF00]"
                              : "border-white/10 bg-white/2 text-white/50 hover:border-white/20"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-black mb-2">Primary campaign goal?</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {GOALS.map(({ icon, label }) => (
                        <OptionCard
                          key={label}
                          icon={icon}
                          label={label}
                          selected={data.goal === label}
                          onClick={() => setData((d) => ({ ...d, goal: label }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Experience */}
              {currentStep === 4 && (
                <div>
                  <div className="text-center mb-10">
                    <Sparkles className="h-10 w-10 text-[#C6FF00] mx-auto mb-4 p-2 bg-[#C6FF00]/10 rounded-xl" />
                    <h2 className="text-3xl font-black mb-3">Your experience with creator marketing?</h2>
                    <p className="text-white/40">We'll tune your onboarding guides and AI tips to match your level.</p>
                  </div>
                  <div className="space-y-3 max-w-lg mx-auto">
                    {EXPERIENCE.map(({ label, desc }) => (
                      <button
                        key={label}
                        onClick={() => setData((d) => ({ ...d, experience: label }))}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                          data.experience === label
                            ? "border-[#C6FF00]/60 bg-[#C6FF00]/8"
                            : "border-white/8 bg-white/2 hover:border-white/20"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          data.experience === label ? "border-[#C6FF00] bg-[#C6FF00]" : "border-white/20"
                        )}>
                          {data.experience === label && <div className="w-2 h-2 rounded-full bg-black" />}
                        </div>
                        <div>
                          <div className={cn("font-semibold text-sm", data.experience === label ? "text-white" : "text-white/60")}>{label}</div>
                          <div className="text-white/30 text-xs mt-0.5">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Summary / Ready */}
              {currentStep === 5 && (
                <div className="text-center">
                  <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-[#C6FF00]/20 blur-2xl rounded-full" />
                    <div className="relative w-20 h-20 rounded-3xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center mx-auto">
                      <Zap className="h-10 w-10 text-[#C6FF00]" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black mb-4">You're all set!</h2>
                  <p className="text-white/50 mb-10 max-w-md mx-auto">
                    BrandOps has everything it needs to power your creator campaigns. Your AI dashboard is ready.
                  </p>
                  <div className="bg-white/3 border border-white/8 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3 mb-10">
                    <div className="text-white/40 text-xs uppercase tracking-widest font-medium mb-4">Your profile summary</div>
                    {[
                      { label: "Role", value: data.role },
                      { label: "Budget", value: data.budget },
                      { label: "Platforms", value: data.platforms.join(", ") },
                      { label: "Goal", value: data.goal },
                      { label: "Experience", value: data.experience },
                    ].filter((x) => x.value).map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-white/40">{label}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between">
        <button
          onClick={goPrev}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            currentStep === 0
              ? "text-white/20 cursor-default"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          disabled={currentStep === 0}
        >
          ← Back
        </button>

        <button
          onClick={goNext}
          disabled={!canProceed()}
          className={cn(
            "px-7 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2",
            canProceed()
              ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33] hover:scale-105 active:scale-95"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          )}
        >
          {currentStep === STEPS.length - 1 ? (
            <>Launch BrandOps <Zap className="h-4 w-4" /></>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
