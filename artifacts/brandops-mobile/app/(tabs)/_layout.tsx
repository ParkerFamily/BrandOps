import { WorkspaceRefreshOnFocus } from "@/components/sync/WorkspaceRefreshOnFocus";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { TAB_BAR_BASE_HEIGHT } from "@/constants/layout";
import { useAuth } from "@/contexts/AuthContext";
import { canReviewSubmissions } from "@/lib/roleExperience";

export default function TabLayout() {
  const colorScheme = "dark";
  const { user, role, loading } = useAuth();
  const creator = !canReviewSubmissions(role);
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Math.max(insets.bottom, 10);

  if (loading || !role) return null;

  return (
    <>
      <WorkspaceRefreshOnFocus />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: "#0A0A0A",
          borderTopColor: "rgba(255,255,255,0.10)",
          paddingTop: 8,
          paddingBottom: tabBarBottomPadding,
          height: TAB_BAR_BASE_HEIGHT + tabBarBottomPadding,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: creator ? "Campaigns" : "Campaigns",
          tabBarIcon: ({ color, size }) => <Ionicons name="rocket-outline" color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: creator ? "Upload" : "Review",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={creator ? "cloud-upload-outline" : "checkmark-done-outline"}
              color={color}
              size={size ?? 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size ?? 24} />,
        }}
      />
    </Tabs>
    </>
  );
}
