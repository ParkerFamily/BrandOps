import { Router, type IRouter } from "express";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
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

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramWord {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        words: DeepgramWord[];
      }>;
    }>;
  };
}

// ASS/FFmpeg subtitle style strings (colors are BGR not RGB)
const CAPTION_STYLES: Record<string, string> = {
  bold_white:
    "Fontsize=22,Bold=1,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=1,MarginV=160",
  neon_lime:
    "Fontsize=22,Bold=1,PrimaryColour=&H00FFC6,OutlineColour=&H000000,Outline=2,Shadow=1,MarginV=160",
  minimal:
    "Fontsize=20,Bold=0,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1,Shadow=0,MarginV=160",
  karaoke:
    "Fontsize=26,Bold=1,PrimaryColour=&H00FFFF,OutlineColour=&H000000,Outline=3,Shadow=2,MarginV=160",
};

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

async function transcribeWithDeepgram(audioPath: string): Promise<{
  segments: Segment[];
  fullText: string;
  wordTimestamps: WordTimestamp[];
}> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const audioBuffer = await readFile(audioPath);

  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&words=true&language=en",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/mp3",
      },
      body: audioBuffer,
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Deepgram API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as DeepgramResponse;
  const alt = data.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error("Deepgram returned no transcript");

  const fullText = alt.transcript?.trim() ?? "";
  const words = alt.words ?? [];

  // Group words into 6-word caption segments using real timestamps
  const WORDS_PER_SEG = 6;
  const segments: Segment[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_SEG) {
    const chunk = words.slice(i, i + WORDS_PER_SEG);
    const text = chunk.map(w => w.punctuated_word ?? w.word).join(" ");
    segments.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end + 0.1,
      text,
    });
  }

  const wordTimestamps: WordTimestamp[] = words.map(w => ({
    word: w.punctuated_word ?? w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));

  return { segments, fullText, wordTimestamps };
}

interface ProcessParams {
  submissionId: string;
  videoUrl: string;
  campaignTitle: string;
  brandName: string;
  ctaText: string;
  captionStyle?: string;
}

async function processVideo(params: ProcessParams): Promise<void> {
  const { submissionId, videoUrl, campaignTitle, brandName, ctaText, captionStyle = "bold_white" } = params;
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

    // 2. Extract audio for Deepgram (16 kHz mono, max 120 s)
    logger.info({ submissionId }, "Extracting audio");
    const audioPath = `${tmp}_audio.mp3`;
    await runFFmpeg([
      "-i", inputPath,
      "-vn", "-ar", "16000", "-ac", "1",
      "-t", "120",
      "-y", audioPath,
    ]);

    // 3. Transcribe with Deepgram
    let srtContent = "";
    let fullTranscript = "";
    let wordTimestamps: WordTimestamp[] = [];
    try {
      logger.info({ submissionId }, "Transcribing with Deepgram nova-2");
      const result = await transcribeWithDeepgram(audioPath);
      fullTranscript = result.fullText;
      wordTimestamps = result.wordTimestamps;
      srtContent = buildSrt(result.segments);
      logger.info({ submissionId, words: wordTimestamps.length }, "Deepgram transcription done");
    } catch (err) {
      logger.warn({ err, submissionId }, "Transcription failed — skipping captions");
    }

    // 4. Write SRT file (if we have captions)
    const srtPath = `${tmp}_subs.srt`;
    let hasCaptions = false;
    if (srtContent) {
      await writeFile(srtPath, srtContent, "utf8");
      hasCaptions = true;
    }

    // 5. Build FFmpeg filter chain
    const styleStr = CAPTION_STYLES[captionStyle] ?? CAPTION_STYLES.bold_white;

    const vfParts: string[] = [
      "scale=w=1080:h=1920:force_original_aspect_ratio=decrease",
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black",
    ];

    if (hasCaptions) {
      const safeSrtPath = srtPath.replace(/'/g, "\\'");
      vfParts.push(
        `subtitles='${safeSrtPath}':force_style='${styleStr}'`,
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
    logger.info({ submissionId, captionStyle }, "Rendering with FFmpeg");
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

    // 7. Update Firestore with transcript, word timestamps, and style used
    await writeFirestoreDoc("submissions", submissionId, {
      processingStatus: "done",
      processedVideoUrl,
      subtitlesContent: fullTranscript || null,
      wordTimestamps: wordTimestamps.length > 0 ? wordTimestamps : null,
      captionStyle,
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
    const suffixes = ["_input.mp4", "_audio.mp3", "_subs.srt", "_output.mp4"];
    for (const sfx of suffixes) {
      unlink(`${tmp}${sfx}`).catch(() => {});
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/video/process", async (req, res): Promise<void> => {
  const { submissionId, videoUrl, campaignTitle, brandName, ctaText, captionStyle } = req.body as {
    submissionId?: string;
    videoUrl?: string;
    campaignTitle?: string;
    brandName?: string;
    ctaText?: string;
    captionStyle?: string;
  };

  if (!submissionId || !videoUrl) {
    res.status(400).json({ error: "submissionId and videoUrl are required" });
    return;
  }

  processVideo({
    submissionId,
    videoUrl,
    campaignTitle: campaignTitle ?? "",
    brandName: brandName ?? "BrandOps",
    ctaText: ctaText ?? "Learn More",
    captionStyle: captionStyle ?? "bold_white",
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

    logger.info({ submissionId, choice }, "Video approved");
    res.json({ success: true, videoUrl: finalVideoUrl });
  } catch (err) {
    logger.error({ err, submissionId }, "Failed to approve video");
    res.status(500).json({ error: "Failed to save approval" });
  }
});

// ── Watermarked export ────────────────────────────────────────────────────────
// Burns a semi-transparent "BrandOps" text watermark into the top-right corner.
// Free users always export with this watermark; paid users can skip it.

router.post("/video/export-watermarked", async (req, res): Promise<void> => {
  const { submissionId, videoUrl } = req.body as {
    submissionId?: string;
    videoUrl?: string;
  };

  if (!submissionId || !videoUrl) {
    res.status(400).json({ error: "submissionId and videoUrl are required" });
    return;
  }

  const tmp = `/tmp/bo_wm_${submissionId}_${Date.now()}`;
  const inputPath = `${tmp}_input.mp4`;
  const outputPath = `${tmp}_wm.mp4`;

  try {
    logger.info({ submissionId }, "Watermark export: downloading video");
    await downloadVideo(videoUrl, inputPath);

    // Logo-based watermark: scale logo to 35% of video width, remove black bg via colorkey,
    // center it at 45% opacity; fallback to drawtext if logo file is missing.
    const logoFile = "/home/runner/workspace/artifacts/brandops/public/logo.png";
    const logoExists = existsSync(logoFile);

    logger.info({ submissionId, logoExists }, "Watermark export: rendering with FFmpeg");

    if (logoExists) {
      const filterComplex =
        "[1:v]scale=iw*0.35:-1," +
        "colorkey=0x000000:similarity=0.25:blend=0.1," +
        "format=rgba,colorchannelmixer=aa=0.45[logo];" +
        "[0:v][logo]overlay=(W-w)/2:(H-h)/2";

      await runFFmpeg([
        "-i", inputPath,
        "-i", logoFile,
        "-filter_complex", filterComplex,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-movflags", "+faststart",
        "-c:a", "copy",
        "-y", outputPath,
      ]);
    } else {
      const watermarkFilter =
        "drawtext=text='BrandOps':" +
        "x=(w-tw)/2:y=(h-th)/2:" +
        "fontsize=40:fontcolor=white@0.35:" +
        "box=1:boxcolor=black@0.15:boxborderw=16";

      await runFFmpeg([
        "-i", inputPath,
        "-vf", watermarkFilter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-movflags", "+faststart",
        "-c:a", "copy",
        "-y", outputPath,
      ]);
    }

    // Stream the file directly to the client — no Firebase upload needed
    logger.info({ submissionId }, "Watermark export: streaming to client");
    const filename = `brandops_${submissionId}_watermarked.mp4`;
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const { createReadStream } = await import("node:fs");
    const stream = createReadStream(outputPath);
    stream.pipe(res);

    stream.on("end", () => {
      unlink(inputPath).catch(() => {});
      unlink(outputPath).catch(() => {});
      logger.info({ submissionId }, "Watermark export complete");
    });
    stream.on("error", (err) => {
      logger.error({ err, submissionId }, "Watermark stream error");
      unlink(inputPath).catch(() => {});
      unlink(outputPath).catch(() => {});
    });
    return; // don't fall through to finally cleanup
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, submissionId }, "Watermark export failed");
    res.status(500).json({ error: msg });
  } finally {
    // only clean up on error path (success path cleans up on stream end)
    if (!res.headersSent) {
      unlink(inputPath).catch(() => {});
      unlink(outputPath).catch(() => {});
    }
  }
});

export default router;
