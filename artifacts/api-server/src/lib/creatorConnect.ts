import { eq } from "drizzle-orm";
import { db, userProfilesTable } from "@workspace/db";
import { getAuth, readFirestoreDoc } from "../firebaseAdmin";
import { getUncachableStripeClient } from "../stripeClient";

export async function resolveCreatorConnectAccount(
  creatorEmail: string
): Promise<{ uid: string; accountId: string } | null> {
  const normalized = creatorEmail.trim().toLowerCase();
  if (!normalized) return null;

  let uid: string;
  try {
    uid = (await getAuth().getUserByEmail(normalized)).uid;
  } catch {
    return null;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  let accountId = profile?.stripeConnectAccountId ?? null;
  if (!accountId) {
    const userDoc = await readFirestoreDoc<{ stripeConnectAccountId?: string }>("users", uid);
    accountId = userDoc?.stripeConnectAccountId ?? null;
  }

  if (!accountId) return null;
  return { uid, accountId };
}

export async function resolveBrandStripeCustomer(brandUid: string): Promise<string | null> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, brandUid))
    .limit(1);

  if (profile?.stripeCustomerId) return profile.stripeCustomerId;

  const userDoc = await readFirestoreDoc<{ stripeCustomerId?: string }>("users", brandUid);
  return userDoc?.stripeCustomerId ?? null;
}

export async function resolveConnectAccountIdForUid(uid: string): Promise<string | null> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.firebaseUid, uid))
    .limit(1);

  if (profile?.stripeConnectAccountId) return profile.stripeConnectAccountId;

  const userDoc = await readFirestoreDoc<{ stripeConnectAccountId?: string }>("users", uid);
  return userDoc?.stripeConnectAccountId ?? null;
}

export async function getBrandDefaultPaymentMethod(customerId: string): Promise<string | null> {
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === "string") return defaultPm;
  if (defaultPm && typeof defaultPm === "object" && "id" in defaultPm) {
    return String(defaultPm.id);
  }

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  return methods.data[0]?.id ?? null;
}
