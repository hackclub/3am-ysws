export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Outbound fetches (auth.hackclub.com, Hackatime, CDN) intermittently fail with
  // `AggregateError ETIMEDOUT` — Node's happy-eyeballs gives each resolved
  // address only a short window before giving up. Give each attempt more room.
  const net = await import("node:net");
  net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { getDb } = await import("@/lib/db");

  await migrate(getDb(), { migrationsFolder: "./drizzle" });

  const { getReviewBackend, reviewConfigProblems } = await import("@/lib/review");
  console.info(`[review] backend is ${getReviewBackend().name}`);
  for (const problem of reviewConfigProblems()) console.error(`[review] ${problem}`);
}
