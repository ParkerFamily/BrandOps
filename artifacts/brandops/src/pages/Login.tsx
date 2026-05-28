import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle } from "react-icons/si";
import { Loader2, ArrowLeft } from "lucide-react";

const ONBOARDING_KEY = "brandops_onboarded";

export default function Login() {
  const { signInWithGoogle, user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      setLocation(onboarded ? "/dashboard" : "/onboarding");
    }
  }, [user, setLocation]);

  if (user) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      const onboarded = localStorage.getItem(ONBOARDING_KEY);
      setLocation(onboarded ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#C6FF00]/20 blur-2xl rounded-full" />
            <img
              src={logoPath}
              alt="BrandOps"
              className="relative h-14 w-auto"
              data-testid="img-logo"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Welcome to BrandOps
          </h1>
          <p className="text-white/40 mt-2 text-sm text-center">
            The AI operating system for creator campaigns.
          </p>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 shadow-lg shadow-black/40">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            data-testid="button-google-signin"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SiGoogle className="h-5 w-5" />
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          {error && (
            <p
              className="mt-4 text-sm text-red-400 text-center"
              data-testid="text-auth-error"
            >
              {error}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-white/30 text-xs">
              14-day free trial · No credit card required
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          By signing in, you agree to BrandOps Terms of Service and Privacy
          Policy.
        </p>
      </div>

      {/* Background glows */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C6FF00]/4 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-blue-500/3 blur-[80px] rounded-full" />
      </div>
    </div>
  );
}
