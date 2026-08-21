CREATE TYPE "public"."ysws_state" AS ENUM('held', 'queued', 'sent', 'error');--> statement-breakpoint
CREATE TABLE "ysws_submissions" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"state" "ysws_state" DEFAULT 'held' NOT NULL,
	"record_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"override_minutes" integer,
	"hours_justification" text,
	"age_justification" text,
	"duplicate_justification" text,
	"first_submitted_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	CONSTRAINT "ysws_submissions_override_minutes_positive" CHECK ("ysws_submissions"."override_minutes" is null or "ysws_submissions"."override_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "ysws_submissions" ADD CONSTRAINT "ysws_submissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ysws_submissions_state_idx" ON "ysws_submissions" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "ysws_submissions_record_id_idx" ON "ysws_submissions" USING btree ("record_id");