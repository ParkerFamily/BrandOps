import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandOpsToastHost } from "@/components/ui/Toast";
import { AuthRouteGuard } from "@/components/auth/AuthRouteGuard";
import { AuthQuerySync } from "@/components/auth/AuthQuerySync";
import { OneSignalBootstrap } from "@/components/notifications/OneSignalBootstrap";
import { ExpoUpdatesBootstrap } from "@/components/updates/ExpoUpdatesBootstrap";
import { initApiClient } from "@/lib/apiClient";

initApiClient();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthRouteGuard>
          <AuthQuerySync />
          <OneSignalBootstrap />
          <ExpoUpdatesBootstrap />
          {children}
          <BrandOpsToastHost />
        </AuthRouteGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
