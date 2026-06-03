import { Router, type IRouter } from "express";
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { openai } from "@workspace/integrations-openai-ai-server";
import { writeFirestoreDoc, readFirestoreDoc, uploadToFirebaseStorage } from "../firebaseAdmin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function secondsToSrtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

interface Segment { start: number; end: number; text: string }

function buildSrt(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const text = seg.text.trim();
      if (!text) return "";
      return `${i + 1}\n${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n${text}\n`;
    })
    .filter(Boolean)
    .join("\n");
}

function resolveDirectUrl(url: string): string {
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}&confirm=t`;
  }
  if (url.includes("dropbox.com")) {
    return url.replace(/\?dl=0$/, "?dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }
  return url;
}

async function downloadVideo(url: string, destPath: string): Promise<void> {
  const directUrl = resolveDirectUrl(url);
  const resp = await fetch(directUrl, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 BrandOps/1.0" },
  });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const arrayBuf = await resp.arrayBuffer();
  await writeFile(destPath, Buffer.from(arrayBuf));
}

async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    const errChunks: Buffer[] = [];
    proc.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg exited ${code}: ${Buffer.concat(errChunks).toString().slice(-800)}`));
    });
    proc.on("error", reject);
  });
}

async function transcribeAudio(audioPath: string): Promise<Segment[]> {
  const transcription = await (openai.audio.transcriptions.create as Function)({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  }) as { segments?: Array<{ start: number; end: number; text: string }> };

  return (transcription.segments ?? []).map(s => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));
}

interface ProcessParams {
  submissionId: string;
  videoUrl: string;
  campaignTitle: string;
  brandName: string;
  ctaText: string;
}

async function processVideo(params: ProcessParams): Promise<void> {
  const { submissionId, videoUrl, campaignTitle, brandName, ctaText } = params;
  const tmp = `/tmp/bo_${submissionId}`;

  try {
    await mkdir("/tmp", { recursive: true });
    await writeFirestoreDoc("submissions", submissionId, {
      processingStatus: "processing",
      processingError: null,
    });

    // 1. Download source video
    logger.info({ submissionId }, "Downloading source video");
    const inputPath = `${tmp}_input.mp4`;
    await downloadVideo(videoUrl, inputPath);

    // 2. Extract audio for Whisper (16 kHz mono, max 120 s)
    logger.info({ submissionId }, "Extracting audio");
    const audioPath = `${tmp}_audio.mp3`;
    await runFFmpeg([
      "-i", inputPath,
      "-vn", "-ar", "16000", "-ac", "1",
      "-t", "120",
      "-y", audioPath,
    ]);

    // 3. Transcribe
    let srtContent = "";
    let segments: Segment[] = [];
    try {
      logger.info({ submissionId }, "Transcribing audio with Whisper");
      segments = await transcribeAudio(audioPath);
      srtContent = buildSrt(segments);
      logger.info({ submissionId, segmentCount: segments.length }, "Transcription done");
    } catch (err) {
      logger.warn({ err, submissionId }, "Whisper transcription failed — skipping captions");
    }

    // 4. Write SRT file (if we have captions)
    const srtPath = `${tmp}_subs.srt`;
    let hasCaptions = false;
    if (srtContent) {
      await writeFile(srtPath, srtContent, "utf8");
      hasCaptions = true;
    }

    // 5. Build FFmpeg filter chain
    const vfParts: string[] = [
      // Scale to fit 1080×1920, pad remainder with black
      "scale=w=1080:h=1920:force_original_aspect_ratio=decrease",
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black",
    ];

    if (hasCaptions) {
      // subtitles filter — libass handles SRT natively
      const safeSrtPath = srtPath.replace(/'/g, "\\'");
      vfParts.push(
        `subtitles='${safeSrtPath}':force_style='Fontsize=22,Bold=1,` +
        `PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=1,MarginV=160'`,
      );
    }

    if (brandName) {
      const safeText = escapeFfmpegText(brandName.toUpperCase());
      vfParts.push(
        `drawtext=text='${safeText}':x=w-tw-24:y=24:fontsize=26:fontcolor=white:` +
        `box=1:boxcolor=black@0.55:boxborderw=12`,
      );
    }

    if (ctaText) {
      const safeText = escapeFfmpegText(ctaText);
      vfParts.push(
        `drawtext=text='${safeText}':x=(w-tw)/2:y=h-130:fontsize=38:fontcolor=black:` +
        `box=1:boxcolor=0xC6FF00@1:boxborderw=20`,
      );
    }

    const outputPath = `${tmp}_output.mp4`;
    logger.info({ submissionId }, "Rendering with FFmpeg");
    await runFFmpeg([
      "-i", inputPath,
      "-vf", vfParts.join(","),
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "128k",
      "-t", "120",
      "-y", outputPath,
    ]);

    // 6. Upload processed video to Firebase Storage
    logger.info({ submissionId }, "Uploading to Firebase Storage");
    const videoBuffer = await readFile(outputPath);
    const storagePath = `processed-videos/${submissionId}.mp4`;
    const processedVideoUrl = await uploadToFirebaseStorage(videoBuffer, storagePath, "video/mp4");

    // 7. Update Firestore
    await writeFirestoreDoc("submissions", submissionId, {
      processingStatus: "done",
      processedVideoUrl,
      subtitlesContent: srtContent || null,
    });
    logger.info({ submissionId, processedVideoUrl }, "Video processing complete");

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, submissionId }, "Video processing failed");
    await writeFirestoreDoc("submissions", submissionId, {
      processingStatus: "error",
      processingError: msg,
    }).catch(() => {});
  } finally {
    // Cleanup temp files
    const suffixes = ["_input.mp4", "_audio.mp3", "_subs.srt", "_output.mp4"];
    for (const sfx of suffixes) {
      unlink(`${tmp}${sfx}`).catch(() => {});
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/video/process", async (req, res): Promise<void> => {
  const { submissionId, videoUrl, campaignTitle, brandName, ctaText } = req.body as {
    submissionId?: string;
    videoUrl?: string;
    campaignTitle?: string;
    brandName?: string;
    ctaText?: string;
  };

  if (!submissionId || !videoUrl) {
    res.status(400).json({ error: "submissionId and videoUrl are required" });
    return;
  }

  // Kick off async — respond immediately
  processVideo({
    submissionId,
    videoUrl,
    campaignTitle: campaignTitle ?? "",
    brandName: brandName ?? "BrandOps",
    ctaText: ctaText ?? "Learn More",
  }).catch(err => logger.error({ err, submissionId }, "Unhandled video processing error"));

  res.json({ status: "processing", submissionId });
});

router.get("/video/status/:submissionId", async (req, res): Promise<void> => {
  const { submissionId } = req.params;
  try {
    const submission = await readFirestoreDoc<{
      processingStatus?: string;
      processedVideoUrl?: string;
      processingError?: string;
      subtitlesContent?: string;
    }>("submissions", submissionId);

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    res.json({
      processingStatus: submission.processingStatus ?? "idle",
      processedVideoUrl: submission.processedVideoUrl ?? null,
      processingError: submission.processingError ?? null,
    });
  } catch (err) {
    logger.error({ err, submissionId }, "Failed to read video status");
    res.status(500).json({ error: "Failed to read status" });
  }
});

router.post("/video/approve", async (req, res): Promise<void> => {
  const { submissionId, choice } = req.body as {
    submissionId?: string;
    choice?: "processed" | "original";
  };

  if (!submissionId || !choice) {
    res.status(400).json({ error: "submissionId and choice are required" });
    return;
  }

  try {
    const submission = await readFirestoreDoc<{
      processedVideoUrl?: string;
      videoUrl?: string;
    }>("submissions", submissionId);

    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const finalVideoUrl =
      choice === "processed"
        ? (submission.processedVideoUrl ?? submission.videoUrl ?? "")
        : (submission.videoUrl ?? "");

    await writeFirestoreDoc("submissions", submissionId, {
      status: "pending",
      videoUrl: finalVideoUrl,
      creatorApproval: choice === "processed" ? "approved_processed" : "approved_original",
    });

    logger.info({ submissionId, choice }, "Creator approved video");
    res.json({ success: true, videoUrl: finalVideoUrl });
  } catch (err) {
    logger.error({ err, submissionId }, "Failed to approve video");
    res.status(500).json({ error: "Failed to save approval" });
  }
});

export default router;
