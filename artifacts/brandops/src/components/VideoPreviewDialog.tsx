import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, ExternalLink, Loader2, Film, Wand2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FsSubmission } from "@/lib/firestore";

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
  const [activeView, setActiveView] = useState<"original" | "enhanced">("enhanced");
  const [approving, setApproving] = useState(false);

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

  const isDirectVideoUrl = (url: string) =>
    /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ||
    url.includes("firebasestorage.googleapis.com");

  const transcript = submission.subtitlesContent;

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
                  Preview Your Enhanced Video
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* View toggle */}
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
                <Film className="h-3 w-3" />
                Original
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
                <Wand2 className="h-3 w-3" />
                Enhanced
                {activeView === "enhanced" && (
                  <span className="ml-0.5 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">AI</span>
                )}
              </button>
            </div>

            {/* Portrait video container */}
            <div className="relative flex-1 min-h-0 mx-4 mb-4 rounded-xl overflow-hidden bg-zinc-900">
              <div className="w-full h-full" style={{ aspectRatio: "9/16", maxHeight: "60vh" }}>
                {activeView === "enhanced" ? (
                  submission.processedVideoUrl ? (
                    <video
                      key={submission.processedVideoUrl}
                      src={submission.processedVideoUrl}
                      controls
                      autoPlay={false}
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-4">
                      <Sparkles className="h-10 w-10 opacity-30" />
                      <p className="text-sm text-center">Enhanced version not available</p>
                    </div>
                  )
                ) : (
                  isDirectVideoUrl(submission.videoUrl) ? (
                    <video
                      key={submission.videoUrl}
                      src={submission.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground p-4">
                      <Film className="h-10 w-10 opacity-30" />
                      <p className="text-sm text-center">Original hosted externally</p>
                      <a href={submission.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary text-sm hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        Open Original
                      </a>
                    </div>
                  )
                )}

                {/* Badge overlay */}
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
              </div>
            </div>
          </div>

          {/* Right — transcript + actions */}
          <div className="flex-1 flex flex-col border-t lg:border-t-0 lg:border-l border-border min-h-0">

            {/* Enhancements applied */}
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

            {/* Transcript */}
            <div className="flex-1 flex flex-col min-h-0 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Video Transcript
                  {transcript && <span className="ml-2 normal-case text-primary/70 font-normal">via Whisper AI</span>}
                </p>
              </div>
              <ScrollArea className="flex-1 rounded-lg bg-muted/30 border border-border">
                <div className="p-4">
                  {transcript ? (
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {transcript}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Transcript not yet available.
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Run AI enhancement to generate a transcript from the video audio.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* CTA */}
            <div className="p-5 border-t border-border">
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove("processed")}
                  disabled={approving || !submission.processedVideoUrl}
                  className={cn(
                    "flex-1 gap-2 font-semibold",
                    submission.processedVideoUrl
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]"
                      : "opacity-40",
                  )}
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

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
