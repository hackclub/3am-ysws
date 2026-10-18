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
