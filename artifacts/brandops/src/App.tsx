import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import NewCampaign from "@/pages/NewCampaign";
import Creators from "@/pages/Creators";
import CreatorDetail from "@/pages/CreatorDetail";
import Submissions from "@/pages/Submissions";
import Payments from "@/pages/Payments";
import Earnings from "@/pages/Earnings";
import Analytics from "@/pages/Analytics";
import AIAssistant from "@/pages/AIAssistant";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
import Billing from "@/pages/Billing";
import Subscribe from "@/pages/Subscribe";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SmartRoot() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C6FF00]" />
      </div>
    );
  }

  if (user) return null;
  return <Landing />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={SmartRoot} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      <Route path="/subscribe">
        <ProtectedRoute>
          <Subscribe />
        </ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/campaigns" component={Campaigns} />
              <Route path="/campaigns/new" component={NewCampaign} />
              <Route path="/campaigns/:id" component={CampaignDetail} />
              <Route path="/creators" component={Creators} />
              <Route path="/creators/:id" component={CreatorDetail} />
              <Route path="/submissions" component={Submissions} />
              <Route path="/payments" component={Payments} />
              <Route path="/earnings" component={Earnings} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/ai" component={AIAssistant} />
              <Route path="/team" component={Team} />
              <Route path="/settings" component={Settings} />
              <Route path="/billing" component={Billing} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
