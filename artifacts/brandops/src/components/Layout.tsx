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
  Activity,
  LogOut,
} from "lucide-react";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/creators", label: "Creators", icon: Users },
  { path: "/submissions", label: "Submissions", icon: Inbox },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

const BOTTOM_NAV_ITEMS = [
  { path: "/team", label: "Team", icon: UsersRound },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: health } = useHealthCheck();
  const { user, logout } = useAuth();

  const NavLinks = ({ items }: { items: typeof NAV_ITEMS }) => (
    <>
      {items.map((item) => {
        const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.path} 
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            onClick={() => setSidebarOpen(false)}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <img src={logoPath} alt="BrandOps Logo" className="h-6 w-auto" />
          <span className="font-semibold text-lg">BrandOps</span>
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
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out
        md:relative md:transform-none flex flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <img src={logoPath} alt="BrandOps Logo" className="h-8 w-auto" />
          <span className="font-bold text-xl tracking-tight">BrandOps</span>
        </div>

        <nav className="flex-1 px-4 py-4 md:py-0 space-y-1 overflow-y-auto">
          <NavLinks items={NAV_ITEMS} />
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <NavLinks items={BOTTOM_NAV_ITEMS} />
          
          <div className="flex items-center gap-2 px-3 pt-3 pb-1 mt-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3 shrink-0" />
            <span>System: {health?.status ?? "checking..."}</span>
          </div>

          {/* User profile strip */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-3 mt-2 border-t border-sidebar-border/50">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="h-7 w-7 rounded-full object-cover shrink-0"
                  data-testid="img-user-avatar"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground" data-testid="text-user-name">
                  {user.displayName ?? user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
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
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
