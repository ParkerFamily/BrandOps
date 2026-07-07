import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsCard } from "@/components/ui/BrandOpsCard";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { buildCreatorLaunchChecklist, type ChecklistItemId } from "@/lib/creatorLaunchChecklist";
import type { CreatorPayoutSetup } from "@/lib/creatorPayoutSetup";
import type { FirestoreSubmission } from "@/lib/submissionsFirestore";

type Props = {
  photoUrl?: string | null;
  payoutSetup: CreatorPayoutSetup | null;
  submissions: FirestoreSubmission[] | undefined;
  compact?: boolean;
};

function actionForItem(id: ChecklistItemId, router: ReturnType<typeof useRouter>): () => void {
  switch (id) {
    case "photo":
      return () => router.push("/settings" as never);
    case "payout":
      return () => router.push("/settings/payouts" as never);
    case "submission":
      return () => router.push("/(tabs)/campaigns" as never);
    default:
      return () => {};
  }
}

export function CreatorLaunchChecklist({ photoUrl, payoutSetup, submissions, compact }: Props) {
  const router = useRouter();
  const { items, completed, total, allDone } = buildCreatorLaunchChecklist({
    photoUrl,
    payoutSetup,
    submissions,
  });

  if (allDone) return null;

  return (
    <BrandOpsCard variant="soft" style={{ marginBottom: compact ? 12 : 16, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>
            GET STARTED
          </Text>
          <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18, marginTop: 6 }}>
            Complete your profile
          </Text>
        </View>
        <Text style={{ color: BrandOpsTheme.colors.muted, fontWeight: "800", fontSize: 13 }}>
          {completed}/{total}
        </Text>
      </View>

      <View style={{ height: 6, borderRadius: 999, backgroundColor: BrandOpsTheme.colors.surface, overflow: "hidden" }}>
        <View
          style={{
            height: "100%",
            width: `${Math.round((completed / total) * 100)}%`,
            backgroundColor: BrandOpsTheme.colors.lime,
          }}
        />
      </View>

      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.done ? undefined : actionForItem(item.id, router)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 6,
              opacity: item.done ? 0.75 : 1,
            }}
          >
            <Ionicons
              name={item.done ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={item.done ? BrandOpsTheme.colors.lime : BrandOpsTheme.colors.subtle}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: item.done ? BrandOpsTheme.colors.muted : BrandOpsTheme.colors.text,
                  fontWeight: "700",
                  fontSize: 14,
                  textDecorationLine: item.done ? "line-through" : "none",
                }}
              >
                {item.label}
              </Text>
              {!item.done && !compact ? (
                <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12, marginTop: 2 }}>{item.hint}</Text>
              ) : null}
            </View>
            {!item.done ? (
              <Ionicons name="chevron-forward" size={16} color={BrandOpsTheme.colors.subtle} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </BrandOpsCard>
  );
}
