import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable("user_profiles", {
  firebaseUid: text("firebase_uid").primaryKey(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  onboardingData: jsonb("onboarding_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
