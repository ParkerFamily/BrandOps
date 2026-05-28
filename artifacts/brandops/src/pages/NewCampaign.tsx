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

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  totalBudget: z.coerce.number().min(100, { message: "Minimum budget is $100." }),
  payoutPerVideo: z.coerce.number().min(10, { message: "Minimum payout is $10." }),
  platform: z.enum(["tiktok", "instagram", "youtube"]),
  niche: z.string().min(2, { message: "Niche is required." }),
  deadline: z.string().min(1, { message: "Deadline is required." }),
  inspirationUrls: z.string().optional(),
});

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
      platform: "tiktok",
      niche: "",
      deadline: "",
      inspirationUrls: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createCampaign.mutate({
      data: {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: "Campaign created",
          description: "Your campaign has been successfully created as a draft.",
        });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setLocation(`/campaigns/${data.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create campaign. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-muted-foreground mt-1">Set up a new creator campaign to start receiving submissions.</p>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Fill out the basic information for your new campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Summer Skincare Launch" {...field} className="bg-background border-input" data-testid="input-campaign-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Brief</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you want the creators to produce..." 
                        className="min-h-[100px] bg-background border-input" 
                        {...field} 
                        data-testid="input-campaign-desc"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background border-input" data-testid="input-campaign-budget" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payoutPerVideo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout per Video ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-background border-input" data-testid="input-campaign-payout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-input" data-testid="select-campaign-platform">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator Niche</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Beauty, Tech, Fitness" {...field} className="bg-background border-input" data-testid="input-campaign-niche" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-background border-input" data-testid="input-campaign-deadline" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inspirationUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspiration URLs (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Links to example videos, separated by commas" {...field} className="bg-background border-input" data-testid="input-campaign-urls" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation('/campaigns')}
                  data-testid="button-cancel-campaign"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCampaign.isPending}
                  data-testid="button-submit-campaign"
                >
                  {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}