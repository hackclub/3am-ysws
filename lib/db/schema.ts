import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  sub: text("sub").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  slackId: text("slack_id").notNull().unique(),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
