import { defineConfig } from "drizzle-kit";

import { connectionUrl } from "./lib/db/url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionUrl(process.env.DATABASE_URL ?? "postgres://3am:3am@127.0.0.1:5432/3am"),
  },
  strict: true,
  verbose: true,
});
