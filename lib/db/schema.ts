import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ProjectTrack } from "@/lib/review/types";

export const users = pgTable("users", {
  sub: text("sub").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  slackId: text("slack_id").notNull().unique(),
  hackatimeId: text("hackatime_id"),
  hackatimeToken: text("hackatime_token"),

  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  birthday: date("birthday"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  stateProvince: text("state_province"),
  postcode: text("postcode"),
  country: text("country"),
});

export const decision = pgEnum("decision", ["approved", "changes", "rejected", "withdrawn"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub")
      .notNull()
      .references(() => users.sub, { onUpdate: "cascade" }),

    title: text("title").notNull(),
    description: text("description"),
    track: text("track").$type<ProjectTrack>().notNull().default("software"),
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
    check("projects_track_check", sql`${table.track} in ('hardware', 'software')`),
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

export const yswsConfig = pgTable(
  "ysws_config",
  {
    id: integer("id").primaryKey().default(1),
    submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
    submissionsOpen: boolean("submissions_open").notNull().default(true),
    resubmissionsOpen: boolean("resubmissions_open").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("ysws_config_singleton", sql`${table.id} = 1`)],
);

export const yswsState = pgEnum("ysws_state", ["held", "queued", "sent", "error"]);

export const yswsSubmissions = pgTable(
  "ysws_submissions",
  {
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),

    state: yswsState("state").notNull().default("held"),
    recordId: text("record_id"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),

    overrideMinutes: integer("override_minutes"),
    hoursJustification: text("hours_justification"),
    ageJustification: text("age_justification"),
    duplicateJustification: text("duplicate_justification"),
    nameJustification: text("name_justification"),

    firstSubmittedAt: timestamp("first_submitted_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  },
  (table) => [
    index("ysws_submissions_state_idx").on(table.state),
    uniqueIndex("ysws_submissions_record_id_idx").on(table.recordId),
    check(
      "ysws_submissions_override_minutes_positive",
      sql`${table.overrideMinutes} is null or ${table.overrideMinutes} > 0`,
    ),
  ],
);

export const beansReason = pgEnum("beans_reason", ["approval", "revert", "purchase", "manual"]);

export const beansLedger = pgTable(
  "beans_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userSub: text("user_sub")
      .notNull()
      .references(() => users.sub, { onUpdate: "cascade" }),
    delta: numeric("delta", { precision: 12, scale: 2, mode: "number" }).notNull(),
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
    cost: numeric("cost", { precision: 12, scale: 2, mode: "number" }).notNull(),
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

export const orderStatus = pgEnum("order_status", [
  "placed",
  "needs_address",
  "packing",
  "ready_to_fulfil",
  "posted",
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub")
      .notNull()
      .references(() => users.sub, { onUpdate: "cascade" }),
    itemId: uuid("item_id").references(() => items.id),

    itemName: text("item_name").notNull(),
    cost: numeric("cost", { precision: 12, scale: 2, mode: "number" }).notNull(),
    status: orderStatus("status").notNull().default("placed"),

    fullName: text("full_name"),
    email: text("email"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    postcode: text("postcode"),
    country: text("country"),

    adminNote: text("admin_note"),
    tracking: text("tracking"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_user_sub_idx").on(table.userSub),
    index("orders_status_idx").on(table.status),
    check("orders_cost_not_negative", sql`${table.cost} >= 0`),
  ],
);


export const slackOrderDigestEvents = pgTable(
  "slack_order_digest_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (table) => [
    uniqueIndex("slack_order_digest_events_order_event_idx").on(table.orderId, table.eventType),
    index("slack_order_digest_events_pending_idx").on(table.deliveredAt, table.claimedAt, table.createdAt),
    check("slack_order_digest_events_type_check", sql`${table.eventType} in ('created', 'shipped')`),
  ],
);



export const reviewerEntryKind = pgEnum("reviewer_entry_kind", ["review", "adjustment", "payout"]);

// People who review 3am ships in Ari and get paid per review. Never hard-deleted:
// removing a reviewer sets removedAt so their history and payouts stay intact.
export const reviewers = pgTable(
  "reviewers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slackId: text("slack_id").notNull(),
    email: text("email"),
    name: text("name").notNull(),
    addedBy: text("added_by"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("reviewers_slack_id_idx").on(table.slackId)],
);

// Ari reviews received before payoutsStart were already paid outside this
// system: they show in history at $0 so nobody is paid twice.
export const reviewerPayConfig = pgTable(
  "reviewer_pay_config",
  {
    id: integer("id").primaryKey().default(1),
    payoutsStart: timestamp("payouts_start", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("reviewer_pay_config_singleton", sql`${table.id} = 1`)],
);

// Append-only money ledger. Balance owed = sum(delta). A payout writes -balance,
// which takes the owed amount back to 0 while keeping every past row.
export const reviewerLedger = pgTable(
  "reviewer_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => reviewers.id),
    kind: reviewerEntryKind("kind").notNull(),
    delta: numeric("delta", { precision: 12, scale: 2, mode: "number" }).notNull(),
    // Set for kind = review: the Ari delivery that earned it. Unique, so a delivery pays once.
    deliveryId: text("delivery_id"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    decision: text("decision"),
    approvedMinutes: integer("approved_minutes"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reviewer_ledger_reviewer_id_idx").on(table.reviewerId),
    uniqueIndex("reviewer_ledger_delivery_id_idx").on(table.deliveryId),
  ],
);

export const reviewerInvoiceStatus = pgEnum("reviewer_invoice_status", ["requested", "paid", "declined"]);

// A reviewer asking to be paid. "requested" = in process. At most one open per reviewer.
// Marking the reviewer paid (the tick) closes their open invoice.
export const reviewerInvoices = pgTable(
  "reviewer_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => reviewers.id),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    status: reviewerInvoiceStatus("status").notNull().default("requested"),
    note: text("note"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: text("closed_by"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2, mode: "number" }),
    slackSentAt: timestamp("slack_sent_at", { withTimezone: true }),
  },
  (table) => [
    index("reviewer_invoices_reviewer_id_idx").on(table.reviewerId),
    uniqueIndex("reviewer_invoices_one_open_idx")
      .on(table.reviewerId)
      .where(sql`${table.status} = 'requested'`),
    check("reviewer_invoices_amount_positive", sql`${table.amount} > 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type YswsConfig = typeof yswsConfig.$inferSelect;
export type NewYswsConfig = typeof yswsConfig.$inferInsert;
export type YswsSubmission = typeof yswsSubmissions.$inferSelect;
export type NewYswsSubmission = typeof yswsSubmissions.$inferInsert;
export type BeansEntry = typeof beansLedger.$inferSelect;
export type NewBeansEntry = typeof beansLedger.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Reviewer = typeof reviewers.$inferSelect;
export type ReviewerEntry = typeof reviewerLedger.$inferSelect;
export type ReviewerInvoice = typeof reviewerInvoices.$inferSelect;
