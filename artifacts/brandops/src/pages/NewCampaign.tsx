import { useLocation } from "wouter";
import { useCreateCampaign, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Video, Users, Target } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  totalBudget: z.coerce.number().min(100, { message: "Minimum budget is $100." }),
  payoutPerVideo: z.coerce.number().min(10, { message: "Minimum payout is $10." }),
  videosNeeded: z.coerce.number().min(1, { message: "At least 1 video required." }),
  platform: z.enum(["tiktok", "instagram", "youtube"]),
  videoStyle: z.string().min(1, { message: "Select a video style." }),
  tone: z.string().min(1, { message: "Select a tone." }),
  creatorType: z.string().optional(),
  deadline: z.string().min(1, { message: "Deadline is required." }),
  inspirationUrls: z.string().optional(),
});

const VIDEO_STYLES = [
  "Talking Head", "Product Demo", "Lifestyle", "Voiceover", "Testimonial", "Comedy", "Tutorial",
];

const TONES = [
  "Authentic", "Energetic", "Educational", "Funny", "Casual", "Professional", "Serious",
];

const CREATOR_TYPES = [
  "Any", "On-Camera", "Voiceover Only", "Lifestyle", "Professional Actor",
];

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCampaign = useCreateCampaign();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      totalBudget: 1000,
      payoutPerVideo: 100,
      videosNeeded: 5,
      platform: "tiktok",
      videoStyle: "",
      tone: "",
      creatorType: "",
      deadline: "",
      inspirationUrls: "",
    },
  });

  const totalBudget = form.watch("totalBudget");
  const payoutPerVideo = form.watch("payoutPerVideo");
  const videosNeeded = form.watch("videosNeeded");
  const estimatedVideos = payoutPerVideo > 0 ? Math.floor(totalBudget / payoutPerVideo) : 0;

  function onSubmit(values: z.infer<typeof formSchema>) {
    createCampaign.mutate({
      data: {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
        creatorType: values.creatorType ?? "",
      }
    }, {
      onSuccess: (data) => {
        toast({ title: "Campaign created", description: "Your campaign has been created as a draft." });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setLocation(`/campaigns/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create campaign. Please try again.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Define what content you need — BrandOps will match creators by production fit, not follower count.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Campaign basics */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Skincare Launch" {...field}
                      className="bg-background border-input" data-testid="input-campaign-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief / Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want creators to produce — the product, key messages, and what the brand will do with the video…"
                      className="min-h-[100px] bg-background border-input"
                      {...field} data-testid="input-campaign-desc" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Format Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-input" data-testid="select-campaign-platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok (vertical 9:16)</SelectItem>
                      <SelectItem value="instagram">Instagram (square / Reels)</SelectItem>
                      <SelectItem value="youtube">YouTube (16:9 / Shorts)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Content spec */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Content Requirements
              </CardTitle>
              <CardDescription>Define the style and tone of video you need — used to match the right creator.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="videoStyle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Style</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-input" data-testid="select-campaign-style">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VIDEO_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-input" data-testid="select-campaign-tone">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="creatorType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Creator Type <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-input" data-testid="select-campaign-creatortype">
                        <SelectValue placeholder="Any creator type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREATOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Budget */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Budget & Payout
              </CardTitle>
              <CardDescription>Creators are only paid after you approve their submitted video.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="totalBudget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-background border-input" data-testid="input-campaign-budget" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="payoutPerVideo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout / Video ($)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-background border-input" data-testid="input-campaign-payout" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="videosNeeded" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Videos Needed</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} className="bg-background border-input" data-testid="input-campaign-videos" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Budget breakdown */}
              <div className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total budget</span>
                  <span className="font-semibold text-white">${totalBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payout per approved video</span>
                  <span className="font-semibold text-white">${payoutPerVideo}</span>
                </div>
                <div className="border-t border-white/8 pt-2 flex justify-between">
                  <span className="text-muted-foreground">Budget covers up to</span>
                  <span className="font-bold text-primary">{estimatedVideos} videos</span>
                </div>
                {videosNeeded > estimatedVideos && (
                  <p className="text-xs text-yellow-400/80 mt-1">
                    Budget may not cover all {videosNeeded} videos needed — consider increasing budget or reducing payout.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="bg-background border-input" data-testid="input-campaign-deadline" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="inspirationUrls" render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspiration URLs <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Links to example videos, separated by commas" {...field}
                      className="bg-background border-input" data-testid="input-campaign-urls" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pb-6">
            <Button type="button" variant="outline" onClick={() => setLocation('/campaigns')}
              data-testid="button-cancel-campaign">
              Cancel
            </Button>
            <Button type="submit" disabled={createCampaign.isPending}
              className="bg-primary text-black hover:bg-primary/90 font-bold"
              data-testid="button-submit-campaign">
              {createCampaign.isPending ? "Creating…" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
