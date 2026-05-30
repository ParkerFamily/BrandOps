import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fsGetCampaigns, fsGetCreators, type FsCampaign, type FsCreator } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles, User,
  TrendingUp, Megaphone, Users, DollarSign, Zap, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL;

interface Conversation { id: number; title: string; createdAt: string }
interface Message { id: number; conversationId: number; role: "user" | "assistant"; content: string; createdAt: string }
interface ConversationWithMessages extends Conversation { messages: Message[] }

function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["openai-conversations"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/openai/conversations`);
      if (!r.ok) throw new Error("Failed to fetch conversations");
      return r.json();
    },
  });
}

function useConversation(id: number | null) {
  return useQuery<ConversationWithMessages>({
    queryKey: ["openai-conversation", id],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/openai/conversations/${id}`);
      if (!r.ok) throw new Error("Failed to fetch conversation");
      return r.json();
    },
    enabled: id !== null,
  });
}

function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const r = await fetch(`${BASE}api/openai/conversations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      if (!r.ok) throw new Error("Failed to create conversation");
      return r.json() as Promise<Conversation>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["openai-conversations"] }),
  });
}

function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}api/openai/conversations/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["openai-conversations"] }),
  });
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-bold text-sm mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-sm mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# ")) return <p key={i} className="font-bold mt-2">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) return (
          <div key={i} className="flex gap-2 text-sm">
            <span className="text-primary mt-0.5">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        if (line.startsWith("```")) return null;
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>)}
          </p>
        );
      })}
    </div>
  );
}

import { getOnboarded } from "@/lib/onboarding";
const PROFILE_KEY = "brandops_profile";

const getOnboarding = getOnboarded;
function getProfile() {
  try { const r = localStorage.getItem(PROFILE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

function buildContext(stats: any, campaigns: any[], creators: any[]): string {
  const activeCampaigns = campaigns?.filter((c) => c.status === "active") ?? [];
  const topCreator = creators?.sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))[0];
  const totalBudget = campaigns?.reduce((s, c) => s + (c.totalBudget ?? 0), 0) ?? 0;

  const onboarding = getOnboarding();
  const profile = getProfile();

  const profileSection = onboarding ? `
USER PROFILE (use this to personalize every response):
- Account type: ${onboarding.accountType || "Brand"}
- Primary goal / role: ${onboarding.goal || "not specified"}
- Budget / rate: ${onboarding.budget || "not specified"}
- Niches: ${onboarding.niches?.join(", ") || "not specified"}
- Video channels / services: ${onboarding.platforms?.join(", ") || "not specified"}
- Team size / setup: ${onboarding.teamSize || "not specified"}${onboarding.turnaround ? `\n- Turnaround speed: ${onboarding.turnaround}` : ""}${profile?.brandName ? `\n- Workspace name: ${profile.brandName}` : ""}${profile?.website ? `\n- Website: ${profile.website}` : ""}
`.trim() : "";

  const liveSection = `
LIVE PLATFORM DATA (reference actual numbers in your answers):
- Active campaigns: ${activeCampaigns.length} (${campaigns?.length ?? 0} total)
- Total campaign budget: $${totalBudget.toLocaleString()}
- Creators in roster: ${creators?.length ?? 0}
- Pending submissions: ${stats?.pendingSubmissions ?? 0}
- Pending payouts: $${stats?.pendingPayouts ?? 0}
- Top creator by engagement: ${topCreator ? `${topCreator.name} (${topCreator.engagementRate}% eng, ${topCreator.followerCount?.toLocaleString()} followers)` : "none"}
- Active campaign titles: ${activeCampaigns.slice(0, 3).map((c: any) => c.title).join(", ") || "none"}
`.trim();

  return [profileSection, liveSection].filter(Boolean).join("\n\n");
}

function ContextBadge({ campaigns, creators }: { campaigns: any[]; creators: any[] }) {
  if (!campaigns?.length && !creators?.length) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-primary/5 text-xs text-muted-foreground">
      <Zap className="h-3 w-3 text-primary" />
      <span className="text-primary font-medium">Context-aware</span>
      <span>·</span>
      <span>{campaigns?.length ?? 0} campaigns</span>
      <span>·</span>
      <span>{creators?.length ?? 0} creators</span>
      <span>·</span>
      <span>Real-time data injected</span>
    </div>
  );
}

export default function AIAssistant() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: convList, isLoading: listLoading } = useConversations();
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

  const [campaigns, setCampaigns] = useState<FsCampaign[]>([]);
  const [creators, setCreators] = useState<FsCreator[]>([]);

  useEffect(() => {
    fsGetCampaigns().then(setCampaigns).catch(() => {});
    fsGetCreators().then(setCreators).catch(() => {});
  }, []);

  const stats = {
    pendingSubmissions: 0,
    pendingPayouts: 0,
    totalPayouts: 0,
  };

  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: activeConv, isLoading: convLoading } = useConversation(activeId);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [activeConv?.messages, streamingContent, scrollToBottom]);

  const handleNewChat = async () => {
    const title = `Chat ${format(new Date(), "MMM d, h:mm a")}`;
    const conv = await createConv.mutateAsync(title);
    setActiveId(conv.id);
  };

  const handleSend = async () => {
    if (!input.trim() || streaming || !activeId) return;
    const text = input.trim();
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    abortRef.current = new AbortController();
    const context = buildContext(stats as any, campaigns ?? [], creators ?? []);

    try {
      const resp = await fetch(`${BASE}api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, context }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));
          if (json.done) {
            setStreaming(false);
            setStreamingContent("");
            qc.invalidateQueries({ queryKey: ["openai-conversation", activeId] });
            break;
          }
          if (json.content) setStreamingContent((prev) => prev + json.content);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") toast({ title: "Error", description: err.message, variant: "destructive" });
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const getContextSuggestions = () => {
    const suggestions: { icon: React.ElementType; label: string; prompt: string }[] = [];

    const activeCampaigns = campaigns?.filter((c) => c.status === "active") ?? [];
    const topCreator = creators?.sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))[0];

    if (activeCampaigns.length > 0) {
      suggestions.push({
        icon: Megaphone,
        label: "Scale top campaign",
        prompt: `I have ${activeCampaigns.length} active campaigns. Which one should I scale next and how?`,
      });
    }
    if (topCreator) {
      suggestions.push({
        icon: Users,
        label: "Best ROI creator",
        prompt: `My top creator is ${topCreator.name} with ${topCreator.engagementRate}% engagement. Who else in my roster should I prioritize?`,
      });
    }
    if (stats?.totalPayouts) {
      suggestions.push({
        icon: DollarSign,
        label: "Optimize payouts",
        prompt: `I have $${stats.totalPayouts} in total payouts processed. What payout strategy should I use to retain top creators?`,
      });
    }
    if (suggestions.length < 4) {
      suggestions.push({ icon: TrendingUp, label: "ROI strategy", prompt: "What's the most effective strategy to improve UGC campaign ROI this quarter?" });
      suggestions.push({ icon: Sparkles, label: "Campaign brief", prompt: "Generate a high-converting campaign brief for a wellness brand targeting Gen Z." });
    }
    return suggestions.slice(0, 4);
  };

  const suggestions = getContextSuggestions();

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-0 -mx-6 -mt-6">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-9" onClick={handleNewChat} disabled={createConv.isPending}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {listLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)
            ) : convList?.length ? (
              convList.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center gap-2",
                    activeId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
          </div>
        </ScrollArea>

        {/* Context status */}
        <div className="p-3 border-t border-border space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold px-1">Live Context</div>
          {[
            { icon: Megaphone, label: "Campaigns", value: campaigns?.length ?? "—" },
            { icon: Users, label: "Creators", value: creators?.length ?? "—" },
            { icon: DollarSign, label: "Total Payouts", value: stats?.totalPayouts ? `$${stats.totalPayouts}` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/2 text-xs">
              <Icon className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground flex-1">{label}</span>
              <span className="text-foreground font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto relative">
                <Sparkles className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-md" />
              </div>
              <h2 className="text-2xl font-bold">BrandOps AI Copilot</h2>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                Your intelligent business assistant with live access to your campaigns, creators, submissions, and analytics. Ask anything.
              </p>

              {(campaigns?.length || creators?.length) ? (
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs text-primary">
                  <Zap className="h-3 w-3" />
                  Context loaded: {campaigns?.length ?? 0} campaigns · {creators?.length ?? 0} creators
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {suggestions.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={async () => {
                    const title = label;
                    const conv = await createConv.mutateAsync(title);
                    setActiveId(conv.id);
                    setInput(prompt);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{prompt}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>

            <Button onClick={handleNewChat} className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={createConv.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Start a conversation
            </Button>
          </div>
        ) : (
          <>
            <ContextBadge campaigns={campaigns ?? []} creators={creators ?? []} />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {convLoading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-end" : "")}>
                      <Skeleton className="h-16 w-64 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {activeConv?.messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3 max-w-4xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.role === "user" ? "bg-primary/20 text-primary" : "bg-muted border border-border")}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className={cn("rounded-2xl px-4 py-3 max-w-2xl", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60 border border-border text-foreground")}>
                        {msg.role === "assistant" ? <MarkdownContent content={msg.content} /> : <p className="text-sm">{msg.content}</p>}
                        <p className={cn("text-xs mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}

                  {streaming && streamingContent && (
                    <div className="flex gap-3 max-w-4xl">
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="bg-muted/60 border border-border rounded-2xl px-4 py-3 max-w-2xl">
                        <MarkdownContent content={streamingContent} />
                        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
                      </div>
                    </div>
                  )}
                  {streaming && !streamingContent && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="bg-muted/60 border border-border rounded-2xl px-4 py-3">
                        <div className="flex gap-1 items-center h-4">
                          {[0, 150, 300].map((d) => (
                            <div key={d} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/30">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3 items-end bg-muted/50 border border-border rounded-2xl px-4 py-3 focus-within:border-primary/40 transition-colors">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your campaigns, creators, ROI, or strategy…"
                    className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-40 p-0 text-sm"
                    rows={1}
                    disabled={streaming}
                  />
                  <Button size="sm" onClick={handleSend} disabled={!input.trim() || streaming} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shrink-0 h-8 w-8 p-0">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">Enter</kbd> to send ·{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">Shift+Enter</kbd> for new line
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-card-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this conversation and all its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteConv.mutateAsync(deleteTarget);
                  if (activeId === deleteTarget) setActiveId(null);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
