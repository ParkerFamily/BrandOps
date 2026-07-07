import type { VideoPlayer } from "expo-video";

/** Shared defaults for UGC submission playback — muted until the viewer opts in. */
export function configureSubmissionVideoPlayer(player: VideoPlayer) {
  player.loop = false;
  player.muted = true;
  player.volume = 1;
  player.audioMixingMode = "mixWithOthers";
  player.timeUpdateEventInterval = 0.25;
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
