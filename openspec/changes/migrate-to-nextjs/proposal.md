## Why

This site is currently a static HTML/CSS/vanilla-JS page with no build step. The org is standardizing its sites on Next.js + TypeScript for a consistent deploy/tooling pipeline. This site needs to move onto that stack so it fits the same conventions (build, deploy, type-checking) as the rest of the fleet. There is no new user-facing capability being added — this is an infrastructure/tooling migration, not a feature or redesign.

## What Changes

- Scaffold a Next.js (App Router) + TypeScript project in this repo, replacing the static `index.html` build.
- Port the single page's markup into a `page.tsx` composed of client components (Hero, StarCanvas, MoonPhase, Fog, TypewriterSubtitle, RewardsGrid + SessionTimer, FAQ, SubmitSection, SparkTrail, BatSpawner) since virtually all behavior is DOM/canvas/timer driven and needs `"use client"`.
- Port `script.js`'s imperative logic into typed functions/hooks inside those client components, preserving behavior exactly (no logic changes).
- Keep `style.css` as a single global stylesheet, imported once (e.g. in the root layout) rather than split into CSS Modules — **no visual changes**.
- Move page `<head>` metadata (title, description, og tags, viewport) into Next.js Metadata API in the root layout.
- Replace the Google Fonts `<link>` tags with `next/font/google` for Inter, JetBrains Mono, and Space Grotesk.
- Localize the currently hot-linked hackclub.com favicon/logo image into `public/` and reference it locally.
- Add standard Next.js + TypeScript project scaffolding: `package.json`, `tsconfig.json`, `next.config.ts`, lint config.
- **BREAKING**: Build and run commands change — this repo goes from "open `index.html` directly / serve statically" to a Next.js app requiring `npm install`, `npm run dev`, `npm run build`.

## Capabilities

### New Capabilities
- `nextjs-app-shell`: The Next.js + TypeScript application scaffold (routing, layout, metadata, fonts, build/dev tooling) that hosts the existing page.
- `ysws-landing-page`: The single-page YSWS 3AM experience itself (hero/canvas/moon/timer/rewards/FAQ/submit/easter-eggs), now implemented as typed React client components with behavior identical to the current static site.

### Modified Capabilities
- (none — no existing specs in this repo prior to this change)

## Impact

- Affected code: `index.html`, `script.js`, `style.css` are superseded by a Next.js project structure (`app/`, `components/`, `public/`, config files). `style.css` content is preserved and moved, not rewritten.
- Dependencies: adds Node.js toolchain (`next`, `react`, `react-dom`, `typescript`, `@types/*`) where previously there were none.
- Deploy: build/deploy process changes from static file hosting to a Next.js build output — out of scope for this change's implementation but noted as a consequence.
- No backend, data, or API surface is introduced or affected.
