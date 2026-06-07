import { useState } from "react";
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface LogLine {
  type: "info" | "ok" | "warn" | "error";
  msg: string;
}

export default function AdminBackfill() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);

  function push(type: LogLine["type"], msg: string) {
    setLog(prev => [...prev, { type, msg }]);
  }

  async function runBackfill() {
    setRunning(true);
    setDone(false);
    setLog([]);

    push("info", "Fetching all payment docs…");
    const paySnap = await getDocs(collection(db, "payments"));
    push("info", `Found ${paySnap.size} payment doc(s).`);

    let patched = 0;
    let clean = 0;
    let errors = 0;

    for (const payDoc of paySnap.docs) {
      const data = payDoc.data();
      const needsCreator = !data.creatorId || data.creatorId === "";
      const needsCampaign = !data.campaignId || data.campaignId === "";

      if (!needsCreator && !needsCampaign) {
        clean++;
        continue;
      }

      const submissionId: string = data.submissionId ?? "";
      if (!submissionId) {
        push("warn", `payment/${payDoc.id}: no submissionId — skipped`);
        errors++;
        continue;
      }

      const subSnap = await getDoc(doc(db, "submissions", submissionId));
      if (!subSnap.exists()) {
        push("warn", `payment/${payDoc.id}: submission/${submissionId} not found — skipped`);
        errors++;
        continue;
      }

      const sub = subSnap.data();
      const patch: Record<string, string> = {};

      if (needsCreator) {
        const id: string = (sub.creatorFirebaseUid ?? sub.creatorId ?? "") as string;
        if (id) patch.creatorId = id;
        else push("warn", `payment/${payDoc.id}: submission has no creatorFirebaseUid or creatorId`);
      }

      if (needsCampaign) {
        const id: string = (sub.campaignDocId ?? sub.campaignId ?? "") as string;
        if (id) patch.campaignId = id;
        else push("warn", `payment/${payDoc.id}: submission has no campaignDocId or campaignId`);
      }

      if (Object.keys(patch).length === 0) {
        clean++;
        continue;
      }

      try {
        await updateDoc(doc(db, "payments", payDoc.id), patch);
        push("ok", `payment/${payDoc.id} → ${JSON.stringify(patch)}`);
        patched++;
      } catch (e) {
        push("error", `payment/${payDoc.id}: update failed — ${String(e)}`);
        errors++;
      }
    }

    push("info", `Done — ${patched} patched, ${clean} already clean, ${errors} errors`);
    setRunning(false);
    setDone(true);
  }

  const color: Record<LogLine["type"], string> = {
    info: "text-white/50",
    ok: "text-[#C6FF00]",
    warn: "text-yellow-400",
    error: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Payments Backfill</h1>
      <p className="text-sm text-white/40 mb-6">
        Fills in missing <code className="text-white/60">creatorId</code> and{" "}
        <code className="text-white/60">campaignId</code> on payment docs by looking up their linked submission.
      </p>

      <Button
        onClick={runBackfill}
        disabled={running}
        className="bg-[#C6FF00] text-black font-bold hover:bg-[#d4ff33] mb-6"
      >
        {running ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running…</> : "Run Backfill"}
      </Button>

      {log.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs space-y-0.5 max-h-[60vh] overflow-y-auto">
          {log.map((l, i) => (
            <div key={i} className={color[l.type]}>
              {l.type === "ok" ? "✅ " : l.type === "warn" ? "⚠️  " : l.type === "error" ? "❌ " : "   "}
              {l.msg}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[#C6FF00]">
          <CheckCircle2 className="h-4 w-4" /> Backfill complete — you can close this page.
        </div>
      )}
    </div>
  );
}
