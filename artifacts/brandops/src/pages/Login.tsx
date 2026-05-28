import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { SiGoogle } from "react-icons/si";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { signInWithGoogle, user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    setLocation("/");
    return null;
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <img
            src={logoPath}
            alt="BrandOps"
            className="h-12 w-auto mb-6"
            data-testid="img-logo"
          />
          <h1 className="text-2xl font-bold tracking-tight">Welcome to BrandOps</h1>
          <p className="text-muted-foreground mt-2 text-sm text-center">
            The operations platform for UGC campaigns. Sign in to continue.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg shadow-black/20">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            data-testid="button-google-signin"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to BrandOps Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Background accent */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </div>
  );
}
