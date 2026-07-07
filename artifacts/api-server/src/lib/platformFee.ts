/** BrandOps platform fee — 10% on top of creator payout (brand pays total). */
export const BRANDOPS_PLATFORM_FEE_RATE = 0.1;

export type PlatformPayoutBreakdown = {
  creatorAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  creatorAmountCents: number;
  platformFeeCents: number;
  totalCents: number;
};

export function computePlatformPayoutAmounts(creatorAmountDollars: number): PlatformPayoutBreakdown {
  const creatorAmountCents = Math.round(creatorAmountDollars * 100);
  const platformFeeCents = Math.round(creatorAmountCents * BRANDOPS_PLATFORM_FEE_RATE);
  const totalCents = creatorAmountCents + platformFeeCents;

  return {
    creatorAmount: creatorAmountCents / 100,
    platformFeeAmount: platformFeeCents / 100,
    totalAmount: totalCents / 100,
    creatorAmountCents,
    platformFeeCents,
    totalCents,
  };
}

export function creatorAmountFromPaymentIntentMetadata(metadata: Record<string, string> | null | undefined): number | null {
  const raw = metadata?.creatorAmountCents;
  if (!raw) return null;
  const cents = Number(raw);
  return Number.isFinite(cents) ? cents / 100 : null;
}
