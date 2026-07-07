import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { BrandOpsVideoSurface } from "@/components/video/BrandOpsVideoSurface";
import {
  resolveSubmissionVideoPlayback,
  type SubmissionPlayback,
} from "@/lib/resolveSubmissionVideoPlayback";

type Props = {
  videoUrl: string | null | undefined;
  storagePath?: string | null;
  submissionType?: "upload" | "link";
  /** Fixed height (review feed cards). */
  height?: number;
  /** Portrait-friendly layout for submission detail. */
  aspectRatio?: number;
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
  /** Minimal chrome for swipe review cards. */
  variant?: "standard" | "immersive";
};

function PlaybackMessage({
  height,
  icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  height: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        height,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#000",
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={36} color={BrandOpsTheme.colors.subtle} />
      <Text style={{ color: BrandOpsTheme.colors.text, fontWeight: "800", fontSize: 14, textAlign: "center" }}>
        {title}
      </Text>
      {detail ? (
        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
          {detail}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            marginTop: 4,
            backgroundColor: BrandOpsTheme.colors.lime,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: "#0A0A0A", fontWeight: "900", fontSize: 12 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function resolveContainerStyle(props: Props): StyleProp<ViewStyle> {
  if (props.aspectRatio) {
    return [
      {
        width: "100%",
        aspectRatio: props.aspectRatio,
        maxHeight: props.maxHeight ?? 420,
        alignSelf: "center",
      },
      props.style,
    ];
  }
  return [{ width: "100%", height: props.height ?? 280 }, props.style];
}

function resolveFallbackHeight(props: Props): number {
  if (props.height) return props.height;
  if (props.maxHeight) return props.maxHeight;
  return 280;
}

export function ReviewVideoPlayer({
  videoUrl,
  storagePath,
  submissionType,
  height,
  aspectRatio,
  maxHeight,
  style,
  variant = "standard",
}: Props) {
  const [playback, setPlayback] = useState<SubmissionPlayback | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const containerStyle = resolveContainerStyle({ height, aspectRatio, maxHeight, style });
  const fallbackHeight = resolveFallbackHeight({ height, maxHeight });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlayback(null);

    void resolveSubmissionVideoPlayback({ videoUrl, storagePath, submissionType })
      .then((result) => {
        if (cancelled) return;
        setPlayback(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load video.";
        const fallback = videoUrl?.trim();
        setPlayback(
          fallback
            ? { uri: fallback, mode: "remote", error: message }
            : { uri: null, mode: "missing", error: message }
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoUrl, storagePath, submissionType, reloadKey]);

  if (loading) {
    return (
      <View style={[containerStyle, { alignItems: "center", justifyContent: "center", backgroundColor: "#000" }]}>
        <ActivityIndicator color={BrandOpsTheme.colors.lime} />
        <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 12, marginTop: 10 }}>Preparing video…</Text>
      </View>
    );
  }

  if (!playback || playback.mode === "missing" || !playback.uri) {
    return (
      <PlaybackMessage
        height={fallbackHeight}
        icon="videocam-off-outline"
        title="Video unavailable"
        detail={playback?.error ?? "This submission has no playable video file yet."}
        actionLabel="Retry"
        onAction={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (playback.mode === "link") {
    return (
      <PlaybackMessage
        height={fallbackHeight}
        icon="link-outline"
        title="External video link"
        detail="This creator submitted a social link. Open it in the browser — in-app playback isn't supported for TikTok/Instagram links."
        actionLabel="Open link"
        onAction={() => void Linking.openURL(playback.uri!)}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <BrandOpsVideoSurface
        uri={playback.uri}
        style={{ flex: 1 }}
        contentFit="cover"
        variant={variant}
      />
      {playback.error ? (
        <View
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: 10,
            backgroundColor: "rgba(0,0,0,0.65)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: BrandOpsTheme.colors.warning, fontSize: 11 }} numberOfLines={2}>
            {playback.error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ReviewVideoLoading({ height }: { height: number }) {
  return (
    <View style={{ height, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
      <ActivityIndicator color={BrandOpsTheme.colors.lime} />
    </View>
  );
}
