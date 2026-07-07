import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useVideoPlayer, VideoView, type VideoContentFit } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { BrandOpsTheme } from "@/constants/brandopsTheme";
import { configureSubmissionVideoPlayer, formatPlaybackTime } from "@/lib/videoPlayerSetup";

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: VideoContentFit;
  showFullscreen?: boolean;
  /** Full chrome for submission detail; minimal tap-to-play for review cards. */
  variant?: "standard" | "immersive";
};

export function BrandOpsVideoSurface({
  uri,
  style,
  contentFit = "cover",
  showFullscreen = true,
  variant = "standard",
}: Props) {
  const videoRef = useRef<VideoView>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(uri, configureSubmissionVideoPlayer);

  useEffect(() => {
    setReady(false);
    setBuffering(true);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedPosition(0);
    fade.setValue(0);
  }, [uri, fade]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", ({ status }) => {
      setBuffering(status === "loading");
      if (status === "readyToPlay" && player.duration > 0) {
        setDuration(player.duration);
      }
    });
    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      setPlaying(isPlaying);
    });
    const timeSub = player.addListener("timeUpdate", ({ currentTime: t, bufferedPosition: buf }) => {
      setCurrentTime(t);
      setBufferedPosition(buf);
      if (player.duration > 0) setDuration(player.duration);
    });
    const loadSub = player.addListener("sourceLoad", ({ duration: d }) => {
      if (d > 0) setDuration(d);
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
      loadSub.remove();
    };
  }, [player]);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const bufferProgress = duration > 0 ? Math.min(1, bufferedPosition / duration) : 0;

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    player.play();
  };

  const toggleMute = () => {
    const next = !player.muted;
    player.muted = next;
    setMuted(next);
  };

  const seekToRatio = (ratio: number) => {
    if (duration <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    player.currentTime = clamped * duration;
  };

  const onBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const onBarPress = (locationX: number) => {
    if (barWidth <= 0) return;
    seekToRatio(locationX / barWidth);
  };

  const onFirstFrame = () => {
    setReady(true);
    setBuffering(false);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const immersive = variant === "immersive";
  const controlsInset = immersive ? 0 : 56;

  return (
    <View style={[{ backgroundColor: "#000", overflow: "hidden" }, style]}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <VideoView
          ref={videoRef}
          style={{ width: "100%", height: "100%" }}
          player={player}
          nativeControls={false}
          contentFit={contentFit}
          onFirstFrameRender={onFirstFrame}
        />
      </Animated.View>

      {!ready ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.centered, { backgroundColor: "#000" }]}>
          <ActivityIndicator color={BrandOpsTheme.colors.lime} />
        </View>
      ) : null}

      {ready && buffering && playing ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.centered, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}

      <Pressable
        onPress={togglePlay}
        style={[styles.playTapArea, { bottom: controlsInset }]}
        accessibilityRole="button"
        accessibilityLabel={playing ? "Pause video" : "Play video"}
      >
        {!playing ? (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        ) : null}
      </Pressable>

      {!immersive ? (
        <View style={styles.controls}>
          <Pressable
            onLayout={onBarLayout}
            onPress={(event) => onBarPress(event.nativeEvent.locationX)}
            accessibilityRole="adjustable"
            accessibilityLabel="Seek video"
            style={{ height: 18, justifyContent: "center" }}
          >
            <View style={styles.track}>
              <View style={[styles.bufferFill, { width: `${bufferProgress * 100}%` }]} />
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </Pressable>

          <View style={styles.controlRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={toggleMute}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={muted ? "Unmute video" : "Mute video"}
              >
                <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
              </Pressable>
              <Text style={styles.timeLabel}>
                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
              </Text>
            </View>

            {showFullscreen ? (
              <Pressable
                onPress={() => void videoRef.current?.enterFullscreen()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fullscreen"
              >
                <Ionicons name="expand-outline" size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.immersiveControls}>
          <Pressable
            onPress={toggleMute}
            hitSlop={10}
            style={styles.immersiveIconButton}
            accessibilityRole="button"
            accessibilityLabel={muted ? "Unmute video" : "Mute video"}
          >
            <Ionicons name={muted ? "volume-mute" : "volume-high"} size={16} color="#fff" />
          </Pressable>
          {showFullscreen ? (
            <Pressable
              onPress={() => void videoRef.current?.enterFullscreen()}
              hitSlop={10}
              style={styles.immersiveIconButton}
              accessibilityRole="button"
              accessibilityLabel="Fullscreen"
            >
              <Ionicons name="expand-outline" size={16} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  playTapArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 28,
    backgroundColor: "rgba(0,0,0,0.72)",
    gap: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  bufferFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  progressFill: {
    height: 4,
    backgroundColor: BrandOpsTheme.colors.lime,
    borderRadius: 2,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  immersiveControls: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  immersiveIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
