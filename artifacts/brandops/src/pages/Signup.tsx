import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle } from "react-icons/si";
import { Loader2, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "brandops_onboarded";

const ACCOUNT_TYPES = [
  { value: "Brand", label: "Brand" },
  { value: "Agency", label: "Agency" },
  { value: "Solo Founder", label: "Solo Founder" },
  { value: "App Founder", label: "App Founder" },
  { value: "Ecommerce Brand", label: "Ecommerce" },
  { value: "Creator", label: "Creator" },
  { value: "Creator Manager", label: "Creator Manager" },
];

function InputField({
  label, type = "text", value, onChange, placeholder, error, rightEl,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; rightEl?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/4 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#C6FF00]/50 focus:bg-white/6 focus:shadow-[0_0_0_3px_rgba(198,255,0,0.08)]",
            error ? "border-red-500/60" : "border-white/10"
          )}
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

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
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!accountType) e.accountType = "Please select an account type";
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
      const msg = err instanceof Error ? err.message : "Signup failed. Please try again.";
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
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-[#C6FF00]"][strength];

  if (user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-[#C6FF00]/20 blur-2xl rounded-full" />
            <img src={logoPath} alt="BrandOps" className="relative h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Create your account</h1>
          <p className="text-white/40 mt-1.5 text-sm text-center">Start your 14-day free trial. No credit card.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-white/8 rounded-2xl p-7 shadow-lg shadow-black/40 space-y-5"
        >
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiGoogle className="h-4 w-4" />}
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/25 text-xs">or sign up with email</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <div className="space-y-4">
            <InputField label="Full name" value={name} onChange={setName} placeholder="Jane Smith" error={errors.name} />
            <InputField label="Work email" type="email" value={email} onChange={setEmail} placeholder="jane@company.com" error={errors.email} />

            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="8+ characters"
              error={errors.password}
              rightEl={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= strength ? strengthColor : "bg-white/10")} />
                  ))}
                </div>
                <p className={cn("text-xs", strength >= 3 ? "text-[#C6FF00]" : strength === 2 ? "text-yellow-400" : "text-red-400")}>
                  {strengthLabel}
                </p>
              </div>
            )}

            <InputField
              label="Confirm password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat password"
              error={errors.confirmPassword}
              rightEl={
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-white/30 hover:text-white/60 transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Account type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccountType(value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                      accountType === value
                        ? "border-[#C6FF00]/50 bg-[#C6FF00]/8 text-white"
                        : "border-white/8 bg-white/2 text-white/50 hover:border-white/20 hover:text-white/80"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                      accountType === value ? "border-[#C6FF00] bg-[#C6FF00]" : "border-white/20"
                    )}>
                      {accountType === value && <Check className="h-2.5 w-2.5 text-black" />}
                    </div>
                    {label}
                  </button>
                ))}
              </div>
              {errors.accountType && <p className="text-xs text-red-400">{errors.accountType}</p>}
            </div>
          </div>

          {globalError && (
            <p className="text-sm text-red-400 text-center bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              {globalError}
            </p>
          )}

          <button
            onClick={handleSignup}
            disabled={loading || googleLoading}
            className="w-full py-3.5 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Creating your account..." : "Create account →"}
          </button>

          <p className="text-center text-xs text-white/25">
            Already have an account?{" "}
            <button onClick={() => setLocation("/login")} className="text-[#C6FF00] hover:text-[#d4ff33] transition-colors font-medium">
              Sign in
            </button>
          </p>
        </motion.div>

        <p className="text-center text-xs text-white/20 mt-5">
          By creating an account, you agree to BrandOps{" "}
          <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms of Service</span> and{" "}
          <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
        </p>
      </div>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C6FF00]/4 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-500/3 blur-[80px] rounded-full" />
      </div>
    </div>
  );
}
