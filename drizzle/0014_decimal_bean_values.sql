ALTER TABLE "beans_ledger" ALTER COLUMN "delta" SET DATA TYPE numeric(12, 2) USING "delta"::numeric(12, 2);
ALTER TABLE "items" ALTER COLUMN "cost" SET DATA TYPE numeric(12, 2) USING "cost"::numeric(12, 2);
ALTER TABLE "orders" ALTER COLUMN "cost" SET DATA TYPE numeric(12, 2) USING "cost"::numeric(12, 2);
