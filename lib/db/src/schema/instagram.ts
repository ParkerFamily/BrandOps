import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const instagramAccountsTable = pgTable("instagram_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  instagramUserId: text("instagram_user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  name: text("name"),
  biography: text("biography"),
  followersCount: integer("followers_count").default(0),
  mediaCount: integer("media_count").default(0),
  profilePictureUrl: text("profile_picture_url"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInstagramAccountSchema = createInsertSchema(instagramAccountsTable).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});
export type InsertInstagramAccount = z.infer<typeof insertInstagramAccountSchema>;
export type InstagramAccount = typeof instagramAccountsTable.$inferSelect;
