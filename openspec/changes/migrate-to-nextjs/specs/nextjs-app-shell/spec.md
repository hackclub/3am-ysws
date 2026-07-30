## ADDED Requirements

### Requirement: TypeScript Next.js Project Scaffold
The system SHALL be structured as a Next.js (App Router) project written in TypeScript, with standard configuration (`package.json`, `tsconfig.json`, `next.config.ts`) supporting `npm run dev` and `npm run build`.

#### Scenario: Local development server
- **WHEN** a developer runs `npm install` followed by `npm run dev`
- **THEN** the site is served locally with the same visual output and behavior as the previous static `index.html`

#### Scenario: Production build
- **WHEN** a developer runs `npm run build`
- **THEN** the build completes without type errors and produces a deployable Next.js output

### Requirement: Global Stylesheet Loading
The system SHALL load the existing `style.css` as a single global stylesheet imported once in the root layout, without splitting it into CSS Modules or rewriting its selectors.

#### Scenario: Styles apply unchanged
- **WHEN** the app renders any page
- **THEN** all visual styling matches the pre-migration static site pixel-for-pixel

### Requirement: Font Loading via next/font
The system SHALL load the Inter, JetBrains Mono, and Space Grotesk font families via `next/font/google` instead of external `<link>` tags to Google Fonts, preserving the same weights currently requested (Inter 300/400/500/600/700, JetBrains Mono 400/500/700, Space Grotesk 400/500/600/700).

#### Scenario: Fonts render without external stylesheet link
- **WHEN** the page loads
- **THEN** the three font families render with the same weights as before, and no `<link>` tag to `fonts.googleapis.com` is present in the document head

### Requirement: Page Metadata via Metadata API
The system SHALL define the page title, description, and Open Graph tags using the Next.js Metadata API in the root layout, replacing the static `<head>` tags.

#### Scenario: Metadata present in rendered head
- **WHEN** the page is requested
- **THEN** the rendered `<head>` contains the same title, description, and og:title/og:description/og:type values as the original `index.html`

### Requirement: Local Static Assets
The system SHALL serve the favicon and hero logo image from the project's `public/` directory rather than hot-linking `hackclub.com`'s image optimizer URL.

#### Scenario: Favicon served locally
- **WHEN** the browser requests the site favicon
- **THEN** it is served from the site's own `public/` assets, not from `hackclub.com`
