---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# Technology Stack

**Analysis Date:** 2026-09-19

## Languages

**Primary:**

- **TypeScript** 5.x - Frontend (React components, utilities, contexts, hooks)
- **JavaScript (ESM)** - Backend (Node.js, Express, services, models)

**Secondary:**

- **HTML5** - Static markup in `index.html`
- **CSS** (Tailwind) - Compiled utility-first styling

## Runtime

**Environment:**

- **Node.js** 18.0.0+ (required per `beacon-backend/package.json`)

**Package Manager:**

- **npm** 9.x or higher (or pnpm 9.x)
- Lockfile: `package-lock.json` (present in repo; backend has separate `package-lock.json`)

## Frameworks

**Core:**

- **React** 18.3.1 - UI library (frontend, peer dependency via `peerDependencies`)
- **React DOM** 18.3.1 - DOM rendering
- **Express** 4.21.2 - HTTP server framework (backend)
- **Socket.io** 4.8.1 - Real-time bidirectional communication (both frontend client `socket.io-client` 4.8.3 and backend server 4.8.1)

**Build & Dev:**

- **Vite** 6.3.5 - Frontend bundler, dev server, and build tool (`@vitejs/plugin-react` 4.7.0)
- **@tailwindcss/vite** 4.1.12 - Tailwind CSS v4 integration for Vite
- **TypeScript** 5.x compiler (`tsc --noEmit` for type checking)
- **Concurrently** 9.2.4 - Runs frontend and backend dev servers in parallel (`npm run dev:all`)

**Testing:**

- Not configured (no Jest, Vitest, or test framework in either package.json)

## Key Dependencies

**Frontend UI & Components:**

- **Radix UI** primitives (multiple packages v1.1.x–2.2.x: accordion, dialog, dropdown-menu, popover, select, etc.) - Accessible, unstyled component library
- **Material UI** 7.3.5 - Material Design component set (`@mui/material`, `@mui/icons-material`)
- **Tailwind CSS** 4.1.12 - Utility-first CSS framework
- **Lucide React** 0.487.0 - Icon library
- **Emotion** 11.14.x - CSS-in-JS for Material UI (`@emotion/react`, `@emotion/styled`)

**Data & Visualization:**

- **Recharts** 2.15.2 - React chart library (analytics dashboards)
- **heatmap.js** 2.0.5 - Heatmap rendering on canvas (`@types/heatmap.js` 2.0.41)

**Forms & Interaction:**

- **React Hook Form** 7.55.0 - Form state management
- **React DnD** 16.0.1 - Drag-and-drop (`react-dnd-html5-backend` 16.0.1)
- **React Resizable Panels** 2.1.7 - Resizable layout panels
- **input-otp** 1.4.2 - OTP input component

**Animation & UI Enhancement:**

- **Motion** 12.23.24 - Animation library
- **Sonner** 2.0.3 - Toast notifications
- **React Slick** 0.31.0 - Carousel/slider component
- **Embla Carousel React** 8.6.0 - Carousel library
- **React Responsive Masonry** 2.7.1 - Masonry grid layout
- **Vaul** 1.1.2 - Drawer component
- **class-variance-authority** 0.7.1 - CSS class utilities
- **clsx** 2.1.1 - classname merging utility
- **tailwind-merge** 3.2.0 - Tailwind class conflict resolution
- **next-themes** 0.4.6 - Theme management
- **cmdk** 1.1.1 - Command palette component

**Utilities:**

- **date-fns** 3.6.0 - Date manipulation
- **react-day-picker** 8.10.1 - Date picker component
- **react-popper** 2.3.0 - Popper positioning
- **@popperjs/core** 2.11.8 - Core positioning engine

**Routing:**

- **react-router** 7.13.0 - SPA routing (note: used as dependency but frontend uses hand-rolled `currentScreen` router in `App.tsx`, not react-router)

**Backend Services:**

- **Mongoose** 8.10.1 - MongoDB ODM/schema validation
- **express-validator** 7.2.1 - Request validation middleware
- **express-rate-limit** 7.5.0 - Rate limiting
- **Helmet** 8.0.0 - Security headers (CSP, CORS, frame-ancestors for Miro)
- **CORS** 2.8.5 - Cross-origin request handling

**Data Export:**

- **exceljs** 4.4.0 - Excel file generation for data export

**Environment & Security:**

- **dotenv** 16.4.7 - `.env` file parsing
- **crypto** (Node.js built-in) - AES-256-GCM encryption for storing sensitive API keys

**Type Definitions:**

- **@types/react** 19.2.14 - React TypeScript definitions
- **@types/react-dom** 19.2.3 - React DOM TypeScript definitions
- **@mirohq/websdk-types** 2.17.2 - Miro Web SDK type definitions

## Configuration

**Frontend:**

`vite.config.ts`:

- React plugin enabled
- Tailwind CSS v4 plugin enabled
- Path alias: `@` → `src/`
- Dev proxy: `/api` and `/socket.io` routes proxied to backend (`http://localhost:3001`)
- Raw asset imports: SVG and CSV

`tsconfig.json`:

- Target: ES2020
- Module: ESNext
- Strict mode enabled (`strict: true`)
- JSX: react-jsx
- Library: ES2020, DOM, DOM.Iterable

`postcss.config.mjs`:

- Empty (Tailwind v4 via `@tailwindcss/vite` auto-configures PostCSS)

**Backend:**

No `tsconfig.json` — backend is plain ESM JavaScript.

`beacon-backend/package.json`:

- `type: "module"` — ESM imports/exports
- Node.js engine constraint: `>=18.0.0`
- Main entry: `src/server.js`

## Build Output

**Frontend:**

- `dist/` — Vite production build (SPA with index.html and assets)

**Backend:**

- No build step; runs as-is in production via `node src/server.js`
- In production, frontend's `dist/` served as static files from backend with SPA fallback (see `server.js`)

## Platform Requirements

**Development:**

- Node.js 18.0.0+
- npm 9.x+ (or pnpm)
- Miro developer account (for OAuth credentials, SDK types)

**Production:**

- Node.js 18.0.0+
- MongoDB instance (SRV URI or Atlas connection string)
- Miro OAuth app credentials (`MIRO_CLIENT_ID`, `MIRO_CLIENT_SECRET`)
- One of: OpenAI API key, OpenRouter API key, Anthropic API key, or custom AI endpoint
- AES encryption key (`ENCRYPTION_KEY` — 64-char hex string)

## Port Configuration

**Development:**

- Frontend: `localhost:5173` (Vite dev server)
- Backend: `localhost:3001` (Express)
- Frontend proxies `/api` and `/socket.io` to backend

**Production:**

- Backend serves both: static frontend at `/`, API at `/api`, WebSocket at `/socket.io`
- Single port (default `3001`, configurable via `PORT` env var)

---

*Stack analysis: 2026-09-19*
