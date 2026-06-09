import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles, ArrowLeft, Loader2, CheckCircle2, RotateCcw,
  Save, Send, ChevronDown, Plus, Trash2, CreditCard, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fsCreateCampaign } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useStripeGate } from "@/hooks/use-stripe-gate";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

// ─── Quick-tap chips ────────────────────────────────────────────────────────

const CHIPS = [
  "TikTok ads", "Instagram Reels", "YouTube Shorts",
  "Product demo", "Testimonial", "Talking head", "Lifestyle b-roll",
  "App installs", "Drive sales", "Brand awareness",
  "Fast turnaround", "Paid ads", "Authentic feel",
];

const GEN_STEPS = [
  "Understanding your campaign goal…",
  "Writing creator brief…",
  "Crafting hook ideas…",
  "Building video concepts…",
  "Estimating budget & payout…",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Generated {
  title: string;
  summary: string;
  creatorBrief: string;
  deliverables: string;
  videoConceptIdeas: string[];
  hookIdeas: string[];
  ctaIdeas: string[];
  payoutStrategy: string;
  suggestedVideoCount: number;
  suggestedPayoutPerVideo: number;
  estimatedTotalCost: number;
  usageRights: string;
  suggestedDeadline: string;
  approvalCriteria: string[];
  creatorType: string;
  toneAndStyle: string;
  doList: string[];
  dontList: string[];
}

type Step = "prompt" | "generating" | "result";

// ─── Sub-components ─────────────────────────────────────────────────────────

function Accordion({
  label, children, defaultOpen = false,
}: {
  label: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const variants: Variants = {
    open: { height: "auto", opacity: 1 },
    closed: { height: 0, opacity: 0 },
  };
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-sm font-medium text-white">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-white/30 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <motion.div
        variants={variants}
        initial="closed"
        animate={open ? "open" : "closed"}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 border-t border-white/6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function EditableBlock({ value, onChange, rows = 4 }: {
  value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full mt-3 resize-none rounded-lg bg-white/4 border border-white/10 text-sm text-white/85 leading-relaxed px-3 py-2.5 focus:outline-none focus:border-[#C6FF00]/40 transition-all"
    />
  );
}

function AutoTextarea({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px"; }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => { onChange(e.target.value); if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px"; } }}
      className={cn("resize-none overflow-hidden leading-snug", className)}
    />
  );
}

function EditableList({ items, onChange, accent = "text-[#C6FF00]" }: {
  items: string[]; onChange: (items: string[]) => void; accent?: string;
}) {
  return (
    <div className="space-y-2 pt-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={cn("shrink-0 text-xs font-bold mt-2.5 w-4", accent)}>•</span>
          <AutoTextarea
            value={item}
            onChange={v => { const n = [...items]; n[i] = v; onChange(n); }}
            className="flex-1 bg-white/4 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white/85 focus:outline-none focus:border-[#C6FF00]/40 transition-colors w-full"
          />
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="shrink-0 mt-2 p-1 text-white/20 hover:text-red-400 transition-colors rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ""])}
        className="text-xs text-white/25 hover:text-white/50 transition-colors px-1 pt-1 flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: stripeLoading, ready: stripeReady, startSetup } = useStripeGate();
  const [settingUpStripe, setSettingUpStripe] = useState(false);

  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState("");
  const [videosNeeded, setVideosNeeded] = useState("");
  const [deadline, setDeadline] = useState("");
  const [genStep, setGenStep] = useState(0);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [saving, setSaving] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, []);

  function patch<K extends keyof Generated>(key: K, value: Generated[K]) {
    setGenerated(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function appendChip(chip: string) {
    setPrompt(p => p ? `${p.trimEnd()}, ${chip.toLowerCase()}` : chip.toLowerCase());
    textareaRef.current?.focus();
  }

  async function generate() {
    if (!prompt.trim()) return;
    setStep("generating");
    setGenStep(0);
    stepTimer.current = setInterval(() => {
      setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 1));
    }, 950);
    try {
      const r = await fetch(`${BASE}api/openai/campaign-builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          budget: budget ? Number(budget) : undefined,
          videosNeeded: videosNeeded ? Number(videosNeeded) : undefined,
          deadline: deadline || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      const data: Generated = await r.json();
      if (stepTimer.current) clearInterval(stepTimer.current);
      setGenStep(GEN_STEPS.length - 1);
      setTimeout(() => { setGenerated(data); setStep("result"); }, 300);
    } catch {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setStep("prompt");
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    }
  }

  function parseDeadline(raw: string): string {
    if (!raw) return new Date(Date.now() + 30 * 86400000).toISOString();
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) return direct.toISOString();
    const m = raw.match(/(\d+)\s*(day|week|month)/i);
    if (m) {
      const n = parseInt(m[1]);
      const unit = m[2].toLowerCase();
      const ms = unit === "week" ? n * 7 * 86400000 : unit === "month" ? n * 30 * 86400000 : n * 86400000;
      return new Date(Date.now() + ms).toISOString();
    }
    return new Date(Date.now() + 30 * 86400000).toISOString();
  }

  async function save(status: "draft" | "active") {
    if (!generated) return;
    setSaving(true);
    try {
      const id = await fsCreateCampaign({
        title: generated.title,
        description: generated.creatorBrief,
        platform: "tiktok",
        niche: generated.creatorType?.slice(0, 50) || "UGC",
        status: status === "active" ? "active" : "draft",
        totalBudget: generated.estimatedTotalCost || Number(budget) || 1000,
        payoutPerVideo: generated.suggestedPayoutPerVideo || 100,
        videosNeeded: generated.suggestedVideoCount || 1,
        creatorType: generated.creatorType || "",
        tone: generated.toneAndStyle || "",
        deadline: parseDeadline(generated.suggestedDeadline || deadline),
        brandUid: user?.uid ?? "",
        ownerFirebaseUid: user?.uid ?? "",
        aiData: {
          hookIdeas: generated.hookIdeas,
          videoConceptIdeas: generated.videoConceptIdeas,
          ctaIdeas: generated.ctaIdeas,
          creatorBrief: generated.creatorBrief,
          approvalCriteria: generated.approvalCriteria,
          deliverables: generated.deliverables,
          usageRights: generated.usageRights,
          payoutStrategy: generated.payoutStrategy,
          doList: generated.doList,
          dontList: generated.dontList,
          toneAndStyle: generated.toneAndStyle,
        },
      });
      toast({
        title: status === "active" ? "Campaign published!" : "Draft saved",
        description: generated.title,
      });
      setLocation(`/campaigns/${id}`);
    } catch {
      toast({ title: "Failed to save campaign", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const handleSetupStripe = async () => {
    setSettingUpStripe(true);
    try { await startSetup(); } catch { setSettingUpStripe(false); }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Back */}
      <button
        onClick={() => step === "result" ? setStep("prompt") : setLocation("/campaigns")}
        className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs mb-6 mt-1 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {step === "result" ? "Edit prompt" : "Back to Campaigns"}
      </button>

      {/* ── Stripe gate for brands ── */}
      {(stripeLoading || stripeReady === false) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-card-border bg-card p-8 flex flex-col items-center text-center gap-4"
        >
          {stripeLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Add a payment method first</h2>
                <p className="text-sm text-white/50 mt-1.5 max-w-sm leading-relaxed">
                  Campaigns require a payment method on file so creators get paid automatically when you approve their videos.
                </p>
              </div>
              <button
                onClick={handleSetupStripe}
                disabled={settingUpStripe}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all",
                  "bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(198,255,0,0.2)]",
                  settingUpStripe && "opacity-60 cursor-not-allowed"
                )}
              >
                {settingUpStripe
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>
                  : <><CreditCard className="h-4 w-4" /> Add Payment Method <ArrowRight className="h-3.5 w-3.5" /></>
                }
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Main flow — only shown when Stripe is ready */}
      {!stripeLoading && stripeReady && <AnimatePresence mode="wait">

        {/* ── STEP 1: Prompt ─────────────────────────────────────────────── */}
        {step === "prompt" && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">New Campaign</h1>
              <p className="text-white/40 text-sm mt-1">
                Describe what you need — AI writes the complete brief in seconds.
              </p>
            </div>

            {/* Main prompt card — textarea + inline budget/deadline footer */}
            <div className="bg-white/[0.04] border border-white/[0.10] rounded-2xl overflow-hidden focus-within:border-[#C6FF00]/35 transition-colors">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim()) generate(); }}
                placeholder={"Example: I'm launching a skincare serum and need 15 UGC videos for TikTok. Budget around $3,000. I want authentic product demos and strong hooks for paid ads."}
                rows={5}
                className="w-full bg-transparent px-5 pt-4 pb-3 text-sm text-white placeholder-white/25 outline-none resize-none leading-relaxed"
              />
              {/* Inline meta row */}
              <div className="flex items-center gap-0 border-t border-white/[0.07] divide-x divide-white/[0.07]">
                <div className="flex items-center gap-1.5 px-4 py-2.5 flex-1">
                  <span className="text-white/30 text-sm font-medium select-none">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="Budget"
                    className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 flex-1">
                  <input
                    type="number"
                    value={videosNeeded}
                    onChange={e => setVideosNeeded(e.target.value)}
                    placeholder="Videos needed"
                    className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 flex-1">
                  <input
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    placeholder="Deadline (e.g. 14 days)"
                    className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none"
                  />
                </div>
                <div className="px-4 py-2.5 shrink-0">
                  <span className="text-[10px] text-white/15 select-none">⌘↵</span>
                </div>
              </div>
            </div>

            {/* Quick chips */}
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2.5">Quick add</p>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => appendChip(chip)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] text-white/50 hover:text-white hover:border-[#C6FF00]/35 hover:bg-[#C6FF00]/8 transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={generate}
              disabled={!prompt.trim()}
              className="w-full py-4 rounded-2xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Generate Campaign
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Generating ─────────────────────────────────────────── */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#C6FF00]/10 border border-[#C6FF00]/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[#C6FF00] animate-spin" />
            </div>
            <div className="space-y-2.5 w-full max-w-xs">
              {GEN_STEPS.map((s, i) => (
                <div key={s} className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-300",
                  i < genStep ? "text-[#C6FF00]/50" : i === genStep ? "text-white font-medium" : "text-white/20"
                )}>
                  {i < genStep
                    ? <CheckCircle2 className="h-4 w-4 text-[#C6FF00] shrink-0" />
                    : i === genStep
                    ? <Loader2 className="h-4 w-4 text-[#C6FF00] animate-spin shrink-0" />
                    : <div className="h-4 w-4 rounded-full border border-white/15 shrink-0" />}
                  {s}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Result ─────────────────────────────────────────────── */}
        {step === "result" && generated && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#C6FF00]/8 border border-[#C6FF00]/15">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#C6FF00]" />
                <span className="text-sm font-semibold text-[#C6FF00]">Campaign ready — edit anything below</span>
              </div>
              <button
                onClick={() => setStep("prompt")}
                className="text-xs text-white/35 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Regenerate
              </button>
            </div>

            {/* Title */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Campaign Title</p>
              <input
                value={generated.title}
                onChange={e => patch("title", e.target.value)}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-base font-semibold text-white focus:outline-none focus:border-[#C6FF00]/40 transition-colors"
              />
            </div>

            {/* Stats — editable */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Budget */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-center group focus-within:border-[#C6FF00]/40 transition-colors">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-xl font-black text-[#C6FF00]">$</span>
                  <input
                    type="number"
                    min={0}
                    value={generated.estimatedTotalCost}
                    onChange={e => {
                      const budget = Math.max(0, Number(e.target.value) || 0);
                      const videos = generated.suggestedVideoCount || 1;
                      patch("estimatedTotalCost", budget);
                      patch("suggestedPayoutPerVideo", Math.round(budget / videos));
                    }}
                    className="w-full bg-transparent text-xl font-black tabular-nums text-[#C6FF00] text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                  />
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Budget</p>
              </div>

              {/* Videos */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-center group focus-within:border-[#C6FF00]/40 transition-colors">
                <input
                  type="number"
                  min={1}
                  value={generated.suggestedVideoCount}
                  onChange={e => {
                    const videos = Math.max(1, Number(e.target.value) || 1);
                    const budget = generated.estimatedTotalCost || 0;
                    patch("suggestedVideoCount", videos);
                    patch("suggestedPayoutPerVideo", Math.round(budget / videos));
                  }}
                  className="w-full bg-transparent text-xl font-black tabular-nums text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                />
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Videos</p>
              </div>

              {/* Per Video */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-center group focus-within:border-[#C6FF00]/40 transition-colors">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-xl font-black text-white">$</span>
                  <input
                    type="number"
                    min={0}
                    value={generated.suggestedPayoutPerVideo}
                    onChange={e => {
                      const perVideo = Math.max(0, Number(e.target.value) || 0);
                      const videos = generated.suggestedVideoCount || 1;
                      patch("suggestedPayoutPerVideo", perVideo);
                      patch("estimatedTotalCost", perVideo * videos);
                    }}
                    className="w-full bg-transparent text-xl font-black tabular-nums text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                  />
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Per Video</p>
              </div>

              {/* Deadline */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-center group focus-within:border-[#C6FF00]/40 transition-colors">
                <input
                  value={generated.suggestedDeadline}
                  onChange={e => patch("suggestedDeadline", e.target.value)}
                  className="w-full bg-transparent text-sm font-bold tabular-nums text-white text-center focus:outline-none min-w-0 leading-tight"
                  placeholder="e.g. 14 days"
                />
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Deadline</p>
              </div>
            </div>

            {/* Editable sections */}
            <Accordion label="📝 Creator Brief" defaultOpen>
              <EditableBlock value={generated.creatorBrief} onChange={v => patch("creatorBrief", v)} rows={6} />
            </Accordion>

            <Accordion label={`💡 Hook Ideas (${generated.hookIdeas.length})`} defaultOpen>
              <EditableList items={generated.hookIdeas} onChange={v => patch("hookIdeas", v)} accent="text-[#C6FF00]" />
            </Accordion>

            <Accordion label={`🎬 Video Concepts (${generated.videoConceptIdeas.length})`}>
              <EditableList items={generated.videoConceptIdeas} onChange={v => patch("videoConceptIdeas", v)} accent="text-blue-400" />
            </Accordion>

            <Accordion label={`📣 CTA Ideas (${generated.ctaIdeas.length})`}>
              <EditableList items={generated.ctaIdeas} onChange={v => patch("ctaIdeas", v)} accent="text-yellow-400" />
            </Accordion>

            <Accordion label="🎯 Deliverables">
              <EditableBlock value={generated.deliverables} onChange={v => patch("deliverables", v)} rows={2} />
            </Accordion>

            <Accordion label="✅ Do's & Don'ts">
              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide mb-1">Do</p>
                  <EditableList items={generated.doList} onChange={v => patch("doList", v)} accent="text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide mb-1">Don't</p>
                  <EditableList items={generated.dontList} onChange={v => patch("dontList", v)} accent="text-red-400" />
                </div>
              </div>
            </Accordion>

            <Accordion label="⚖️ Usage Rights & Payout">
              <EditableBlock value={generated.usageRights} onChange={v => patch("usageRights", v)} rows={2} />
              <EditableBlock value={generated.payoutStrategy} onChange={v => patch("payoutStrategy", v)} rows={2} />
            </Accordion>

            {/* Sticky footer */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
              <div className="flex gap-2">
                <button
                  onClick={() => save("draft")}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl border border-white/12 text-white/60 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                <button
                  onClick={() => save("active")}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {saving ? "Publishing…" : "Publish Campaign"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>}
    </div>
  );
}
