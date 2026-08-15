CREATE TYPE "public"."decision" AS ENUM('approved', 'changes', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_sub" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"repo_url" text,
	"demo_url" text,
	"thumbnail_url" text,
	"hackatime_projects" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"decision" "decision",
	"approved_minutes" integer,
	"note_to_maker" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_sub_users_sub_fk" FOREIGN KEY ("user_sub") REFERENCES "public"."users"("sub") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_sub_idx" ON "projects" USING btree ("user_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_sub_repo_url_idx" ON "projects" USING btree ("user_sub","repo_url");