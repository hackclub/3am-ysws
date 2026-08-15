DROP INDEX "beans_ledger_project_reason_idx";--> statement-breakpoint
CREATE INDEX "beans_ledger_project_id_idx" ON "beans_ledger" USING btree ("project_id");