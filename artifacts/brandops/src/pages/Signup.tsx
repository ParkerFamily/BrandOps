import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle } from "react-icons/si";
import {
  ArrowRight, Check, Loader2, Eye, EyeOff, Zap,
  ShoppingBag, Building2, Users, Rocket, User, Laptop, Globe, Star,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "brandops_onboarded";

/* ─── Account types ─────────────────────────────────────────────────────── */
const ACCOUNT_TYPES = [
  { value: "Brand", icon: ShoppingBag, desc: "Sell products via UGC" },
  { value: "Agency", icon: Building2, desc: "Manage brand clients" },
  { value: "Startup", icon: Rocket, desc: "Scale growth fast" },
  { value: "Solo Founder", icon: User, desc: "Bootstrap with creators" },
  { value: "App Founder", icon: Laptop, desc: "Drive installs" },
  { value: "Ecommerce", icon: Globe, desc: "Convert with UGC" },
  { value: "Creator Manager", icon: Users, desc: "Manage a roster" },
  { value: "Creator", icon: Star, desc: "Join brand campaigns" },
];

/* ─── Slide transition ──────────────────────────────────────────────────── */
const slideUp: Variants = {
  enter: { y: 60, opacity: 0 },
  center: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "circOut" } },
  exit: { y: -60, opacity: 0, transition: { duration: 0.3, ease: "circIn" } },
};

/* ─── Password strength ─────────────────────────────────────────────────── */
function usePasswordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

/* ─── Progress dots ─────────────────────────────────────────────────────── */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 6,
            backgroundColor: i < current ? "#C6FF00" : i === current ? "#C6FF00" : "rgba(255,255,255,0.12)",
          }}
          transition={{ duration: 0.3 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

/* ─── Creating account loading screen ──────────────────────────────────── */
function CreatingScreen({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Verifying your details…",
    "Setting up your account…",
    "Configuring AI workspace…",
    "Loading creator database…",
    `Welcome to BrandOps, ${name.split(" ")[0]} ✓`,
  ];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setStep(i);
      if (i >= steps.length - 1) clearInterval(t);
    }, 600);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] px-8"
    >
      <div className="absolute inset-0 bg-[#C6FF00]/3 blur-[200px] pointer-events-none" />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-[#C6FF00]/30 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-3xl bg-[#C6FF00]/10 border border-[#C6FF00]/30 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Zap className="h-12 w-12 text-[#C6FF00]" />
          </motion.div>
        </div>
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-3xl font-black text-white mb-10 text-center">
        Building your workspace…
      </motion.h2>

      <div className="w-full max-w-xs space-y-4">
        {steps.map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            className={cn("flex items-center gap-3 text-sm", i <= step ? "text-white" : "text-white/20")}>
            {i < step
              ? <div className="w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-black" /></div>
              : i === step
              ? <Loader2 className="h-5 w-5 text-[#C6FF00] animate-spin shrink-0" />
              : <div className="w-5 h-5 rounded-full border border-white/10 shrink-0" />}
            {s}
          </motion.div>
        ))}
      </div>

      <div className="mt-10 w-full max-w-xs h-0.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div className="h-full bg-[#C6FF00]" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.5 }} />
      </div>
    </motion.div>
  );
}

/* ─── Main Signup ────────────────────────────────────────────────────────── */
export default function Signup() {
  const { signUpWithEmail, signInWithGoogle, user } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const strength = usePasswordStrength(password);
  const strengthColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-[#C6FF00]"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const TOTAL_STEPS = 5; // 0:intro, 1:name, 2:email, 3:password, 4:account-type

  useEffect(() => {
    if (user) setLocation("/onboarding");
  }, [user, setLocation]);

  useEffect(() => {
    setError("");
    // Auto-focus text input on step change
    if ([1, 2, 3].includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [step]);

  const goNext = useCallback(() => {
    setError("");
    if (step === 1 && !name.trim()) { setError("Enter your name to continue"); return; }
    if (step === 2 && !/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address"); return; }
    if (step === 3 && password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (step === 4 && !accountType) { setError("Choose an account type"); return; }
    if (step < TOTAL_STEPS - 1) { setStep((s) => s + 1); return; }

    // Submit
    handleSignup();
  }, [step, name, email, password, accountType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step !== 4) goNext();
  };

  const handleSignup = async () => {
    setLoading(true);
    setCreating(true);
    try {
      localStorage.setItem("brandops_account_type", accountType);
      await signUpWithEmail(email, password, name);
      // CreatingScreen handles the delay before redirect
      setTimeout(() => setLocation("/onboarding"), 3800);
    } catch (err: unknown) {
      setCreating(false);
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Signup failed.";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      setLocation(onboarded ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
      setGoogleLoading(false);
    }
  };

  if (user || creating) return <CreatingScreen name={name || "there"} />;

  // Shared label/hint style per step
  const stepHints: Record<number, string> = {
    1: "This is how your workspace will be personalized.",
    2: "We'll use this for your account and invoices.",
    3: "At least 8 characters with a mix of letters and numbers.",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-hidden flex flex-col" onKeyDown={handleKeyDown}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C6FF00]/4 blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/4 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <img src={logoPath} alt="BrandOps" className="h-7 w-auto" />
          <span className="text-white font-bold text-sm">BrandOps</span>
        </motion.div>
        <div className="flex items-center gap-4">
          <ProgressDots total={TOTAL_STEPS} current={step} />
          <button onClick={() => setLocation("/login")} className="text-white/30 hover:text-white/70 text-xs transition-colors">
            Sign in instead
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* ── Step 0: Intro / Google ──────────────────────── */}
          {step === 0 && (
            <motion.div key="step-0" variants={slideUp} initial="enter" animate="center" exit="exit"
              className="text-center max-w-xl w-full">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-[#C6FF00]/25 blur-3xl rounded-full" />
                <div className="relative w-16 h-16 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-2xl flex items-center justify-center mx-auto">
                  <Zap className="h-8 w-8 text-[#C6FF00]" />
                </div>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-5xl sm:text-6xl font-black text-white leading-[1.05] mb-4">
                Let's build your<br />
                <span className="text-[#C6FF00]">creator operation.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-white/40 text-lg mb-10">
                Takes 60 seconds. No credit card.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="space-y-4 max-w-sm mx-auto">
                <button onClick={() => setStep(1)}
                  className="w-full py-4 rounded-2xl bg-[#C6FF00] text-black font-bold text-base hover:bg-[#d4ff33] transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(198,255,0,0.25)] flex items-center justify-center gap-2">
                  Get started free <ArrowRight className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-white/20 text-xs">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <button onClick={handleGoogle} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-semibold py-3.5 px-4 rounded-2xl hover:bg-white/8 hover:border-white/20 transition-all disabled:opacity-50 text-sm">
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiGoogle className="h-4 w-4" />}
                  {googleLoading ? "Connecting…" : "Continue with Google"}
                </button>
              </motion.div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-red-400">{error}</motion.p>
              )}

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-white/20 text-xs mt-8">
                By continuing, you agree to our{" "}
                <span className="underline cursor-pointer hover:text-white/40">Terms</span> and{" "}
                <span className="underline cursor-pointer hover:text-white/40">Privacy Policy</span>.
              </motion.p>
            </motion.div>
          )}

          {/* ── Step 1: Name ─────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step-1" variants={slideUp} initial="enter" animate="center" exit="exit"
              className="w-full max-w-xl">
              <StepLabel step={1} total={TOTAL_STEPS} />
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-2">
                What's your <span className="text-[#C6FF00]">name?</span>
              </h2>
              <p className="text-white/35 mb-10">{stepHints[1]}</p>

              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-transparent border-b-2 border-white/15 focus:border-[#C6FF00] outline-none text-white text-3xl sm:text-4xl font-semibold placeholder-white/15 pb-3 transition-colors duration-300"
              />

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-red-400">{error}</motion.p>}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex items-center gap-3">
                <ContinueButton onClick={goNext} />
                <span className="text-white/25 text-xs">or press Enter ↵</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Step 2: Email ─────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step-2" variants={slideUp} initial="enter" animate="center" exit="exit"
              className="w-full max-w-xl">
              <StepLabel step={2} total={TOTAL_STEPS} />
              {name && (
                <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[#C6FF00] text-sm font-medium mb-2">
                  Hey {name.split(" ")[0]}! 👋
                </motion.p>
              )}
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-2">
                Work <span className="text-[#C6FF00]">email?</span>
              </h2>
              <p className="text-white/35 mb-10">{stepHints[2]}</p>

              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-transparent border-b-2 border-white/15 focus:border-[#C6FF00] outline-none text-white text-3xl sm:text-4xl font-semibold placeholder-white/15 pb-3 transition-colors duration-300"
              />

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-red-400">{error}</motion.p>}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex items-center gap-3">
                <ContinueButton onClick={goNext} />
                <span className="text-white/25 text-xs">or press Enter ↵</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Step 3: Password ──────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step-3" variants={slideUp} initial="enter" animate="center" exit="exit"
              className="w-full max-w-xl">
              <StepLabel step={3} total={TOTAL_STEPS} />
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-2">
                Create a <span className="text-[#C6FF00]">password.</span>
              </h2>
              <p className="text-white/35 mb-10">{stepHints[3]}</p>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-transparent border-b-2 border-white/15 focus:border-[#C6FF00] outline-none text-white text-3xl sm:text-4xl font-semibold placeholder-white/15 pb-3 transition-colors duration-300 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-4 text-white/30 hover:text-white/70 transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {password && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-400",
                        i <= strength ? strengthColors[strength] : "bg-white/10")} />
                    ))}
                  </div>
                  <p className={cn("text-xs font-medium",
                    strength >= 3 ? "text-[#C6FF00]" : strength === 2 ? "text-yellow-400" : "text-orange-400")}>
                    {strengthLabels[strength]}
                  </p>
                </motion.div>
              )}

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-red-400">{error}</motion.p>}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex items-center gap-3">
                <ContinueButton onClick={goNext} />
                <span className="text-white/25 text-xs">or press Enter ↵</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Step 4: Account type ─────────────────────────── */}
          {step === 4 && (
            <motion.div key="step-4" variants={slideUp} initial="enter" animate="center" exit="exit"
              className="w-full max-w-2xl">
              <StepLabel step={4} total={TOTAL_STEPS} />
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-2">
                Who are <span className="text-[#C6FF00]">you?</span>
              </h2>
              <p className="text-white/35 mb-8">This personalizes your entire BrandOps experience.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ACCOUNT_TYPES.map(({ value, icon: Icon, desc }, i) => (
                  <motion.button
                    key={value}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { setAccountType(value); setError(""); }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border transition-all duration-200 text-center group",
                      accountType === value
                        ? "border-[#C6FF00]/60 bg-[#C6FF00]/10 shadow-[0_0_24px_rgba(198,255,0,0.15)]"
                        : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"
                    )}
                  >
                    {accountType === value && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#C6FF00] flex items-center justify-center">
                        <Check className="h-3 w-3 text-black" />
                      </motion.div>
                    )}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                      accountType === value ? "bg-[#C6FF00]/20" : "bg-white/5")}>
                      <Icon className={cn("h-5 w-5", accountType === value ? "text-[#C6FF00]" : "text-white/50")} />
                    </div>
                    <span className={cn("font-semibold text-sm", accountType === value ? "text-white" : "text-white/60")}>{value}</span>
                    <span className="text-white/25 text-[10px] leading-tight">{desc}</span>
                  </motion.button>
                ))}
              </div>

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-red-400">{error}</motion.p>}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
                <ContinueButton
                  onClick={goNext}
                  disabled={!accountType || loading}
                  loading={loading}
                  label={loading ? "Creating your account…" : "Launch BrandOps →"}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back button */}
      <AnimatePresence>
        {step > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            onClick={() => { setStep((s) => s - 1); setError(""); }}
            className="fixed bottom-8 left-8 z-20 flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors"
          >
            ← Back
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll hint on step 4 */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, 4, 0] }}
            transition={{ y: { repeat: Infinity, duration: 1.5 } }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/20">
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────────────────── */
function StepLabel({ step, total }: { step: number; total: number }) {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="text-[#C6FF00]/60 text-xs font-semibold uppercase tracking-widest mb-4">
      {step} / {total - 1}
    </motion.p>
  );
}

function ContinueButton({ onClick, disabled = false, loading = false, label = "Continue" }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; label?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.04 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      className={cn(
        "flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all",
        disabled
          ? "bg-white/8 text-white/25 cursor-not-allowed"
          : "bg-[#C6FF00] text-black hover:bg-[#d4ff33] shadow-[0_0_24px_rgba(198,255,0,0.2)]"
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
      {!loading && <ArrowRight className="h-4 w-4" />}
    </motion.button>
  );
}
