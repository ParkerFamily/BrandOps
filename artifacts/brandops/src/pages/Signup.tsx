import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle, SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import {
  Loader2, Eye, EyeOff, Check, ArrowLeft, Bot, Zap,
  TrendingUp, DollarSign, Star, Users, Sparkles,
  BarChart3, Shield, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "brandops_onboarded";

/* ─── Account types ─────────────────────────────────────────────────────── */

const ACCOUNT_TYPES = [
  { value: "Brand", label: "Brand" },
  { value: "Agency", label: "Agency" },
  { value: "Solo Founder", label: "Solo Founder" },
  { value: "App Founder", label: "App Founder" },
  { value: "Ecommerce Brand", label: "Ecommerce" },
  { value: "Creator", label: "Creator" },
  { value: "Creator Manager", label: "Creator Manager" },
];

/* ─── Animated left panel data ──────────────────────────────────────────── */

const CREATORS = [
  { name: "Maya Chen", handle: "@mayabeauty", eng: "7.2%", followers: "284K", platform: "TikTok", color: "from-purple-500/20 to-pink-500/20", badge: "Best Match" },
  { name: "Jake Rivers", handle: "@jakefit", eng: "9.1%", followers: "190K", platform: "Instagram", color: "from-blue-500/20 to-cyan-500/20", badge: "High ROI" },
  { name: "Sofia Valle", handle: "@sofiastyle", eng: "6.4%", followers: "410K", platform: "YouTube", color: "from-orange-500/20 to-amber-500/20", badge: "Trending" },
  { name: "Liam Park", handle: "@liamtech", eng: "11.3%", followers: "98K", platform: "TikTok", color: "from-[#C6FF00]/20 to-lime-500/20", badge: "AI Pick" },
];

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  TikTok: SiTiktok,
  Instagram: SiInstagram,
  YouTube: SiYoutube,
};

const LIVE_EVENTS = [
  "Zara agency launched 3 new campaigns",
  "Creator @jayden earned $2,400 payout",
  "Skincare brand hit 4.8x campaign ROI",
  "New TikTok creator matched: 11% eng.",
  "Campaign brief approved in 4 minutes",
  "AI generated 12 creative concepts",
];

const STATS = [
  { icon: Users, label: "Creators indexed", value: "2.4M+", delta: "+12K this week" },
  { icon: BarChart3, label: "Avg campaign ROI", value: "4.2x", delta: "+0.3x vs last month" },
  { icon: DollarSign, label: "Creator payouts", value: "$8.4M", delta: "Processed this month" },
];

const AI_LINES = [
  "Matching your brand to top-performing creators…",
  "AI campaign templates ready for your niche.",
  "Your creator marketing operation starts here.",
  "2.4M creators. Zero guesswork.",
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function FloatingCreatorCard({
  creator, top, left, delay,
}: {
  creator: typeof CREATORS[0]; top: number; left: number; delay: number;
}) {
  const PlatIcon = PLATFORM_ICONS[creator.platform];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        scale: { delay, duration: 0.5 },
        y: { duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay: delay * 0.4 },
      }}
      style={{ top: `${top}%`, left: `${left}%` }}
      className={cn(
        "absolute bg-gradient-to-br border border-white/10 backdrop-blur-sm rounded-2xl px-3.5 py-3 shadow-xl",
        creator.color
      )}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-black text-white shrink-0">
          {creator.name[0]}
        </div>
        <div>
          <div className="text-white text-xs font-bold leading-tight">{creator.name}</div>
          <div className="text-white/50 text-[10px]">{creator.handle}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {PlatIcon && <PlatIcon className="h-2.5 w-2.5 text-white/40" />}
          <span className="text-white/40 text-[9px]">{creator.followers}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5 text-[#C6FF00]" />
          <span className="text-[#C6FF00] text-[10px] font-bold">{creator.eng}</span>
        </div>
      </div>
      <div className="mt-1.5">
        <span className="text-[9px] bg-[#C6FF00]/15 text-[#C6FF00] border border-[#C6FF00]/20 px-2 py-0.5 rounded-full font-medium">
          {creator.badge}
        </span>
      </div>
    </motion.div>
  );
}

function LiveTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LIVE_EVENTS.length), 2500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2 overflow-hidden">
      <div className="w-1.5 h-1.5 bg-[#C6FF00] rounded-full animate-pulse shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-white/60 text-xs truncate"
        >
          {LIVE_EVENTS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function AIBubble() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % AI_LINES.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/25 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-4 w-4 text-[#C6FF00]" />
      </div>
      <div className="flex-1 bg-white/4 border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-white/70 text-xs leading-relaxed"
          >
            {AI_LINES[idx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col h-full bg-[#0c0c0c] border-r border-white/5 relative overflow-hidden p-8">
      {/* Background glows */}
      <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-[#C6FF00]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center gap-2 mb-8"
      >
        <img src={logoPath} alt="BrandOps" className="h-8 w-auto" />
        <span className="text-white font-bold text-lg">BrandOps</span>
      </motion.div>

      {/* Hero text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 mb-6"
      >
        <h2 className="text-2xl font-black text-white leading-tight mb-2">
          The AI operating system<br />
          <span className="text-[#C6FF00]">for creator campaigns.</span>
        </h2>
        <p className="text-white/40 text-sm">Join 12,800+ brands already inside.</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="relative z-10 grid grid-cols-3 gap-2 mb-6"
      >
        {STATS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-3 text-center">
            <Icon className="h-3.5 w-3.5 text-[#C6FF00] mx-auto mb-1.5" />
            <div className="text-white font-black text-base">{value}</div>
            <div className="text-white/30 text-[9px] leading-tight mt-0.5">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Floating creator cards area */}
      <div className="relative flex-1 min-h-0 mb-4">
        <FloatingCreatorCard creator={CREATORS[0]} top={2} left={0} delay={0.5} />
        <FloatingCreatorCard creator={CREATORS[1]} top={28} left={52} delay={0.7} />
        <FloatingCreatorCard creator={CREATORS[2]} top={56} left={4} delay={0.9} />
        <FloatingCreatorCard creator={CREATORS[3]} top={72} left={50} delay={1.1} />

        {/* AI match indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#C6FF00]/10 border border-[#C6FF00]/25 rounded-full w-16 h-16 flex flex-col items-center justify-center"
        >
          <Sparkles className="h-5 w-5 text-[#C6FF00] mb-0.5" />
          <span className="text-[#C6FF00] text-[9px] font-bold text-center leading-tight">AI<br />Match</span>
        </motion.div>

        {/* Connecting lines visual */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" style={{ zIndex: 0 }}>
          <line x1="30%" y1="10%" x2="50%" y2="50%" stroke="#C6FF00" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="70%" y1="35%" x2="50%" y2="50%" stroke="#C6FF00" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="25%" y1="65%" x2="50%" y2="50%" stroke="#C6FF00" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="72%" y1="78%" x2="50%" y2="50%" stroke="#C6FF00" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Live ticker */}
      <div className="relative z-10 mb-3">
        <LiveTicker />
      </div>

      {/* AI bubble */}
      <div className="relative z-10">
        <AIBubble />
      </div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="relative z-10 flex items-center gap-3 mt-4 pt-4 border-t border-white/5"
      >
        {[
          { icon: Shield, label: "SOC 2 Compliant" },
          { icon: Star, label: "4.9 / 5 rating" },
          { icon: Megaphone, label: "50K+ campaigns" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-white/30">
            <Icon className="h-3 w-3" />
            <span className="text-[10px]">{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Input field ────────────────────────────────────────────────────────── */

function InputField({
  label, type = "text", value, onChange, placeholder, error, rightEl, delay = 0,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; rightEl?: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="space-y-1.5"
    >
      <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/4 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#C6FF00]/50 focus:bg-white/6 focus:shadow-[0_0_0_3px_rgba(198,255,0,0.07)]",
            error ? "border-red-500/50" : "border-white/10"
          )}
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400">{error}</motion.p>
      )}
    </motion.div>
  );
}

/* ─── Main Signup component ──────────────────────────────────────────────── */

export default function Signup() {
  const { signUpWithEmail, signInWithGoogle, user } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    if (user) setLocation("/onboarding");
  }, [user, setLocation]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Must be at least 8 characters";
    if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!accountType) e.accountType = "Select your account type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setGlobalError("");
    try {
      localStorage.setItem("brandops_account_type", accountType);
      await signUpWithEmail(email, password, name);
      setLocation("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      setGlobalError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setGlobalError("");
    try {
      await signInWithGoogle();
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      setLocation(onboarded ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setGlobalError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setGoogleLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const strength = passwordStrength();
  const strengthColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-[#C6FF00]"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  if (user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* ── Left panel ─────────────────────────────────── */}
      <div className="w-[400px] shrink-0">
        <LeftPanel />
      </div>

      {/* ── Right panel ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top nav */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <p className="text-white/30 text-xs">
            Already have an account?{" "}
            <button onClick={() => setLocation("/login")} className="text-[#C6FF00] hover:text-[#d4ff33] transition-colors font-medium">
              Sign in
            </button>
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4 lg:hidden">
                <img src={logoPath} alt="BrandOps" className="h-8 w-auto" />
                <span className="text-white font-bold">BrandOps</span>
              </div>
              <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
              <p className="text-white/40 text-sm">Start your 14-day free trial. No credit card.</p>
            </motion.div>

            {/* Google */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiGoogle className="h-4 w-4" />}
              {googleLoading ? "Connecting…" : "Continue with Google"}
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3"
            >
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-xs">or sign up with email</span>
              <div className="flex-1 h-px bg-white/8" />
            </motion.div>

            {/* Form fields */}
            <div className="space-y-4">
              <InputField label="Full name" value={name} onChange={setName} placeholder="Jane Smith" error={errors.name} delay={0.2} />
              <InputField label="Work email" type="email" value={email} onChange={setEmail} placeholder="jane@company.com" error={errors.email} delay={0.25} />

              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="8+ characters"
                error={errors.password}
                delay={0.3}
                rightEl={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/25 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              {password && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1 -mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className={cn("h-1 flex-1 rounded-full transition-all duration-300", i <= strength ? strengthColors[strength] : "bg-white/8")}
                      />
                    ))}
                  </div>
                  <p className={cn("text-xs", strength >= 3 ? "text-[#C6FF00]" : strength === 2 ? "text-yellow-400" : "text-red-400")}>
                    {strengthLabels[strength]}
                  </p>
                </motion.div>
              )}

              <InputField
                label="Confirm password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat password"
                error={errors.confirmPassword}
                delay={0.35}
                rightEl={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-white/25 hover:text-white/60 transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {/* Account type */}
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Account type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map(({ value, label }) => (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setAccountType(value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                        accountType === value
                          ? "border-[#C6FF00]/50 bg-[#C6FF00]/8 text-white shadow-[0_0_12px_rgba(198,255,0,0.08)]"
                          : "border-white/8 bg-white/2 text-white/50 hover:border-white/15 hover:text-white/80"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                        accountType === value ? "border-[#C6FF00] bg-[#C6FF00]" : "border-white/20"
                      )}>
                        {accountType === value && <Check className="h-2.5 w-2.5 text-black" />}
                      </div>
                      {label}
                    </motion.button>
                  ))}
                </div>
                {errors.accountType && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400">{errors.accountType}</motion.p>
                )}
              </motion.div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {globalError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-400 text-center bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  {globalError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleSignup}
              disabled={loading || googleLoading}
              whileHover={!loading && !googleLoading ? { scale: 1.02 } : {}}
              whileTap={!loading && !googleLoading ? { scale: 0.97 } : {}}
              className="w-full py-4 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(198,255,0,0.2)]"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating your account…</>
              ) : (
                <><Zap className="h-4 w-4" /> Create account — Start free</>
              )}
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-center text-[11px] text-white/20"
            >
              By creating an account, you agree to BrandOps{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms</span> and{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}
