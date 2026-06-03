import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, ExternalLink, Loader2, Film, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FsSubmission } from "@/lib/firestore";

const BASE = import.meta.env.BASE_URL;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FsSubmission;
  onApproved?: () => void;
}

export function VideoPreviewDialog({ open, onOpenChange, submission, onApproved }: Props) {
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
        title: choice === "processed" ? "Enhanced version submitted!" : "Original submitted to brand!",
        description: "The brand team will now review your video.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] bg-card border-card-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Preview Your Enhanced Video
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review both versions and choose which to submit to the brand.
          </DialogDescription>
        </DialogHeader>

        {/* View toggle */}
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveView("original")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeView === "original"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Film className="h-3.5 w-3.5" />
            Original
          </button>
          <button
            onClick={() => setActiveView("enhanced")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeView === "enhanced"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Enhanced
            {activeView === "enhanced" && (
              <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">AI</span>
            )}
          </button>
        </div>

        {/* Video display */}
        <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
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
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Sparkles className="h-10 w-10 opacity-30" />
                <p className="text-sm">Enhanced version not available</p>
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
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Film className="h-10 w-10 opacity-30" />
                <p className="text-sm text-center px-4">
                  Original is hosted externally — open it in a new tab to compare.
                </p>
                <a
                  href={submission.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary text-sm hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Original Video
                </a>
              </div>
            )
          )}

          {/* Badge overlay */}
          <div className="absolute top-3 left-3 pointer-events-none">
            {activeView === "enhanced" ? (
              <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
                <Wand2 className="h-2.5 w-2.5" /> AI Enhanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                Original
              </span>
            )}
          </div>
        </div>

        {/* Enhancement badges */}
        <div className="flex flex-wrap gap-2">
          {[
            "✓ Auto Captions",
            "✓ Brand Watermark",
            "✓ CTA Overlay",
            "✓ 9:16 Format",
          ].map(label => (
            <Badge
              key={label}
              variant="outline"
              className="text-xs text-primary border-primary/30 bg-primary/5"
            >
              {label}
            </Badge>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3 pt-1">
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
            {approving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />}
            Submit Enhanced to Brand
          </Button>
          <Button
            variant="outline"
            onClick={() => handleApprove("original")}
            disabled={approving}
            className="gap-2"
          >
            <Film className="h-4 w-4" />
            Use Original
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
