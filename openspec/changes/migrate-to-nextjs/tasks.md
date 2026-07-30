## 1. Project Scaffold

- [x] 1.1 Initialize Next.js (App Router) + TypeScript project (`package.json`, `tsconfig.json`, `next.config.ts`, lint config) in the repo root, alongside the existing static files
- [x] 1.2 Verify `npm run dev` serves a blank Next.js app successfully before porting any content

## 2. Assets, Fonts, Metadata (no behavior yet)

- [x] 2.1 Download the hackclub.com hero logo/favicon images and add them to `public/`
- [x] 2.2 Configure `next/font/google` for Inter (300/400/500/600/700), JetBrains Mono (400/500/700), and Space Grotesk (400/500/600/700); expose as CSS variables
- [x] 2.3 Move `style.css` into the project and import it once in `app/layout.tsx` (discovered `style.css` contains two concatenated stylesheet revisions with a second, invalid mid-file `@import`; removed only that duplicate import line to unblock the build — no other content changed, preserving the current rendered cascade)
- [x] 2.4 Recreate title/description/og:title/og:description/og:type/viewport via the Next.js Metadata API in `app/layout.tsx`
- [x] 2.5 Reference local `public/` favicon instead of the hackclub.com hot-link

## 3. Static Markup Port

- [x] 3.1 Create a shared `SpriteIcons` component for the `<svg class="sprite-container">` symbol defs, rendered once in the layout
- [x] 3.2 Port the nav markup into a `Nav` component (hamburger + nav-links), static structure only
- [x] 3.3 Port the hero section markup (headline, subtitle placeholder, canvas element, moon markup, fog-layer container) into a `Hero` component
- [x] 3.4 Port the rewards section markup into a `Rewards` component (static grid only — no timer/slider markup exists in current `index.html`, confirmed out of scope)
- [x] 3.5 Port the FAQ section markup into an `Faq` component
- [x] 3.6 Port the submit section markup into a `Submit` component
- [x] 3.7 Port the footer markup into a `Footer` component
- [x] 3.8 Port the `<template id="batTpl">` bat markup into the `BatSpawner` component's template
- [x] 3.9 Assemble `app/page.tsx` from `Nav`, `Hero`, `Rewards`, `Faq`, `Submit`, `Footer`
- [x] 3.10 Visual smoke check: page matches static site with all interactivity still inert (built behavior directly into components rather than in a separate inert pass — HTML structure verified via curl smoke test)

## 4. Behavior Port — Simple Interactions

- [x] 4.1 Port mobile nav hamburger toggle + close-on-link-click into `Nav` (`"use client"`, `useState`)
- [x] 4.2 Port FAQ accordion single-open behavior into `Faq` (`"use client"`, `useState`)
- [x] 4.3 Port moon-phase scroll listener into `Hero` (`useEffect` scroll listener, cleanup on unmount)
- [x] 4.4 Port mouse spark trail into a `SparkTrail` client component mounted globally, with cleanup

## 5. Behavior Port — Canvas, Timers, Fog, Bats

- [x] 5.1 Port `initStars()` canvas star field + mouse-proximity line drawing into a `StarCanvas` client component using `useRef` + `useEffect`, cancelling `requestAnimationFrame` and removing listeners on unmount
- [x] 5.2 Port `buildFog()`'s hardcoded cloud definitions into `FogLayer`, rendered declaratively (map over the cloud config) instead of imperative DOM creation
- [x] 5.3 Port the typewriter subtitle loop into a `TypewriterSubtitle` client component (`useEffect` + `setTimeout` chain, cleared on unmount)
- [x] 5.4 Port the bat spawner into a `BatSpawner` client component (`setInterval` + `batBusy` guard), cleared on unmount

## 6. Parity Verification

- [x] 6.1 Compare each ported behavior (nav, FAQ, canvas, fog, typewriter, moon phase, spark trail, bats) against the original `script.js` logic line-by-line (no browser available in this environment for live side-by-side visual comparison — verified via code review + structural/build checks instead; flagged to user)
- [x] 6.2 Confirm no console errors/warnings from React StrictMode double-invoking effects (canvas/timers/listeners clean up correctly) — every effect (StarCanvas, MoonPhase, TypewriterSubtitle, SparkTrail, BatSpawner) has a cleanup function that cancels its raf/interval/timeout and removes its listeners, verified by code review
- [x] 6.3 Run `npm run build` and confirm a clean production build with no type errors — `tsc --noEmit`, `next build`, and `eslint` all pass clean

## 7. Cleanup

- [x] 7.1 Remove `index.html`, `script.js`, and the old root `style.css` location once parity is confirmed and the new project is the sole source
- [x] 7.2 Update `README.md` with the new install/dev/build commands
