import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle } from "react-icons/si";
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { getOnboarded } from "@/lib/onboarding";

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

export default function Login() {
  const { signInWithGoogle, signInWithEmail, resetPassword, user } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    if (user) {
      setLocation(getOnboarded() ? "/dashboard" : "/onboarding");
    }
  }, [user, setLocation]);

  if (user) return null;

  const handleLogin = async () => {
    const e: Record<string, string> = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setGlobalError("");
    try {
      await signInWithEmail(email, password);
      setLocation(getOnboarded() ? "/dashboard" : "/onboarding");
    } catch {
      setGlobalError("Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setGlobalError("");
    try {
      await signInWithGoogle();
      setLocation(getOnboarded() ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setGlobalError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleReset = async () => {
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) return;
    setResetLoading(true);
    try {
      await resetPassword(forgotEmail);
      setResetSent(true);
    } catch {
      setGlobalError("Couldn't send reset email. Check the address and try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

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
          <h1 className="text-2xl font-black tracking-tight text-white">Welcome back</h1>
          <p className="text-white/40 mt-1.5 text-sm text-center">Sign in to your BrandOps account</p>
        </div>

        <AnimatePresence mode="wait">
          {showForgot ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/3 border border-white/8 rounded-2xl p-7 shadow-lg shadow-black/40 space-y-5"
            >
              <div>
                <button onClick={() => { setShowForgot(false); setResetSent(false); setForgotEmail(""); }} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs mb-4 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <h2 className="text-lg font-bold text-white mb-1">Reset your password</h2>
                <p className="text-white/40 text-sm">We'll send a reset link to your email.</p>
              </div>

              {resetSent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-[#C6FF00]" />
                  </div>
                  <p className="text-white font-semibold">Reset link sent!</p>
                  <p className="text-white/40 text-sm">Check your inbox at <span className="text-white">{forgotEmail}</span></p>
                  <button onClick={() => { setShowForgot(false); setResetSent(false); }} className="text-[#C6FF00] text-sm hover:text-[#d4ff33] transition-colors mt-2">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <InputField
                    label="Your email"
                    type="email"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    placeholder="jane@company.com"
                  />
                  {globalError && <p className="text-sm text-red-400 text-center">{globalError}</p>}
                  <button
                    onClick={handleReset}
                    disabled={resetLoading || !forgotEmail.trim()}
                    className="w-full py-3 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {resetLoading ? "Sending..." : "Send reset link"}
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                <span className="text-white/25 text-xs">or sign in with email</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <div className="space-y-4" onKeyDown={handleKeyDown}>
                <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="jane@company.com" error={errors.email} />
                <div>
                  <InputField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="Your password"
                    error={errors.password}
                    rightEl={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/60 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={() => { setShowForgot(true); setForgotEmail(email); setGlobalError(""); }}
                      className="text-xs text-white/30 hover:text-[#C6FF00] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>

              {globalError && (
                <p className="text-sm text-red-400 text-center bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                  {globalError}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <p className="text-center text-xs text-white/25">
                Don't have an account?{" "}
                <button onClick={() => setLocation("/signup")} className="text-[#C6FF00] hover:text-[#d4ff33] transition-colors font-medium">
                  Start free
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-white/20 mt-5">
          By signing in, you agree to BrandOps{" "}
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
