## Context

The current site is a single static `index.html` (312 lines) with one global `style.css` (1929 lines) and one vanilla `script.js` (238 lines). There is no build step, no framework, no backend, and no server-fetched or time-derived data rendered on first paint (the session timer starts at `0` and only advances on user interaction, so there's no SSR/hydration mismatch risk from it). The org wants this repo on Next.js + TypeScript purely for deploy/tooling standardization — there is no other Next.js site in this org to mirror conventions from, so this change establishes the convention.

## Goals / Non-Goals

**Goals:**
- Reproduce the existing page pixel-for-pixel and behavior-for-behavior inside a Next.js (App Router) + TypeScript project.
- Convert `script.js`'s imperative DOM logic into typed, component-scoped React code (hooks/`useEffect`), without changing what it does.
- Keep `style.css` as a single global stylesheet import — no CSS Modules/Tailwind conversion, no rewriting of styles.
- Load Google Fonts via `next/font/google` instead of `<link>` tags.
- Localize the hot-linked hackclub.com image assets into `public/`.
- Move `<head>` metadata to the Next.js Metadata API.

**Non-Goals:**
- No new features, no visual redesign, no content changes.
- No server components doing real work — this page is inherently a client-rendered SPA; Next.js is providing tooling/deploy consistency, not a runtime architecture change.
- No backend, API routes, database, or data fetching.
- No CSS architecture change (Modules/Tailwind/CSS-in-JS) and no splitting/refactoring of `style.css`.
- Deployment pipeline changes are out of scope for implementation (noted as a consequence in the proposal, not executed here).

## Decisions

1. **App Router over Pages Router.** No existing convention to match, and App Router is the current Next.js default going forward — best choice when setting the convention for the first time.

2. **Everything interactive is a Client Component.** The hero canvas (star field + mouse parallax), moon-phase scroll listener, typewriter subtitle, fog-layer DOM builder, session timer + slider, FAQ accordion, mobile nav, spark trail, and bat spawner all read/write the DOM directly or use timers/`requestAnimationFrame`/scroll listeners. Each becomes its own `"use client"` component using `useRef`/`useEffect`, mirroring the current `initStars()`/`buildFog()`/etc. IIFEs one-to-one. `app/page.tsx` stays a thin server component that composes them; the root `<svg class="sprite-container">` defs move into a shared component since multiple children reference `#i-*` symbols via `<use>`.

3. **`style.css` stays a single global file**, imported once in `app/layout.tsx` (Next.js requires global CSS imports to live in the root layout). No selectors, class names, or structure change — this keeps the diff reviewable as "same site, new shell" rather than a redesign.

4. **Fonts via `next/font/google`.** Directly replaces the `<link rel="preconnect">` + Google Fonts stylesheet `<link>` in the current `<head>`. Same three families (Inter, JetBrains Mono, Space Grotesk) and weights, exposed as CSS variables so `style.css`'s existing `font-family` rules can reference them without rewriting the stylesheet.

5. **Assets into `public/`.** The favicon and hero logo currently point at `https://hackclub.com/_next/image?...`. These get downloaded once and referenced as local `/public` paths, removing the runtime dependency on hackclub.com's image optimizer for this site's own chrome.

6. **No hydration-guard workarounds needed for the timer.** Since `elapsedMs` starts at `0` and only changes via `setInterval` after a click, server-rendered and first-client-render markup match; no `useEffect`-deferred mount flag is required purely for the timer (unlike a typical "current time" SSR case).

## Risks / Trade-offs

- [Behavioral drift during the imperative→React port (e.g. the FAQ accordion's single-open-at-a-time behavior, the bat spawner's `batBusy` guard, the timer/slider's `syncToTimer` two-way binding)] → Mitigation: port logic 1:1 first, verify against the current live site side-by-side before any cleanup; tasks.md includes an explicit parity-check step per component.
- [`next/font` weight/subset mismatch changing text rendering subtly] → Mitigation: match the exact weights currently requested (Inter 300/400/500/600/700, JetBrains Mono 400/500/700, Space Grotesk 400/500/600/700).
- [Global CSS in `app/layout.tsx` colliding with Next.js's own base styles] → Mitigation: Next.js App Router does not inject opinionated global styles by default, so `style.css` should apply unmodified; verify in dev before proceeding.
- [Canvas/`requestAnimationFrame` code re-running or leaking on React re-renders/StrictMode double-invoke in dev] → Mitigation: guard `useEffect` setup/teardown (cancel `requestAnimationFrame`, remove listeners, clear intervals) exactly as the current IIFEs implicitly assume a single run — needed now because dev-mode double-invoke didn't exist in the static version.
- [Toolchain now required to even preview the site (`npm install`/`npm run dev`) where previously `index.html` could be opened directly] → Accepted as an intentional consequence of standardization (called out as **BREAKING** in the proposal).

## Migration Plan

1. Scaffold Next.js + TypeScript project alongside the existing static files.
2. Port assets, fonts, and metadata first (lowest risk, no behavior).
3. Port markup into `page.tsx` + components, wiring `style.css` classes unchanged.
4. Port `script.js` logic into each component, one behavior at a time, checking against the live static site.
5. Remove `index.html`/`script.js` once the Next.js version has full parity.
6. No rollback complexity beyond git revert — no data migrations, no external state.

## Open Questions

- None outstanding — all prior open questions (reference template, CSS strategy, SPA acceptance, asset hosting) were resolved during exploration.
