import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, User, Briefcase, Globe, CreditCard, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

import { getOnboarded, clearOnboarded } from "@/lib/onboarding";
const PROFILE_KEY = "brandops_profile";

interface OnboardingData {
  accountType: string;
  goal: string;
  platforms: string[];
  budget: string;
  niches: string[];
  teamSize: string;
  turnaround: string;
  completedAt?: string;
}

interface Profile {
  brandName: string;
  website: string;
}

const loadOnboarding = (): OnboardingData | null => getOnboarded() as OnboardingData | null;

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { brandName: "", website: "" };
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const onboarding = loadOnboarding();

  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile.brandName && !profile.website) {
      const stored = loadProfile();
      setProfile(stored);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    toast({ title: "Profile saved", description: "Your workspace profile has been updated." });
    setTimeout(() => setSaved(false), 2000);
  };

  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace and account.</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Account Info */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account
            </CardTitle>
            <CardDescription>Your signed-in account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(user?.displayName ?? user?.email ?? "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.displayName ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              {onboarding?.accountType && (
                <span className="ml-auto shrink-0 text-xs bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 font-medium">
                  {onboarding.accountType}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-muted-foreground border-border hover:text-foreground gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Workspace Profile */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {isCreator ? "Creator Profile" : "Workspace Profile"}
            </CardTitle>
            <CardDescription>
              {isCreator ? "Update your creator info." : "Update your brand information."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">{isCreator ? "Display Name" : "Brand Name"}</Label>
              <Input
                id="brand-name"
                placeholder={isCreator ? "Your creator name" : "Your brand name"}
                value={profile.brandName}
                onChange={(e) => setProfile((p) => ({ ...p, brandName: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                {isCreator ? "Portfolio / Link" : "Website"}
              </Label>
              <Input
                id="website"
                placeholder={isCreator ? "https://yourportfolio.com" : "https://yourbrand.com"}
                value={profile.website}
                onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                className="bg-background border-input"
              />
            </div>
            <Button
              onClick={handleSave}
              className={cn(
                "gap-2 transition-all",
                saved ? "bg-green-600 hover:bg-green-600" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Selections */}
        {onboarding && (
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Workspace Configuration
              </CardTitle>
              <CardDescription>
                Your onboarding selections — these personalize your AI and workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Account Type", value: onboarding.accountType },
                  { label: isCreator ? "Content Style" : "Primary Goal", value: onboarding.goal },
                  { label: isCreator ? "Target Rate" : "Budget", value: onboarding.budget },
                  { label: isCreator ? "Turnaround" : "Team Size", value: isCreator ? onboarding.turnaround : onboarding.teamSize },
                ].filter((r) => r.value).map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                    <p className="font-medium text-sm">{value}</p>
                  </div>
                ))}
                {onboarding.niches?.length > 0 && (
                  <div className="col-span-2 p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Niches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onboarding.niches.map((n) => (
                        <span key={n} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                {onboarding.platforms?.length > 0 && !isCreator && (
                  <div className="col-span-2 p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{isCreator ? "Services" : "Video Channels"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onboarding.platforms.map((p) => (
                        <span key={p} className="text-xs bg-white/5 text-foreground border border-border rounded-full px-2 py-0.5">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                To change these, <button onClick={() => { clearOnboarded(); window.location.href = "/onboarding"; }} className="text-primary underline underline-offset-2">re-run onboarding</button>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Billing */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Billing & Invoices
            </CardTitle>
            <CardDescription>Manage your subscription and payment methods.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-background border border-border text-center py-8">
              <p className="text-sm text-muted-foreground">No active subscription.</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a plan from the <a href="/" className="text-primary underline underline-offset-2">pricing page</a> to get started.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
