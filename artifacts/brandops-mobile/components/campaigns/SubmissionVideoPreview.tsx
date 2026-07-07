import { Text, View } from "react-native";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { BrandOpsVideoSurface } from "@/components/video/BrandOpsVideoSurface";
import { formatPlaybackTime } from "@/lib/videoPlayerSetup";
import type { PickedVideo } from "@/lib/pickSubmissionVideo";

type Props = {
  video: PickedVideo;
};

function formatDuration(ms: number | null): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  return formatPlaybackTime(ms / 1000);
}

export function SubmissionVideoPreview({ video }: Props) {
  const duration = formatDuration(video.durationMs);

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#000",
          aspectRatio: 9 / 16,
          maxHeight: 360,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <BrandOpsVideoSurface key={video.uri} uri={video.uri} style={{ flex: 1 }} contentFit="cover" />
      </View>
      <Text style={{ color: BrandOpsTheme.colors.muted, fontSize: 13 }} numberOfLines={2}>
        {video.fileName}
        {duration ? ` · ${duration}` : ""}
      </Text>
      <Text style={{ color: BrandOpsTheme.colors.subtle, fontSize: 12 }}>
        Tap to play. Starts muted — unmute with the speaker icon. Expand for fullscreen scrubbing.
      </Text>
    </View>
  );
}
