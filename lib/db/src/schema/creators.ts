import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creatorsTable = pgTable("creators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  platform: text("platform").notNull().default("tiktok"),
  handle: text("handle").notNull(),
  niche: text("niche").notNull().default(""),
  followerCount: integer("follower_count").notNull().default(0),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  // UGC production metrics
  approvalRate: numeric("approval_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  revisionRate: numeric("revision_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  completedCampaigns: integer("completed_campaigns").notNull().default(0),
  onTimeDeliveryRate: numeric("on_time_delivery_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  avgTurnaroundDays: numeric("avg_turnaround_days", { precision: 5, scale: 1 }).notNull().default("0"),
  brandRating: numeric("brand_rating", { precision: 3, scale: 1 }).notNull().default("0"),
  suggestedPayout: numeric("suggested_payout", { precision: 10, scale: 2 }).notNull().default("0"),
  contentStyles: text("content_styles").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCreatorSchema = createInsertSchema(creatorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creatorsTable.$inferSelect;
