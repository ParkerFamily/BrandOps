import { useMemo } from "react";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { BrandOpsScreen } from "@/components/ui/BrandOpsScreen";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsButton } from "@/components/ui/BrandOpsButton";
import { H1, H2, P, Label } from "@/components/ui/BrandOpsText";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";
import type { UserRole } from "@/lib/types";

const roles: { role: UserRole; title: string; desc: string }[] = [
  { role: "creator", title: "Creator", desc: "Onboard, submit UGC, handle revisions, track payouts." },
  { role: "brand", title: "Brand", desc: "Quickly review submissions, approve/reject, manage campaigns." },
  { role: "agency", title: "Agency", desc: "Approve content across brand accounts, monitor pipelines." },
  { role: "creator_manager", title: "Creator Manager", desc: "Manage creators, submissions, approvals, and payouts." },
];

export default function RoleScreen() {
  const { role } = useAuth();
  if (role) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(auth)/onboarding" />;
}

