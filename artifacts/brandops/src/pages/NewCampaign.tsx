import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Copy, Check, RefreshCw, Loader2,
  Link2, FileText, ArrowLeft, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fsCreateCampaign } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL;

// ─── Constants ──────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "downloads", label: "Drive App Downloads" },
  { id: "sales", label: "Generate Sales" },
  { id: "awareness", label: "Brand Awareness" },
  { id: "traffic", label: "Website Traffic" },
  { id: "signups", label: "Email Signups" },
  { id: "other", label: "Other" },
];

const DELIVERABLE_TYPES = [
  "Talking Head", "Product Demo", "Testimonial",
  "Lifestyle", "Skit", "Voiceover", "B-Roll",
];

const LENGTHS = ["15s", "30s", "60s", "Custom"];

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

const TONES = ["Authentic", "Energetic", "Educational", "Funny", "Casual", "Professional"];

const NICHES_LIST = [
  "Beauty", "Fitness", "Business", "Tech", "Lifestyle",
  "Gaming", "Entertainment", "Food", "Fashion", "Travel", "Finance", "Health",
];

const GENDERS = ["Any", "Male", "Female", "Non-binary"];
const FOLLOWER_RANGES = ["Any", "Under 10K", "10K–50K", "50K–200K", "200K+"];

const USAGE_OPTIONS = [
  { id: "organic", label: "Organic Only" },
  { id: "organic_paid", label: "Organic + Paid Ads" },
  { id: "whitelisting", label: "Whitelisting" },
  { id: "full_buyout", label: "Full Buyout" },
];

// ─── UI Primitives ──────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, error }: {
  title: string; subtitle?: string; children: React.ReactNode; error?: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">{children}</p>;
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? "bg-[#C6FF00] text-black"
          : "bg-white/5 border border-white/10 text-white/55 hover:text-white hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function CheckboxChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
        checked
          ? "bg-[#C6FF00]/10 border-[#C6FF00]/30 text-[#C6FF00]"
          : "bg-white/3 border-white/8 text-white/50 hover:text-white/80 hover:border-white/15"
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 transition-all ${
        checked ? "bg-[#C6FF00] border-[#C6FF00]" : "border-white/20"
      }`}>
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function StyledInput({ value, onChange, placeholder, prefix, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; type?: string;
}) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 text-sm pointer-events-none">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/4 border border-white/10 rounded-xl py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#C6FF00]/40 focus:bg-white/[0.06] ${prefix ? "pl-8 pr-4" : "px-4"}`}
      />
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface AiCampaign {
  title?: string;
  creatorBrief?: string;
  hookIdeas?: string[];
  videoConceptIdeas?: string[];
  ctaIdeas?: string[];
  approvalCriteria?: string[];
  deliverables?: string;
  usageRights?: string;
  payoutStrategy?: string;
  doList?: string[];
  dontList?: string[];
  toneAndStyle?: string;
  suggestedVideoCount?: number;
  suggestedPayoutPerVideo?: number;
}

interface GeneratedScript { label: string; content: string; }

// ─── Component ──────────────────────────────────────────────────────────────────

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [goal, setGoal] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [deliverableLength, setDeliverableLength] = useState("30s");
  const [platform, setPlatform] = useState("tiktok");
  const [tone, setTone] = useState("Authentic");
  const [totalBudget, setTotalBudget] = useState("5000");
  const [avgPayout, setAvgPayout] = useState("200");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("35");
  const [gender, setGender] = useState("Any");
  const [creatorLocation, setCreatorLocation] = useState("");
  const [followerRange, setFollowerRange] = useState("Any");
  const [niches, setNiches] = useState<string[]>([]);
  const [usageRights, setUsageRights] = useState("organic");
  const [deadline, setDeadline] = useState("");
  const [inspirationLinks, setInspirationLinks] = useState("");
  const [styleNotes, setStyleNotes] = useState("");

  // AI state
  const [hooks, setHooks] = useState<string[]>([]);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [activeScript, setActiveScript] = useState(0);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [copiedHook, setCopiedHook] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Computed
  const budget = parseInt(totalBudget) || 0;
  const payout = parseInt(avgPayout) || 200;
  const estimatedCreators = payout > 0 ? Math.floor(budget / payout) : 0;

  const toggleDeliverable = (d: string) =>
    setDeliverables(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const toggleNiche = (n: string) =>
    setNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);

  const copyHook = useCallback(async (hook: string, idx: number) => {
    await navigator.clipboard.writeText(hook);
    setCopiedHook(idx);
    setTimeout(() => setCopiedHook(null), 1500);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!goal) e.goal = "Select a campaign goal";
    if (!productDescription.trim()) e.product = "Describe what you're promoting";
    if (deliverables.length === 0) e.deliverables = "Select at least one deliverable type";
    if (!totalBudget || budget < 100) e.budget = "Minimum budget is $100";
    if (!deadline) e.deadline = "Set a submission deadline";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateHooks = async () => {
    if (!productDescription.trim()) {
      toast({ title: "Add a product description first", variant: "destructive" });
      return;
    }
    setGeneratingHooks(true);
    try {
      const res = await fetch(`${BASE}api/openai/campaign-hooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, productDescription, deliverables, tone, platform }),
      });
      const data = await res.json();
      setHooks(data.hooks ?? []);
      setScripts(data.scripts ?? []);
      setActiveScript(0);
    } catch {
      toast({ title: "Failed to generate hooks", variant: "destructive" });
    } finally {
      setGeneratingHooks(false);
    }
  };

  const buildCampaign = async () => {
    if (!validate()) return;
    setBuilding(true);
    try {
      const res = await fetch(`${BASE}api/openai/campaign-builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          productDescription,
          deliverables,
          deliverableLength,
          platform,
          tone,
          totalBudget: budget,
          avgPayout: payout,
          creatorRequirements: {
            ageRange: `${ageMin}–${ageMax}`,
            gender,
            location: creatorLocation,
            followerRange,
          },
          niches,
          usageRights,
          deadline,
          inspirationLinks,
          styleNotes,
          hooks,
          scripts,
        }),
      });
      const ai: AiCampaign = await res.json();

      const usageLabel = USAGE_OPTIONS.find(u => u.id === usageRights)?.label ?? usageRights;
      const goalLabel = GOALS.find(g => g.id === goal)?.label ?? goal;

      const id = await fsCreateCampaign({
        title: ai.title ?? `${goalLabel} Campaign`,
        description: ai.creatorBrief ?? productDescription,
        platform,
        niche: niches.join(", ") || "General",
        status: "draft",
        totalBudget: budget,
        payoutPerVideo: ai.suggestedPayoutPerVideo ?? payout,
        videosNeeded: ai.suggestedVideoCount ?? estimatedCreators,
        creatorType: `${gender !== "Any" ? gender + ", " : ""}${ageMin}–${ageMax}${creatorLocation ? ", " + creatorLocation : ""}`,
        tone,
        videoStyle: deliverables[0] ?? "",
        deadline: new Date(deadline).toISOString(),
        inspirationUrls: inspirationLinks,
        brandUid: user?.uid ?? "",
        ownerFirebaseUid: user?.uid ?? "",
        aiData: {
          hookIdeas: hooks.length ? hooks : (ai.hookIdeas ?? []),
          videoConceptIdeas: ai.videoConceptIdeas ?? [],
          ctaIdeas: ai.ctaIdeas ?? [],
          creatorBrief: ai.creatorBrief ?? "",
          approvalCriteria: ai.approvalCriteria ?? [],
          deliverables: [
            deliverables.join(", "),
            deliverableLength,
          ].filter(Boolean).join(" · "),
          usageRights: usageLabel,
          payoutStrategy: ai.payoutStrategy ?? "",
          doList: ai.doList ?? [],
          dontList: ai.dontList ?? [],
          toneAndStyle: ai.toneAndStyle ?? "",
        },
      });

      toast({ title: "Campaign created!", description: "Your AI-powered brief is ready for creators." });
      setLocation(`/campaigns/${id}`);
    } catch {
      toast({ title: "Failed to build campaign", description: "Please try again.", variant: "destructive" });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pb-16 space-y-4"
    >
      {/* Header */}
      <div className="mb-2">
        <button
          onClick={() => setLocation("/campaigns")}
          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs mb-5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
        </button>
        <h1 className="text-2xl font-black tracking-tight text-white">New Campaign</h1>
        <p className="text-white/40 text-sm mt-1">
          Fill in the details — BrandOps AI turns them into a complete creator brief.
        </p>
      </div>

      {/* ── Goal ─────────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Campaign Goal"
        subtitle="What do you want creators to help you achieve?"
        error={errors.goal}
      >
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setGoal(g.id); setErrors(e => ({ ...e, goal: "" })); }}
              className={`py-3 px-3 rounded-xl text-xs font-semibold text-left transition-all border ${
                goal === g.id
                  ? "bg-[#C6FF00]/10 border-[#C6FF00]/40 text-[#C6FF00]"
                  : "bg-white/3 border-white/8 text-white/50 hover:text-white/80 hover:border-white/15"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Product ──────────────────────────────────────────────────────────── */}
      <SectionCard
        title="What Are You Promoting?"
        subtitle="Give creators context about your product, brand, or service."
        error={errors.product}
      >
        <textarea
          value={productDescription}
          onChange={e => { setProductDescription(e.target.value); setErrors(prev => ({ ...prev, product: "" })); }}
          placeholder={`Example:\n"BrandOps helps brands hire UGC creators and pay for approved videos — no influencer fees, just content that converts."`}
          rows={3}
          className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#C6FF00]/40 focus:bg-white/[0.06] resize-none"
        />
      </SectionCard>

      {/* ── Deliverables ─────────────────────────────────────────────────────── */}
      <SectionCard
        title="Creator Deliverables"
        subtitle="What type of content do you need creators to produce?"
        error={errors.deliverables}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DELIVERABLE_TYPES.map(d => (
            <CheckboxChip
              key={d}
              label={d}
              checked={deliverables.includes(d)}
              onChange={() => { toggleDeliverable(d); setErrors(prev => ({ ...prev, deliverables: "" })); }}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5 pt-1">
          <div>
            <FieldLabel>Video Length</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {LENGTHS.map(l => (
                <Pill key={l} label={l} active={deliverableLength === l} onClick={() => setDeliverableLength(l)} />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Platform</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <Pill key={p.id} label={p.label} active={platform === p.id} onClick={() => setPlatform(p.id)} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Tone / Vibe</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            {TONES.map(t => (
              <Pill key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Budget ───────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Budget"
        subtitle="Creators are only paid after you approve their submitted video."
        error={errors.budget}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Total Campaign Budget</FieldLabel>
            <StyledInput
              value={totalBudget}
              onChange={v => { setTotalBudget(v); setErrors(prev => ({ ...prev, budget: "" })); }}
              prefix="$"
              type="number"
              placeholder="5000"
            />
          </div>
          <div>
            <FieldLabel>Avg Creator Payout</FieldLabel>
            <StyledInput
              value={avgPayout}
              onChange={setAvgPayout}
              prefix="$"
              type="number"
              placeholder="200"
            />
          </div>
        </div>

        {budget > 0 && (
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 grid grid-cols-3 divide-x divide-white/8 mt-1">
            <div className="text-center pr-4">
              <p className="text-2xl font-black text-[#C6FF00] tabular-nums">{estimatedCreators}</p>
              <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Est. Creators</p>
            </div>
            <div className="text-center px-4">
              <p className="text-2xl font-black text-white tabular-nums">{estimatedCreators}</p>
              <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Est. Videos</p>
            </div>
            <div className="text-center pl-4">
              <p className="text-2xl font-black text-white tabular-nums">${payout.toLocaleString()}</p>
              <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Per Creator</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Creator Requirements ─────────────────────────────────────────────── */}
      <SectionCard title="Creator Requirements" subtitle="BrandOps will match creators who fit this profile.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Age Range</FieldLabel>
            <div className="flex items-center gap-2">
              <StyledInput value={ageMin} onChange={setAgeMin} type="number" placeholder="18" />
              <span className="text-white/25 text-sm flex-shrink-0">to</span>
              <StyledInput value={ageMax} onChange={setAgeMax} type="number" placeholder="35" />
            </div>
          </div>
          <div>
            <FieldLabel>Location</FieldLabel>
            <StyledInput value={creatorLocation} onChange={setCreatorLocation} placeholder="e.g. United States, UK" />
          </div>
        </div>

        <div>
          <FieldLabel>Gender</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            {GENDERS.map(g => (
              <Pill key={g} label={g} active={gender === g} onClick={() => setGender(g)} />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Follower Range</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            {FOLLOWER_RANGES.map(f => (
              <Pill key={f} label={f} active={followerRange === f} onClick={() => setFollowerRange(f)} />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Niches <span className="text-white/20 normal-case font-normal tracking-normal ml-1">— select all that apply</span></FieldLabel>
          <div className="flex flex-wrap gap-2">
            {NICHES_LIST.map(n => (
              <CheckboxChip key={n} label={n} checked={niches.includes(n)} onChange={() => toggleNiche(n)} />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Usage Rights ─────────────────────────────────────────────────────── */}
      <SectionCard title="Usage Rights">
        <div className="grid grid-cols-2 gap-2">
          {USAGE_OPTIONS.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUsageRights(u.id)}
              className={`py-3 px-4 rounded-xl text-xs font-semibold transition-all border ${
                usageRights === u.id
                  ? "bg-[#C6FF00]/10 border-[#C6FF00]/40 text-[#C6FF00]"
                  : "bg-white/3 border-white/8 text-white/50 hover:text-white/80 hover:border-white/15"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      <SectionCard title="Timeline" error={errors.deadline}>
        <div>
          <FieldLabel>Creator Submission Deadline</FieldLabel>
          <input
            type="date"
            value={deadline}
            onChange={e => { setDeadline(e.target.value); setErrors(prev => ({ ...prev, deadline: "" })); }}
            className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#C6FF00]/40 focus:bg-white/[0.06]"
          />
        </div>
      </SectionCard>

      {/* ── Inspiration ──────────────────────────────────────────────────────── */}
      <SectionCard
        title="Inspiration & References"
        subtitle='Drop links or describe the style you want. AI will turn them into creator directions.'
      >
        <div>
          <FieldLabel>Example Links</FieldLabel>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <textarea
              value={inspirationLinks}
              onChange={e => setInspirationLinks(e.target.value)}
              placeholder={"TikTok, Instagram Reels, YouTube, or product page links — one per line"}
              rows={3}
              className="w-full bg-white/4 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#C6FF00]/40 focus:bg-white/[0.06] resize-none"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Style Notes</FieldLabel>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <textarea
              value={styleNotes}
              onChange={e => setStyleNotes(e.target.value)}
              placeholder={`Example: "Make it feel natural, not too salesy. Think creator explaining a tool they actually use. Avoid cheesy transitions."`}
              rows={3}
              className="w-full bg-white/4 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#C6FF00]/40 focus:bg-white/[0.06] resize-none"
            />
          </div>
        </div>

        <div className="border-2 border-dashed border-white/8 rounded-xl p-5 text-center">
          <p className="text-xs text-white/25">📎 Upload images, videos, product photos</p>
          <p className="text-[10px] text-white/15 mt-1">Coming soon</p>
        </div>
      </SectionCard>

      {/* ── Generate Hooks ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={generateHooks}
        disabled={generatingHooks}
        className="w-full py-3 rounded-xl border border-[#C6FF00]/20 bg-[#C6FF00]/5 text-[#C6FF00] text-sm font-semibold hover:bg-[#C6FF00]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generatingHooks ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating hooks &amp; scripts…</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Generate Hook Ideas &amp; Sample Scripts</>
        )}
      </button>

      {/* ── AI Hooks & Scripts ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {hooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-4"
          >
            {/* Hooks */}
            <SectionCard title="Suggested Hooks" subtitle="Copy, edit, or regenerate — these go into your creator brief.">
              <div className="space-y-2">
                {hooks.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                    <p className="flex-1 text-sm text-white/80 leading-relaxed">"{h}"</p>
                    <button
                      type="button"
                      onClick={() => copyHook(h, i)}
                      className="text-white/25 hover:text-[#C6FF00] transition-colors flex-shrink-0 mt-0.5"
                      title="Copy hook"
                    >
                      {copiedHook === i
                        ? <Check className="h-4 w-4 text-[#C6FF00]" />
                        : <Copy className="h-4 w-4" />
                      }
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={generateHooks}
                disabled={generatingHooks}
                className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/55 transition-colors mt-1"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            </SectionCard>

            {/* Scripts */}
            {scripts.length > 0 && (
              <SectionCard title="Sample Scripts" subtitle="Give creators a starting point — they'll make it their own.">
                <div className="flex gap-2 mb-1">
                  {scripts.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveScript(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeScript === i
                          ? "bg-[#C6FF00] text-black"
                          : "bg-white/5 text-white/45 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 mt-2">
                  <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed font-sans">
                    {scripts[activeScript]?.content}
                  </pre>
                </div>
              </SectionCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setLocation("/campaigns")}
          className="px-6 py-3 rounded-xl border border-white/10 text-white/45 text-sm font-semibold hover:text-white hover:border-white/20 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={buildCampaign}
          disabled={building}
          className="flex-1 py-3.5 rounded-xl bg-[#C6FF00] text-black font-bold text-sm hover:bg-[#d4ff33] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {building ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Building your campaign…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Build My Campaign</>
          )}
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-red-400/80 text-center">
          Please fill in the required fields above before building.
        </p>
      )}
    </motion.div>
  );
}
