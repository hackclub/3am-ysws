CREATE TYPE "public"."beans_reason" AS ENUM('approval', 'revert', 'purchase', 'manual');--> statement-breakpoint
CREATE TABLE "beans_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_sub" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "beans_reason" NOT NULL,
	"project_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beans_ledger" ADD CONSTRAINT "beans_ledger_user_sub_users_sub_fk" FOREIGN KEY ("user_sub") REFERENCES "public"."users"("sub") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans_ledger" ADD CONSTRAINT "beans_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beans_ledger_user_sub_idx" ON "beans_ledger" USING btree ("user_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "beans_ledger_project_reason_idx" ON "beans_ledger" USING btree ("project_id","reason") WHERE "beans_ledger"."project_id" is not null;