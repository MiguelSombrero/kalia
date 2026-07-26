# ADR-0016: Security response headers via `next.config.ts`

- **Status:** accepted
- **Date:** 2026-07-26

## Context

Iteration 3 task 7 *(Quality backlog 2026-07-23, SHOULD-2)*: no response
carried CSP, X-Frame-Options, Referrer-Policy, HSTS, or Permissions-Policy.
The browser only ever talks to Next.js (the BFF); the backend is never
reached directly, so this is where these headers belong.

Surveying the app before choosing values: no third-party scripts, no
`dangerouslySetInnerHTML`, no inline event handlers, no `next/image` usage.
Fonts (`next/font/google`) are **self-hosted at build time** — confirmed in
`node_modules/next/dist/docs/01-app/01-getting-started/font.md`, not assumed
— so no external `font-src` is needed. The only client-side extra,
`ReactQueryDevtools`, strips from production builds automatically.

**CSP strictness — the one real decision.** Next.js documents two paths
(`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`):

- **Nonce-based**: blocks `'unsafe-inline'` entirely; a fresh nonce is
  generated per request in `proxy.ts` and auto-applied to Next's own
  framework scripts. Requires **all pages to render dynamically** — nonces
  don't exist at build time, so static generation and ISR are unavailable
  wherever the CSP applies. This app's locale-root page is currently
  statically prerendered (`●` in the build output).
- **No-nonce**: a static header set in `next.config.ts`, `'unsafe-inline'`
  required for `script-src`/`style-src` (Next always injects at least one
  inline hydration-data script, regardless of what the app itself writes).
  Keeps static rendering.

**Decided: no-nonce.** With zero inline scripts of our own and no
user-generated content, `'unsafe-inline'` costs little today, and it avoids
forcing the one static page into dynamic rendering for a defense-in-depth
margin this app doesn't yet need. Matches the task's own wording — nonces
require `proxy.ts`, not `next.config.ts`.

## Decision

`next.config.ts`'s `headers()` returns, for every path:

- **`Content-Security-Policy`**: `default-src 'self'` as the baseline;
  `script-src`/`style-src` add `'unsafe-inline'` per the above;
  `img-src 'self' blob: data:`; `font-src 'self'`; `connect-src 'self'`
  (the browser never calls the backend directly); `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'` (matches `SearchFilters`' native
  GET-form submission); `frame-ancestors 'none'`;
  `upgrade-insecure-requests`.
- **`X-Frame-Options: DENY`** — duplicates `frame-ancestors 'none'` for
  browsers that predate CSP2 (2014) or ignore it; `frame-ancestors` is
  authoritative where both are understood.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — full path sent
  same-origin, origin-only cross-origin, nothing on a downgrade to HTTP.
- **`Strict-Transport-Security: max-age=63072000; includeSubDomains`** (2
  years). **No `preload`.** HSTS is only honored by browsers when delivered
  over HTTPS, and this app is currently HTTP-only (`docker-compose.yml`,
  localhost, no TLS) — the header is inert today and takes effect the
  moment a real HTTPS deployment exists, without anyone having to remember
  to add it then. Preload-list submission is a one-way commitment to
  browser vendors that's extremely hard to reverse, and this project has no
  production domain decided yet ([ADR-0006](0006-cellar-first.md)); adding
  it is a decision for whoever picks that domain, not this task.
- **`Permissions-Policy`**: denies the sensitive device/data APIs this app
  doesn't use (`camera`, `microphone`, `geolocation`, `payment`, `usb`)
  rather than relying on the browser's own, looser defaults. Not
  exhaustive — benign UX features (fullscreen, autoplay) are left alone
  rather than pre-emptively denied for something that might reasonably be
  used later.

Scoped to `next.config.ts` only, matching the task's literal wording — the
backend's own direct responses (reachable at `:8080` for Swagger UI) are
out of scope for this task.

## Consequences

- Verified against a running production build, not just a config that
  compiles: `curl -I` confirmed all five headers on a static page
  (`/en`), a dynamic page (`/en/beers`), and a detail page
  (`/en/beers/{id}`); the app was browsed end-to-end (search, sort,
  pagination, detail navigation) with zero CSP violations in the console
  and zero blocked requests in the network log.
- Static rendering is unaffected — the build output still shows `●` (SSG)
  for the locale-root page.
- `async headers() { … }` (object-method shorthand) is a
  `FunctionExpression` under ESLint's arrow-function-only rule
  (`frontend/README.md`) — written as `headers: async () => { … }` instead.
- **Revisit trigger**: once the app takes user-generated content, or once
  Auth/Cellar land and there's real session/user data to protect, the
  `'unsafe-inline'` trade-off should be re-examined against nonce-based CSP
  (or the experimental Subresource-Integrity approach, which keeps static
  generation but is explicitly unstable — not chosen now for that reason).
