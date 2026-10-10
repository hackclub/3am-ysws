CREATE TABLE "slack_order_digest_events" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "order_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "claimed_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  CONSTRAINT "slack_order_digest_events_type_check" CHECK ("slack_order_digest_events"."event_type" in ('created', 'shipped'))
);
--> statement-breakpoint
ALTER TABLE "slack_order_digest_events" ADD CONSTRAINT "slack_order_digest_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "slack_order_digest_events_order_event_idx" ON "slack_order_digest_events" USING btree ("order_id", "event_type");
--> statement-breakpoint
CREATE INDEX "slack_order_digest_events_pending_idx" ON "slack_order_digest_events" USING btree ("delivered_at", "claimed_at", "created_at");
