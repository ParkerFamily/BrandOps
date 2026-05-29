import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useListCampaigns, getListSubmissionsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Link, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCampaignId?: number;
  preselectedCampaignTitle?: string;
}

async function findOrCreateCreator(name: string, email: string) {
  const r = await fetch(`${BASE}api/creators/find-or-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!r.ok) throw new Error("Failed to identify creator");
  return r.json() as Promise<{ id: number }>;
}

async function createSubmission(campaignId: number, creatorId: number, videoUrl: string, notes?: string) {
  const r = await fetch(`${BASE}api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, creatorId, videoUrl, notes }),
  });
  if (!r.ok) throw new Error("Failed to submit video");
  return r.json();
}

export function SubmitVideoDialog({ open, onOpenChange, preselectedCampaignId, preselectedCampaignTitle }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: campaigns } = useListCampaigns();
  const activeCampaigns = campaigns?.filter((c) => c.status === "active" || c.status === "draft") ?? [];

  const [campaignId, setCampaignId] = useState<string>(preselectedCampaignId ? String(preselectedCampaignId) : "");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!campaignId || !videoUrl.trim()) throw new Error("Missing fields");
      const creator = await findOrCreateCreator(
        user?.displayName ?? user?.email ?? "Creator",
        user?.email ?? ""
      );
      return createSubmission(Number(campaignId), creator.id, videoUrl.trim(), notes.trim() || undefined);
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      toast({ title: "Video submitted!", description: "The brand team will review your submission shortly." });
      setTimeout(() => {
        setDone(false);
        setVideoUrl("");
        setNotes("");
        onOpenChange(false);
      }, 2000);
    },
    onError: (e: Error) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  const canSubmit = !!campaignId && !!videoUrl.trim() && !submit.isPending && !done;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-card-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Submit Your Video
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste your video link below. Accepted: Google Drive, Vimeo, Dropbox, YouTube, or any direct link.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-12 w-12 text-primary" />
            <p className="font-semibold text-lg">Submitted!</p>
            <p className="text-sm text-muted-foreground text-center">The brand team will review your video and get back to you.</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Campaign selector */}
            <div className="space-y-2">
              <Label>Campaign</Label>
              {preselectedCampaignId ? (
                <div className="px-3 py-2.5 rounded-lg bg-background border border-border text-sm font-medium">
                  {preselectedCampaignTitle ?? `Campaign #${preselectedCampaignId}`}
                </div>
              ) : (
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCampaigns.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                        {c.payoutPerVideo ? ` — $${c.payoutPerVideo}/video` : ""}
                      </SelectItem>
                    ))}
                    {activeCampaigns.length === 0 && (
                      <SelectItem value="none" disabled>No active campaigns</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="video-url" className="flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5" />
                Video Link
              </Label>
              <Input
                id="video-url"
                placeholder="https://drive.google.com/… or https://vimeo.com/…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-background border-input"
              />
              <p className="text-xs text-muted-foreground">
                Make sure the link is set to "anyone with the link can view".
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="notes"
                placeholder="Any context for the brand — e.g. alternate cuts available, specific brief points you addressed…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-input resize-none h-24"
              />
            </div>

            <Button
              onClick={() => submit.mutate()}
              disabled={!canSubmit}
              className={cn(
                "w-full gap-2 font-semibold",
                canSubmit ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.15)]" : "opacity-40"
              )}
            >
              {submit.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Upload className="h-4 w-4" /> Submit Video</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
