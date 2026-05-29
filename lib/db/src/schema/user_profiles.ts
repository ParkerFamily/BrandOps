import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable("user_profiles", {
  firebaseUid: text("firebase_uid").primaryKey(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  onboardingData: jsonb("onboarding_data"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeConnectOnboarded: boolean("stripe_connect_onboarded").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
