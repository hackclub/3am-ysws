import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  sub: text("sub").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  slackId: text("slack_id").notNull().unique(),
  hackatimeId: text("hackatime_id"),
  hackatimeToken: text("hackatime_token"),
});

export const decision = pgEnum("decision", ["approved", "changes", "rejected", "withdrawn"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub")
      .notNull()
      .references(() => users.sub),

    title: text("title").notNull(),
    description: text("description"),
    repoUrl: text("repo_url"),
    demoUrl: text("demo_url"),
    thumbnailUrl: text("thumbnail_url"),
    hackatimeProjects: text("hackatime_projects").array().notNull().default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    decision: decision("decision"),
    approvedMinutes: integer("approved_minutes"),
    noteToMaker: text("note_to_maker"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_user_sub_idx").on(table.userSub),
    uniqueIndex("projects_user_sub_repo_url_idx").on(table.userSub, table.repoUrl),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    deliveryId: text("delivery_id").primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("webhook_events_project_id_idx").on(table.projectId)],
);

export const beansReason = pgEnum("beans_reason", ["approval", "revert", "purchase", "manual"]);

export const beansLedger = pgTable(
  "beans_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userSub: text("user_sub")
      .notNull()
      .references(() => users.sub),
    delta: integer("delta").notNull(),
    reason: beansReason("reason").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("beans_ledger_user_sub_idx").on(table.userSub),
    index("beans_ledger_project_id_idx").on(table.projectId),
  ],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    cost: integer("cost").notNull(),
    imageUrl: text("image_url"),
    stock: integer("stock"),
    hidden: boolean("hidden").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("items_position_idx").on(table.position),
    check("items_cost_positive", sql`${table.cost} > 0`),
    check("items_stock_not_negative", sql`${table.stock} is null or ${table.stock} >= 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type BeansEntry = typeof beansLedger.$inferSelect;
export type NewBeansEntry = typeof beansLedger.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
