import { pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  sub: text("sub").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  slackId: text("slack_id").notNull().unique(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
