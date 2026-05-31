import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { fsGetCampaigns, fsGetCreators } from "@/lib/firestore";

const BASE = import.meta.env.BASE_URL;

interface Msg { role: "user" | "assistant"; content: string }

function buildCtx(campaigns: any[], creators: any[]) {
  const active = campaigns.filter((c: any) => c.status === "active");
  const budget = campaigns.reduce((s: number, c: any) => s + (c.totalBudget ?? 0), 0);
  return `LIVE DATA: ${active.length} active campaigns, $${budget.toLocaleString()} total budget, ${creators.length} creators in roster. Active: ${active.slice(0, 2).map((c: any) => c.title).join(", ") || "none"}.`;
}

function MsgBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 text-sm", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-5 h-5 rounded-full bg-[#C6FF00]/20 border border-[#C6FF00]/30 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="h-2.5 w-2.5 text-[#C6FF00]" />
        </div>
      )}
      <div className={cn(
        "max-w-[82%] rounded-2xl px-3 py-2 leading-relaxed",
        isUser
          ? "bg-[#C6FF00] text-black font-medium rounded-br-sm"
          : "bg-white/[0.06] text-white/85 rounded-bl-sm"
      )}>
        {msg.content}
      </div>
    </div>
  );
}

export function FloatingAI() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [posReady, setPosReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [convId, setConvId] = useState<number | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  const isDragging = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, bx: 0, by: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const x = window.innerWidth - 72;
    const y = window.innerHeight - 80;
    setPos({ x, y });
    setPosReady(true);
  }, []);

  useEffect(() => {
    fsGetCampaigns().then(setCampaigns).catch(() => {});
    fsGetCreators().then(setCreators).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role: "assistant", content: "Hey! I'm your BrandOps AI — ask me anything about campaigns, creators, payouts, or strategy." }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, streamContent]);

  const getOrCreateConv = useCallback(async () => {
    if (convId) return convId;
    const r = await fetch(`${BASE}api/openai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Quick Chat" }),
    });
    const d = await r.json() as { id: number };
    setConvId(d.id);
    return d.id;
  }, [convId]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", content: text }]);
    setStreaming(true);
    setStreamContent("");

    try {
      const id = await getOrCreateConv();
      const ctx = buildCtx(campaigns, creators);
      abortRef.current = new AbortController();
      const resp = await fetch(`${BASE}api/openai/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, context: ctx }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok) throw new Error("Request failed");
      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as { content?: string; done?: boolean };
            if (j.content) { full += j.content; setStreamContent(full); }
          } catch {}
        }
      }
      setMsgs(m => [...m, { role: "assistant", content: full }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", content: "Something went wrong — please try again." }]);
    } finally {
      setStreaming(false);
      setStreamContent("");
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isDragging.current = false;
    dragStart.current = { px: e.clientX, py: e.clientY, bx: pos.x, by: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    if (!isDragging.current && Math.hypot(dx, dy) > 5) isDragging.current = true;
    if (!isDragging.current) return;
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 64, dragStart.current.bx + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 64, dragStart.current.by + dy)),
    });
  };

  const onPointerUp = () => {
    if (!isDragging.current) setOpen(o => !o);
    isDragging.current = false;
  };

  // ── Panel positioning ──────────────────────────────────────────────────────

  const panelW = 360;
  const panelH = 480;
  const btnSize = 56;
  const margin = 12;

  const panelLeft = pos.x + btnSize / 2 + panelW + margin > window.innerWidth
    ? pos.x - panelW - margin
    : pos.x + btnSize + margin;

  const panelTop = Math.max(margin, Math.min(
    window.innerHeight - panelH - margin,
    pos.y + btnSize / 2 - panelH / 2
  ));

  if (!posReady) return null;

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ position: "fixed", left: panelLeft, top: panelTop, width: panelW, height: panelH, zIndex: 9999 }}
            className="flex flex-col rounded-2xl border border-white/10 bg-[#111] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/8 bg-white/[0.03] shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#C6FF00]/15 border border-[#C6FF00]/25 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-[#C6FF00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-none">AI Assistant</p>
                <p className="text-[10px] text-white/35 mt-0.5">Context-aware · live campaign data</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setMsgs([]); setConvId(null); }}
                  className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
                  title="New chat"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <a
                  href={`${import.meta.env.BASE_URL}ai`.replace(/\/\//g, "/")}
                  className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
                  title="Open full assistant"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
              {msgs.map((m, i) => <MsgBubble key={i} msg={m} />)}
              {streaming && streamContent && (
                <MsgBubble msg={{ role: "assistant", content: streamContent }} />
              )}
              {streaming && !streamContent && (
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#C6FF00]/20 border border-[#C6FF00]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="h-2.5 w-2.5 text-[#C6FF00]" />
                  </div>
                  <div className="bg-white/[0.06] rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-white/8 px-3 py-3 bg-white/[0.02]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask anything…"
                  rows={1}
                  className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C6FF00]/40 transition-colors max-h-24 overflow-y-auto scrollbar-none"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || streaming}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    input.trim() && !streaming
                      ? "bg-[#C6FF00] text-black hover:bg-[#d4ff33]"
                      : "bg-white/5 text-white/25 cursor-not-allowed"
                  )}
                >
                  {streaming
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable trigger button */}
      <button
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 10000, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-transform select-none cursor-grab active:cursor-grabbing",
          open
            ? "bg-[#C6FF00] shadow-[0_0_30px_rgba(198,255,0,0.4)]"
            : "bg-[#111] border border-white/12 hover:border-[#C6FF00]/40 hover:shadow-[0_0_24px_rgba(198,255,0,0.2)]"
        )}
        aria-label="AI Assistant"
      >
        <Sparkles className={cn("h-5 w-5 transition-colors", open ? "text-black" : "text-[#C6FF00]")} />
      </button>
    </>
  );
}
