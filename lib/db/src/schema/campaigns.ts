import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  totalBudget: numeric("total_budget", { precision: 12, scale: 2 }).notNull().default("0"),
  payoutPerVideo: numeric("payout_per_video", { precision: 12, scale: 2 }).notNull().default("0"),
  platform: text("platform").notNull().default("tiktok"),
  niche: text("niche").notNull().default(""),
  status: text("status").notNull().default("draft"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull().defaultNow(),
  inspirationUrls: text("inspiration_urls"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
