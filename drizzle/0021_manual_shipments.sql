CREATE TYPE "public"."manual_shipment_status" AS ENUM('packing', 'posted', 'delivered');
--> statement-breakpoint
CREATE TABLE "manual_shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_name" text NOT NULL,
  "recipient_email" text NOT NULL,
  "slack_id" text,
  "item_name" text NOT NULL,
  "address_line1" text NOT NULL,
  "address_line2" text,
  "city" text NOT NULL,
  "state_province" text,
  "postcode" text NOT NULL,
  "country" text NOT NULL,
  "courier" text,
  "tracking" text,
  "status" "manual_shipment_status" DEFAULT 'packing' NOT NULL,
  "notes" text,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "dispatched_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  CONSTRAINT "manual_shipments_item_name_check" CHECK ("manual_shipments"."item_name" in ('Stickers', '3AM Swag Kit'))
);
--> statement-breakpoint
CREATE INDEX "manual_shipments_status_created_at_idx" ON "manual_shipments" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "manual_shipments_created_at_idx" ON "manual_shipments" USING btree ("created_at");
