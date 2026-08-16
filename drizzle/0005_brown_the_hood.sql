CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cost" integer NOT NULL,
	"image_url" text,
	"stock" integer,
	"hidden" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_cost_positive" CHECK ("items"."cost" > 0),
	CONSTRAINT "items_stock_not_negative" CHECK ("items"."stock" is null or "items"."stock" >= 0)
);
--> statement-breakpoint
CREATE INDEX "items_position_idx" ON "items" USING btree ("position");