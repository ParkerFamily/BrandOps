import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Check, ExternalLink, Loader2, Film, Wand2,
  FileText, Download, Lock, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type FsSubmission } from "@/lib/firestore";
import { useSubscription } from "@/hooks/use-subscription";

const BASE = import.meta.env.BASE_URL;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FsSubmission;
  onApproved?: () => void;
  isBrand?: boolean;
}

export function VideoPreviewDialog({ open, onOpenChange, submission, onApproved, isBrand }: Props) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeView, setActiveView] = useState<"original" | "enhanced">("original");
  const [approving, setApproving] = useState(false);
  const [watermarkLoading, setWatermarkLoading] = useState(false);

  const { canRemoveWatermark, plan, isLoading: planLoading } = useSubscription();

  const handleApprove = async (choice: "processed" | "original") => {
    setApproving(true);
    try {
      const res = await fetch(`${BASE}api/video/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, choice }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast({
        title: isBrand
          ? choice === "processed" ? "Enhanced version approved!" : "Original approved!"
          : choice === "processed" ? "Enhanced version submitted!" : "Original submitted to brand!",
        description: isBrand ? "Submission marked as approved." : "The brand team will now review your video.",
      });
      onApproved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  // Download a URL directly (no server processing)
  const handleDirectDownload = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${label.replace(/\s+/g, "_")}.mp4`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Download failed", description: "Try opening the video and saving manually.", variant: "destructive" });
    }
  };

  // Export with BrandOps watermark burned in server-side
  const handleWatermarkedExport = async () => {
    const videoUrl = activeView === "enhanced" && hasEnhanced
      ? submission.processedVideoUrl!
      : submission.videoUrl;

    setWatermarkLoading(true);
    try {
      const res = await fetch(`${BASE}api/video/export-watermarked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, videoUrl }),
      });
      if (!res.ok) throw new Error("Server error");
      // Endpoint streams the file directly — save blob as download
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `brandops_${submission.id ?? "export"}_watermarked.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast({ title: "Export failed", description: "Could not generate watermarked video.", variant: "destructive" });
    } finally {
      setWatermarkLoading(false);
    }
  };

  const handleUpgradeRedirect = () => {
    onOpenChange(false);
    navigate("/billing");
  };

  const isDirectVideoUrl = (url: string) =>
    /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ||
    url.includes("firebasestorage.googleapis.com");

  const transcript = submission.subtitlesContent;
  const hasEnhanced = !!submission.processedVideoUrl;
  const activeVideoUrl = activeView === "enhanced" && hasEnhanced
    ? submission.processedVideoUrl!
    : submission.videoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full bg-card border-card-border text-card-foreground p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">

          {/* Left — portrait video */}
          <div className="lg:w-[340px] shrink-0 bg-black flex flex-col">
            <div className="p-4 pb-2 border-b border-white/10">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Video Preview
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* View toggle — only shown when enhanced exists */}
            {hasEnhanced && (
              <div className="flex gap-1 bg-white/5 rounded-lg p-1 mx-4 mt-3 mb-2">
                <button
                  onClick={() => setActiveView("original")}
                  className={cn(
                    "flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    activeView === "original"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  <Film className="h-3 w-3" /> Original
                </button>
                <button
                  onClick={() => setActiveView("enhanced")}
                  className={cn(
                    "flex items-center gap-1.5 flex-1 justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    activeView === "enhanced"
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  <Wand2 className="h-3 w-3" /> Enhanced
                  <span className="ml-0.5 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">AI</span>
                </button>
              </div>
            )}

            {/* Portrait video */}
            <div className="relative flex-1 min-h-0 mx-4 mb-4 mt-3 rounded-xl overflow-hidden bg-zinc-900">
              <div className="w-full h-full" style={{ aspectRatio: "9/16", maxHeight: "65vh" }}>
                {isDirectVideoUrl(activeVideoUrl) ? (
                  <video
                    key={activeVideoUrl}
                    src={activeVideoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground p-4">
                    <Film className="h-10 w-10 opacity-30" />
                    <p className="text-sm text-center">Hosted externally</p>
                    <a href={activeVideoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary text-sm hover:underline">
                      <ExternalLink className="h-4 w-4" /> Open Video
                    </a>
                  </div>
                )}

                {/* BrandOps watermark overlay — visible for free plan users */}
                {!planLoading && !canRemoveWatermark && (
                  <div className="absolute inset-0 pointer-events-none select-none flex flex-col items-center justify-center gap-3">
                    <img
                      src="/logo.png"
                      alt="BrandOps watermark"
                      style={{ width: "55%", maxWidth: 180, opacity: 0.22, filter: "drop-shadow(0 0 12px rgba(198,255,0,0.25))" }}
                    />
                    <span
                      className="font-black tracking-widest uppercase"
                      style={{ color: "rgba(198,255,0,0.35)", fontSize: 13, letterSpacing: "0.22em" }}
                    >
                      BrandOps
                    </span>
                  </div>
                )}

                {hasEnhanced && (
                  <div className="absolute top-2 left-2 pointer-events-none">
                    {activeView === "enhanced" ? (
                      <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
                        <Wand2 className="h-2.5 w-2.5" /> AI Enhanced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                        Original
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — transcript + export + actions */}
          <div className="flex-1 flex flex-col border-t lg:border-t-0 lg:border-l border-border min-h-0 overflow-y-auto">

            {/* Enhancements applied badge row */}
            {hasEnhanced && (
              <div className="p-5 border-b border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Applied Enhancements</p>
                <div className="flex flex-wrap gap-2">
                  {["✓ Auto Captions", "✓ Brand Watermark", "✓ CTA Overlay", "✓ 9:16 Format"].map(label => (
                    <Badge key={label} variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="flex-1 flex flex-col min-h-0 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Transcript
                  {transcript && <span className="ml-2 normal-case text-primary/70 font-normal">via Deepgram</span>}
                </p>
              </div>
              <ScrollArea className="flex-1 rounded-lg bg-muted/30 border border-border min-h-[80px]">
                <div className="p-4">
                  {transcript ? (
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{transcript}</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No transcript available yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Export */}
            <div className="p-5 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Export</p>

              <div className="grid grid-cols-1 gap-2">
                {/* Export without watermark — paid only */}
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "w-full gap-2 justify-start",
                      canRemoveWatermark
                        ? "border-primary/40 text-primary hover:bg-primary/10"
                        : "opacity-60 cursor-not-allowed",
                    )}
                    disabled={planLoading || !canRemoveWatermark}
                    onClick={
                      canRemoveWatermark
                        ? () => handleDirectDownload(activeVideoUrl, `clean_${submission.id ?? "video"}`)
                        : undefined
                    }
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    Export without watermark
                    {!canRemoveWatermark && !planLoading && (
                      <Badge className="ml-auto text-[10px] bg-primary/15 text-primary border-primary/30 gap-1 px-1.5">
                        <Zap className="h-2.5 w-2.5" /> Upgrade
                      </Badge>
                    )}
                  </Button>
                  {!canRemoveWatermark && !planLoading && (
                    <button
                      onClick={handleUpgradeRedirect}
                      className="absolute inset-0 w-full h-full rounded-md"
                      aria-label="Upgrade to remove watermark"
                    />
                  )}
                </div>

                {/* Export with BrandOps watermark — always available */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 justify-start"
                  disabled={watermarkLoading}
                  onClick={handleWatermarkedExport}
                >
                  {watermarkLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    : <Download className="h-3.5 w-3.5 shrink-0" />
                  }
                  {watermarkLoading ? "Adding watermark…" : "Export with BrandOps watermark"}
                </Button>

                {/* Open in tab */}
                <a href={activeVideoUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="sm" variant="ghost" className="w-full gap-2 justify-start text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    Open in tab
                  </Button>
                </a>
              </div>

              {/* Upgrade nudge for free users */}
              {!canRemoveWatermark && !planLoading && (
                <div
                  className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={handleUpgradeRedirect}
                >
                  <Lock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary/80 leading-snug">
                    Upgrade to Starter or Growth to remove the BrandOps watermark.
                  </p>
                </div>
              )}
            </div>

            {/* Approve CTAs — only shown when enhanced version exists */}
            {hasEnhanced && (
              <div className="p-5 border-t border-border">
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove("processed")}
                    disabled={approving}
                    className="flex-1 gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
                  >
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {isBrand ? "Approve Enhanced" : "Submit Enhanced to Brand"}
                  </Button>
                  <Button variant="outline" onClick={() => handleApprove("original")} disabled={approving} className="gap-2">
                    <Film className="h-4 w-4" />
                    {isBrand ? "Approve Original" : "Use Original"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
