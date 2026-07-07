import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";

export type FirestorePaymentStatus = "pending" | "processing" | "paid" | "failed";

export type FirestorePayment = {
  id: string;
  submissionId: string;
  creatorId: string;
  campaignId: string;
  creatorEmail: string | null;
  creatorName: string | null;
  campaignTitle: string | null;
  brandUid?: string | null;
  /** Creator payout — same as creatorAmount when set. */
  amount: number;
  creatorAmount: number | null;
  platformFeeAmount: number | null;
  totalAmount: number | null;
  currency: string;
  status: FirestorePaymentStatus;
  stripePaymentIntentId: string | null;
  connectedAccountId: string | null;
  paymentStatus: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

function normalizePaymentStatus(value: unknown): FirestorePaymentStatus {
  const raw = String(value ?? "pending").trim().toLowerCase();
  if (raw === "paid" || raw === "succeeded" || raw === "success" || raw === "complete") return "paid";
  if (raw === "processing") return "processing";
  if (raw === "failed" || raw === "canceled" || raw === "cancelled") return "failed";
  return "pending";
}

/**
 * Firestore payment lifecycle (matches web Submissions + Payments):
 * 1. Brand approves on Submissions → payment doc `status: "paid"` + `paidAt` (instant)
 * 2. Optional Stripe payout intent path → webhook flips to `paid` if still in flight
 *
 * Mobile mirrors web Payments.tsx — only `status === "paid"` counts toward Total Paid.
 */
export function isPaymentPaid(payment: FirestorePayment): boolean {
  return payment.status === "paid";
}

/** Matches web Payments page: totalAmount when set, otherwise creator payout. */
export function brandPaymentChargeAmount(payment: FirestorePayment): number {
  return payment.totalAmount ?? payment.amount ?? payment.creatorAmount ?? 0;
}

export type BrandPaymentSummary = {
  totalPaid: number;
  totalProcessing: number;
  totalPending: number;
  paidThisMonth: number;
};

/** Same buckets as web BrandPaymentsPage (Total Paid / Processing / Pending). */
export function computeBrandPaymentTotals(payments: FirestorePayment[]): BrandPaymentSummary {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let totalPaid = 0;
  let totalProcessing = 0;
  let totalPending = 0;
  let paidThisMonth = 0;

  for (const payment of payments) {
    const charge = brandPaymentChargeAmount(payment);
    if (payment.status === "paid") {
      totalPaid += charge;
      const when = payment.paidAt ?? payment.createdAt;
      if (when >= monthStart) paidThisMonth += charge;
    } else if (payment.status === "processing") {
      totalProcessing += charge;
    } else if (payment.status === "pending") {
      totalPending += charge;
    }
  }

  return { totalPaid, totalProcessing, totalPending, paidThisMonth };
}

function mapPayment(id: string, data: DocumentData): FirestorePayment {
  const amount = Number(data.amount ?? data.creatorAmount ?? 0);
  const creatorAmountRaw = data.creatorAmount != null ? Number(data.creatorAmount) : amount;
  return {
    id,
    submissionId: String(data.submissionId ?? ""),
    creatorId: String(data.creatorId ?? data.creatorFirebaseUid ?? ""),
    campaignId: String(data.campaignId ?? data.campaignDocId ?? ""),
    brandUid: (data.brandUid as string | null | undefined) ?? null,
    creatorEmail: (data.creatorEmail as string | null | undefined) ?? null,
    creatorName: (data.creatorName as string | null | undefined) ?? null,
    campaignTitle: (data.campaignTitle as string | null | undefined) ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    creatorAmount: Number.isFinite(creatorAmountRaw) ? creatorAmountRaw : null,
    platformFeeAmount:
      data.platformFeeAmount != null && Number.isFinite(Number(data.platformFeeAmount))
        ? Number(data.platformFeeAmount)
        : null,
    totalAmount:
      data.totalAmount != null && Number.isFinite(Number(data.totalAmount))
        ? Number(data.totalAmount)
        : null,
    currency: String(data.currency ?? "usd"),
    status: normalizePaymentStatus(data.status),
    stripePaymentIntentId: (data.stripePaymentIntentId as string | null | undefined) ?? null,
    connectedAccountId: (data.connectedAccountId as string | null | undefined) ?? null,
    paymentStatus: (data.paymentStatus as string | null | undefined) ?? null,
    paidAt: data.paidAt ? toDate(data.paidAt) : null,
    createdAt: toDate(data.createdAt),
  };
}

function sortPayments(rows: FirestorePayment[]): FirestorePayment[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function paymentBelongsToBrand(
  payment: FirestorePayment,
  ownerUid: string,
  campaignDocIds: Iterable<string>,
  submissionIds: Iterable<string>,
  campaignTitles: Iterable<string>
): boolean {
  if (payment.brandUid && payment.brandUid === ownerUid) return true;

  const ownedIds = new Set(campaignDocIds);
  if (payment.campaignId && ownedIds.has(payment.campaignId)) return true;

  const ownedSubmissions = new Set(submissionIds);
  if (payment.submissionId && ownedSubmissions.has(payment.submissionId)) return true;

  const title = payment.campaignTitle?.trim().toLowerCase();
  if (title) {
    for (const campaignTitle of campaignTitles) {
      if (campaignTitle.trim().toLowerCase() === title) return true;
    }
  }

  return false;
}

export function filterPaymentsForBrandOwner(
  payments: FirestorePayment[],
  ownerUid: string,
  campaignDocIds: Iterable<string>,
  submissionIds: Iterable<string> = [],
  campaignTitles: Iterable<string> = []
): FirestorePayment[] {
  return payments.filter((p) =>
    paymentBelongsToBrand(p, ownerUid, campaignDocIds, submissionIds, campaignTitles)
  );
}

/** Real-time brand payments — full collection (same as web fsSubscribePayments). */
export function subscribeBrandPayments(onData: (rows: FirestorePayment[]) => void): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    collection(firebase.db, "payments"),
    (snap) => {
      const rows = snap.docs.map((docSnap) => mapPayment(docSnap.id, docSnap.data()));
      if (__DEV__) {
        for (const docSnap of snap.docs) {
          const raw = docSnap.data();
          const mapped = rows.find((row) => row.id === docSnap.id);
          console.log("[BrandOps brand payment doc]", docSnap.id, {
            rawStatus: raw.status,
            rawPaymentStatus: raw.paymentStatus,
            mappedStatus: mapped?.status,
            creatorId: raw.creatorId ?? raw.creatorFirebaseUid,
            amount: raw.amount,
            totalAmount: raw.totalAmount,
            hasStripeIntent: Boolean(raw.stripePaymentIntentId),
          });
        }
      }
      onData(rows);
    },
    (err) => {
      if (__DEV__) console.warn("[BrandOps brand payments]", err.message);
    }
  );
}

function matchesCreator(payment: FirestorePayment, creatorUid: string, creatorEmail: string | null | undefined): boolean {
  if (payment.creatorId && payment.creatorId === creatorUid) return true;
  const email = creatorEmail?.trim().toLowerCase();
  if (email && payment.creatorEmail?.trim().toLowerCase() === email) return true;
  return false;
}

/** Real-time creator payouts from Firestore `payments` (matches web Payments page). */
export function subscribeCreatorPayments(
  creatorUid: string,
  creatorEmail: string | null | undefined,
  onData: (rows: FirestorePayment[]) => void
): Unsubscribe {
  const firebase = getFirebase();
  if (!firebase || !creatorUid) {
    onData([]);
    return () => {};
  }

  const email = creatorEmail?.trim().toLowerCase();
  const apply = (docs: FirestorePayment[]) => {
    onData(sortPayments(docs.filter((p) => matchesCreator(p, creatorUid, email))));
  };

  // Prefer creatorId (Firebase UID) — matches current Firestore payment docs.
  const byUid = query(collection(firebase.db, "payments"), where("creatorId", "==", creatorUid));
  return onSnapshot(
    byUid,
    (snap) => apply(snap.docs.map((d) => mapPayment(d.id, d.data()))),
    () => onData([])
  );
}
