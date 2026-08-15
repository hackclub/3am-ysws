import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof create>;

declare global {
  var __3amDb: Database | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema });
}

export function getDb(): Database {
  return (globalThis.__3amDb ??= create());
}
