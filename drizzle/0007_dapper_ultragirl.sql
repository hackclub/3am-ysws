CREATE TYPE "public"."order_status" AS ENUM('placed', 'needs_address', 'packing', 'posted', 'cancelled');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_sub" text NOT NULL,
	"item_id" uuid,
	"item_name" text NOT NULL,
	"cost" integer NOT NULL,
	"status" "order_status" DEFAULT 'placed' NOT NULL,
	"full_name" text,
	"email" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"postcode" text,
	"country" text,
	"admin_note" text,
	"tracking" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone,
	CONSTRAINT "orders_cost_not_negative" CHECK ("orders"."cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_sub_users_sub_fk" FOREIGN KEY ("user_sub") REFERENCES "public"."users"("sub") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_sub_idx" ON "orders" USING btree ("user_sub");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");