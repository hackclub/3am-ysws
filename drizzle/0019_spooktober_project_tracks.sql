ALTER TABLE "projects" ADD COLUMN "track" text DEFAULT 'software' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_track_check" CHECK ("track" IN ('hardware', 'software'));
