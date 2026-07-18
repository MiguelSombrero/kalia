# Kalia frontend

Next.js 16 App Router app (TypeScript, Tailwind CSS). Serves the UI and acts
as the BFF: the browser talks only to Next.js, which calls the Spring Boot
API — see [docs/architecture.md](../docs/architecture.md).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 (hot reload)
```

Or the full stack in containers: `docker compose up --build` from the repo
root. The production image uses Next.js standalone output
(`next.config.ts`).

## Test and checks

```bash
npm test           # Vitest + React Testing Library (single run)
npm run test:watch # watch mode
npm run lint       # ESLint
npm run build      # production build (includes type checking)
```

## Conventions

- **Feature-based package structure**: code is organized by feature, not by
  technical type — `features/catalog/`, `features/cellar/`, … each holding
  its own components, hooks and API access. Route files under `app/` stay
  thin and delegate to the feature folder; truly shared code goes to
  `components/` or `lib/` only once more than one feature uses it. Mirrors
  the backend's module-per-subdomain structure.
- Server components by default; `'use client'` only where interactivity
  requires it.
- Component tests live next to the component (`page.test.tsx` beside
  `page.tsx`).
- Note `AGENTS.md`: this Next.js version may differ from an agent's training
  data — check `node_modules/next/dist/docs/` before relying on memory.
