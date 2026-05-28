import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import NewCampaign from "@/pages/NewCampaign";
import Creators from "@/pages/Creators";
import CreatorDetail from "@/pages/CreatorDetail";
import Submissions from "@/pages/Submissions";
import Payments from "@/pages/Payments";
import Analytics from "@/pages/Analytics";
import AIAssistant from "@/pages/AIAssistant";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/campaigns" component={Campaigns} />
              <Route path="/campaigns/new" component={NewCampaign} />
              <Route path="/campaigns/:id" component={CampaignDetail} />
              <Route path="/creators" component={Creators} />
              <Route path="/creators/:id" component={CreatorDetail} />
              <Route path="/submissions" component={Submissions} />
              <Route path="/payments" component={Payments} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/ai" component={AIAssistant} />
              <Route path="/team" component={Team} />
              <Route path="/settings" component={Settings} />
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