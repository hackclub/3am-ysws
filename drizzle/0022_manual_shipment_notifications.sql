ALTER TABLE "manual_shipments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "manual_shipments" ADD COLUMN "notify_status" text;
--> statement-breakpoint
ALTER TABLE "manual_shipments" ADD COLUMN "notify_attempted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "manual_shipments" ADD COLUMN "notified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "manual_shipments" ADD CONSTRAINT "manual_shipments_notify_status_check" CHECK ("manual_shipments"."notify_status" is null or "manual_shipments"."notify_status" in ('sending', 'sent', 'failed'));
