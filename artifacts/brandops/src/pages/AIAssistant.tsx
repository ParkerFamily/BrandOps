import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles, User
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL;

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

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
      const r = await fetch(`${BASE}api/openai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
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
  // Simple markdown-like rendering for bold, code, bullets
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-bold text-sm mt-2">{line.slice(4)}</p>;
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-sm mt-2">{line.slice(3)}</p>;
        if (line.startsWith("# ")) return <p key={i} className="font-bold mt-2">{line.slice(2)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-primary mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.startsWith("```")) return null;
        if (!line.trim()) return <div key={i} className="h-1" />;
        // inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function AIAssistant() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: convList, isLoading: listLoading } = useConversations();
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

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
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, streamingContent, scrollToBottom]);

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

    try {
      const resp = await fetch(`${BASE}api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

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
          if (json.content) {
            setStreamingContent((prev) => prev + json.content);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTIONS = [
    "How should I structure a UGC campaign for a beauty brand?",
    "What metrics matter most for evaluating creator submissions?",
    "Draft a creator brief for a product launch campaign",
    "How do I calculate ROI for a UGC campaign?",
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-0 -mx-6 -mt-6">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-4 border-b border-border">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            onClick={handleNewChat}
            disabled={createConv.isPending}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {listLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : convList?.length ? (
              convList.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center gap-2",
                    activeId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
              <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">BrandOps AI</h2>
              <p className="text-muted-foreground max-w-sm">
                Your campaign strategy assistant. Ask anything about UGC campaigns, creator management, or content performance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    const title = s.length > 40 ? s.slice(0, 40) + "…" : s;
                    const conv = await createConv.mutateAsync(title);
                    setActiveId(conv.id);
                    setInput(s);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-colors text-sm text-muted-foreground group"
                >
                  <span className="group-hover:text-foreground transition-colors">{s}</span>
                </button>
              ))}
            </div>

            <Button
              onClick={handleNewChat}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={createConv.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Start a conversation
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
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
                    <div
                      key={msg.id}
                      className={cn("flex gap-3 max-w-4xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        msg.role === "user"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted border border-border"
                      )}>
                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className={cn(
                        "rounded-2xl px-4 py-3 max-w-2xl",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 border border-border text-foreground"
                      )}>
                        {msg.role === "assistant" ? (
                          <MarkdownContent content={msg.content} />
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        <p className={cn(
                          "text-xs mt-1",
                          msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Streaming message */}
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
                          <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
                    placeholder="Ask anything about your campaigns, creators, or strategy…"
                    className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-40 p-0 text-sm"
                    rows={1}
                    disabled={streaming}
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!input.trim() || streaming}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shrink-0 h-8 w-8 p-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">Shift+Enter</kbd> for new line
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-card-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the conversation and all its messages.
            </AlertDialogDescription>
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
