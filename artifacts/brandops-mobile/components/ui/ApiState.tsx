import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";

export function ApiLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <ActivityIndicator color={BrandOpsTheme.colors.lime} />
      <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 12 }}>{label}</Text>
    </View>
  );
}

export function ApiEmpty({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ paddingVertical: 32, alignItems: "center" }}>
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "900", fontSize: 18 }}>{title}</Text>
      <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, textAlign: "center", lineHeight: 20 }}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={{ marginTop: 16 }}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ApiError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: 32, alignItems: "center" }}>
      <Text style={{ color: BrandOpsTheme.colors.danger, fontWeight: "800" }}>Couldn&apos;t load data</Text>
      <Text style={{ color: BrandOpsTheme.colors.muted, marginTop: 8, textAlign: "center" }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={{ marginTop: 16 }}>
          <Text style={{ color: BrandOpsTheme.colors.lime, fontWeight: "800" }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ApiNotConfigured() {
  return (
    <ApiEmpty
      title="API not configured"
      body="Set EXPO_PUBLIC_API_BASE_URL in .env and restart Expo to load live workspace data."
    />
  );
}
