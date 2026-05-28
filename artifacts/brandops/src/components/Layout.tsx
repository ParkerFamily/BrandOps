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
  Activity
} from "lucide-react";
import logoPath from "@assets/ChatGPT_Image_May_28,_2026,_01_51_59_AM_1779947531447.png";
import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";

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
            <Icon className="h-4 w-4" />
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
          
          <div className="flex items-center gap-2 px-3 pt-4 pb-2 mt-4 border-t border-sidebar-border/50 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>System: {health?.status || 'checking...'}</span>
          </div>
        </div>
      </div>

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