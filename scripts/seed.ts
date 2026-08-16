import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";

const MAKER = {
  sub: "ident!seed0001",
  email: "hridhaan@hackclub.com",
  name: "Hridhaan S",
  slackId: "U0SEED001",
};

async function seed() {
  const db = getDb();

  await db.insert(users).values(MAKER).onConflictDoNothing();

  await db
    .insert(projects)
    .values([
      {
        userSub: MAKER.sub,
        title: "night mode portfolio",
        description: "A portfolio that only looks right after dark.",
        repoUrl: "https://github.com/hridhaan/night-mode-portfolio",
        demoUrl: "https://example.com/portfolio",
        thumbnailUrl: "https://example.com/thumb-portfolio.png",
        hackatimeProjects: ["night-mode-portfolio"],
        submittedAt: new Date(),
        decision: "approved",
        approvedMinutes: 720,
        noteToMaker: "Lovely work, approved.",
        decidedAt: new Date(),
      },
      {
        userSub: MAKER.sub,
        title: "tide, a tiny tidal clock",
        description: "A tiny desk clock that shows the local tide.",
        repoUrl: "https://github.com/hridhaan/tide",
        demoUrl: "https://example.com/tide",
        thumbnailUrl: "https://example.com/thumb-tide.png",
        hackatimeProjects: ["tide", "tide-firmware"],
        submittedAt: new Date(),
      },
      {
        userSub: MAKER.sub,
        title: "2am radio",
        hackatimeProjects: [],
      },
    ])
    .onConflictDoNothing();

  console.log("seeded 1 maker and 3 projects");
  process.exit(0);
}

seed();
