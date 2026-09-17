CREATE TABLE IF NOT EXISTS "ysws_config" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "submission_deadline" timestamp with time zone,
  "submissions_open" boolean DEFAULT true NOT NULL,
  "resubmissions_open" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ysws_config_singleton" CHECK ("ysws_config"."id" = 1)
);

INSERT INTO "ysws_config" ("id")
VALUES (1)
ON CONFLICT ("id") DO NOTHING;
