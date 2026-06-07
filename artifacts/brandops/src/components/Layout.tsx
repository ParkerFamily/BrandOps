import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Inbox,
  CreditCard,
  BarChart3,
  UsersRound,
  Settings,
  Menu,
  LogOut,
  Zap,
  Command,
  Video,
  DollarSign,
  Receipt,
} from "lucide-react";
import logoPath from "@assets/image_1780635730449.png";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { FloatingAI } from "@/components/FloatingAI";

import { getOnboarded } from "@/lib/onboarding";
const getOnboarding = getOnboarded;

const BRAND_NAV = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/creators", label: "Creators", icon: Users },
  { path: "/submissions", label: "Submissions", icon: Inbox },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/billing", label: "Billing & Plans", icon: Receipt },
];

const CREATOR_NAV = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/campaigns", label: "Available Campaigns", icon: Megaphone },
  { path: "/submissions", label: "My Submissions", icon: Video },
  { path: "/earnings", label: "Earnings & Payouts", icon: DollarSign },
];

const BOTTOM_NAV_ITEMS = [
  { path: "/team", label: "Team", icon: UsersRound },
  { path: "/settings", label: "Settings", icon: Settings },
];

function BrandOpsIcon() {
  return (
    <div className="relative w-8 h-8 shrink-0">
      <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm" />
      <div className="relative w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Zap className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const onboarding = getOnboarding();
  const isCreator = onboarding?.accountType === "Creator" || onboarding?.accountType === "Creator Manager";
  const NAV_ITEMS = isCreator ? CREATOR_NAV : BRAND_NAV;
  const workspaceName = onboarding?.accountType ?? "BrandOps";

  const NavLinks = ({ items }: { items: typeof NAV_ITEMS }) => (
    <>
      {items.map((item) => {
        const isActive =
          location === item.path ||
          (item.path !== "/dashboard" && location.startsWith(item.path));
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium relative group",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
            onClick={() => setSidebarOpen(false)}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
            )}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>{item.label}</span>
            {item.label === "Billing & Plans" && (
              <span className="ml-auto text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-semibold tracking-wide">
                ✦
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <img src={logoPath} alt="BrandOps" className="w-8 h-8 object-contain" />
          <span className="font-bold text-base tracking-tight">BrandOps</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-muted-foreground hover:text-foreground"
          data-testid="button-mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out",
          "md:sticky md:top-0 md:h-screen md:transform-none flex flex-col shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="px-5 py-5 hidden md:block border-b border-sidebar-border/50 mb-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img src={logoPath} alt="BrandOps" className="w-8 h-8 object-contain" />
            <div>
              <div className="font-black text-base tracking-tight leading-none group-hover:text-primary transition-colors">
                BrandOps
              </div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase mt-0.5">
                {isCreator ? "Creator Hub" : "AI Campaign OS"}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          <NavLinks items={NAV_ITEMS} />
        </nav>

        <div className="px-3 pb-3 space-y-0.5 border-t border-sidebar-border pt-3">
          <NavLinks items={BOTTOM_NAV_ITEMS} />

          {/* Command palette hint */}
          <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-white/2 border border-white/5 text-xs text-muted-foreground cursor-pointer hover:bg-white/5 transition-colors">
            <Command className="h-3 w-3 shrink-0" />
            <span>Command palette</span>
            <kbd className="ml-auto bg-white/5 border border-white/10 rounded px-1 text-[10px]">⌘K</kbd>
          </div>

          {/* Health indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary animate-pulse" />
            <span className="truncate">System online</span>
          </div>

          {/* User profile strip */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 border-t border-sidebar-border/50 rounded-lg hover:bg-white/3 transition-colors">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="h-7 w-7 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                  data-testid="img-user-avatar"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  data-testid="text-user-name"
                >
                  {user.displayName ?? user.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                title="Sign out"
                data-testid="button-logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Floating AI — draggable over the whole app */}
      <FloatingAI />
    </div>
  );
}
