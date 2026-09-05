# ADR-0016: Security response headers via `next.config.ts`

- **Status:** accepted
- **Date:** 2026-07-26
- **Amended:** 2026-07-30 by [ADR-0025](0025-authjs-valkey-adapter.md) — two
  measured properties of this mechanism, unchanged decision: `headers()` here
  is evaluated at build time, so no directive can be driven by a runtime
  environment variable; and `form-action 'self'` blocks a same-origin form
  whose route answers with a cross-origin redirect, which is why the auth
  flow navigates via Server Actions rather than form posts
- **Amended:** 2026-08-23 — the Consequences' revisit trigger fired (Auth and
  Cellar have both shipped); the source survey was re-run and `'unsafe-inline'`
  is re-affirmed, see below
- **Amended:** 2026-09-04 — `next dev`'s `script-src` now also carries
  `'unsafe-eval'`, `next build`/`next start` unchanged, see below
- **Amended:** 2026-09-05 — `upgrade-insecure-requests` is dropped from the
  CSP until a real HTTPS deployment exists; unlike HSTS it is not inert over
  HTTP, see below

## Context

No response carried CSP, X-Frame-Options, Referrer-Policy, HSTS, or
Permissions-Policy. The browser only ever talks to Next.js (the BFF); the
backend is never reached directly, so this is where these headers belong.

Surveying the app before choosing values: no third-party scripts, no
`dangerouslySetInnerHTML`, no inline event handlers, no `next/image` usage.
Fonts (`next/font/google`) are **self-hosted at build time** — confirmed in
`node_modules/next/dist/docs/01-app/01-getting-started/font.md`, not assumed
— so no external `font-src` is needed. The only client-side extra,
`ReactQueryDevtools`, strips from production builds automatically.

The one real decision is CSP strictness, since everything else follows from
the survey above. Next.js documents two paths, and they differ in what they
cost rather than in what they protect against.

Raised as a task in [iteration 3](../tasks/iteration-3.md)
*(Quality backlog 2026-07-23, SHOULD-2)*.

## Decision

**The CSP is the no-nonce variant: a static header set in `next.config.ts`,
accepting `'unsafe-inline'` for `script-src`/`style-src` in exchange for
keeping static rendering.** With zero inline scripts of our own and no
user-generated content, `'unsafe-inline'` costs little today, and it avoids
forcing the one static page into dynamic rendering for a defense-in-depth
margin this app doesn't yet need.

`next.config.ts`'s `headers()` returns, for every path:

- **`Content-Security-Policy`**: `default-src 'self'` as the baseline;
  `script-src`/`style-src` add `'unsafe-inline'` per the above;
  `img-src 'self' blob: data:`; `font-src 'self'`; `connect-src 'self'`
  (the browser never calls the backend directly); `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'` (matches `SearchFilters`' native
  GET-form submission); `frame-ancestors 'none'`;
  `upgrade-insecure-requests` (removed — see the 2026-09-05 amendment).
- **`X-Frame-Options: DENY`** — duplicates `frame-ancestors 'none'` for
  browsers that predate CSP2 (2014) or ignore it; `frame-ancestors` is
  authoritative where both are understood.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — full path sent
  same-origin, origin-only cross-origin, nothing on a downgrade to HTTP.
- **`Strict-Transport-Security: max-age=63072000; includeSubDomains`** (2
  years), without `preload`. HSTS is only honored by browsers when delivered
  over HTTPS, and this app is currently HTTP-only (`docker-compose.yml`,
  localhost, no TLS) — the header is inert today and takes effect the
  moment a real HTTPS deployment exists, without anyone having to remember
  to add it then.
- **`Permissions-Policy`**: denies the sensitive device/data APIs this app
  doesn't use (`camera`, `microphone`, `geolocation`, `payment`, `usb`)
  rather than relying on the browser's own, looser defaults. Not
  exhaustive — benign UX features (fullscreen, autoplay) are left alone
  rather than pre-emptively denied for something that might reasonably be
  used later.

Scoped to `next.config.ts` only, matching the task's literal wording — the
backend's own direct responses (reachable at `:8080` for Swagger UI) are
out of scope for this task.

## Alternatives considered

**Nonce-based CSP.** Blocks `'unsafe-inline'` entirely; a fresh nonce is
generated per request in `proxy.ts` and auto-applied to Next's own framework
scripts. Rejected because it requires **all pages to render dynamically** —
nonces don't exist at build time, so static generation and ISR are
unavailable wherever the CSP applies, and this app's locale-root page is
currently statically prerendered (`●` in the build output). It also does not
match the task's own wording, since nonces require `proxy.ts`, not
`next.config.ts`. Both paths are documented by Next.js in
`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

**Experimental Subresource Integrity.** Keeps static generation while
avoiding `'unsafe-inline'`, which would be the best of both. Rejected because
it is explicitly unstable at this version — not a foundation to put a
security header on.

**HSTS `preload`.** Rejected separately from the header itself:
preload-list submission is a one-way commitment to browser vendors that's
extremely hard to reverse, and this project has no production domain decided
yet ([ADR-0006](0006-cellar-first.md)); adding it is a decision for whoever
picks that domain, not this task.

## Consequences

- Good, because static rendering is unaffected — the build output still shows
  `●` (SSG) for the locale-root page, which was the point of the trade.
- Good, because the HSTS header needs no action at deployment time: it is
  inert over HTTP and correct the moment TLS exists.
- Bad, because `'unsafe-inline'` on `script-src` means the CSP does not stop
  an injected inline script. Nothing in the app can inject one today, so the
  header's XSS value is currently latent rather than real — it protects
  against the classes of attack the other directives cover, not that one.
- Neutral, because `async headers() { … }` (object-method shorthand) is a
  `FunctionExpression` under ESLint's arrow-function-only rule
  (`frontend/README.md`) — written as `headers: async () => { … }` instead.
- **Revisit trigger**: once the app takes user-generated content, or once
  Auth/Cellar land and there's real session/user data to protect, the
  `'unsafe-inline'` trade-off should be re-examined against nonce-based CSP
  (or Subresource Integrity, if it has stabilized by then).

> **Amended 2026-08-23.** The trigger above has fired: iteration 4 shipped
> authentication and iteration 5 shipped the cellar, so there is now real
> session and user data behind `'unsafe-inline'`'s XSS margin. The
> 2026-08-23 quality-backlog triage re-ran the original source survey by
> hand — no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no inline
> `<script>` anywhere in `frontend/` — and found the margin unchanged from
> when this ADR was written. Nonce-based CSP still costs the same trade
> recorded in Alternatives considered (giving up the locale-root page's
> static rendering) and Subresource Integrity is still experimental at this
> Next.js version, so neither alternative's calculus has moved either.
>
> **The product owner's call: re-affirm `'unsafe-inline'`, close the trigger.**
> `react/no-danger` is now an ESLint error (`frontend/eslint.config.mjs`), so
> a future `dangerouslySetInnerHTML` fails `npm run lint` the moment it's
> written instead of waiting to be caught by the next hand-run survey. The
> other three items the survey checks — `innerHTML`, `eval`, an inline
> `<script>` — have no such guard and still depend on the next sweep
> re-running the survey by hand.

> **Amended 2026-09-04.** `next dev` (Turbopack, React 19) reaches an `eval()`
> call on an ordinary page load, not only in the error overlay: React's
> server-components dev client (`createFakeFunction` in
> `react-server-dom-turbopack-client.browser.development.js`) uses `eval` to
> reconstruct server-side call stacks for debugging, and the CSP above blocked
> it, degrading the dev error overlay and training the console to always show
> a violation. This is React's own `eval`, not the app's — the 2026-08-23
> survey's "no `eval` anywhere in `frontend/`" finding still stands. Next.js
> documents the same requirement for every dev CSP example
> (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`):
> `'unsafe-eval'` is needed in development and not in production, since
> neither React nor Next.js use `eval` in a production build.
>
> **The header now diverges by build-time environment.** `script-src` gains
> `'unsafe-eval'` only when `process.env.NODE_ENV === "development"`;
> `next build`/`next start` and the Docker production image are byte-identical
> to before this amendment. `headers()` stays build-time-evaluated
> (2026-07-30 amendment above) — this reads `NODE_ENV` at the same build-time
> point, not as a runtime toggle. The header-building logic moved out of
> `next.config.ts` into `frontend/lib/config/cspHeader.ts` so the two branches
> are unit-tested directly (`cspHeader.test.ts`) rather than only through a
> `curl`/browser check. This is additive to the no-nonce decision above, not
> a reopening of it.

> **Amended 2026-09-05.** `upgrade-insecure-requests` is removed from the CSP
> for now. The Decision added it with the same "costs nothing today, correct
> the moment TLS exists" reasoning as the HSTS header — but that reasoning
> only holds for HSTS, which browsers ignore when it arrives over HTTP. A
> page that carries `upgrade-insecure-requests` is acted on immediately:
> Chrome rewrites the scheme of the page's own requests to `https://`,
> `localhost` included. Served over plain HTTP (`docker compose up`,
> `npm run dev` — the only way this app runs, no TLS anywhere yet), every
> Next.js `<Link>` RSC prefetch and client navigation to
> `https://localhost:3000/…` then fails with `net::ERR_SSL_PROTOCOL_ERROR`,
> and the App Router client crashes decoding the empty response
> (`Cannot read properties of undefined (reading 'startTime')`). The original
> Evidence run missed this because it only checked headers with `curl` and
> browsed within a page; the failure is on the *next* navigation.
>
> The directive returns together with the HTTPS deployment work — the same
> milestone that decides the production domain, revisits HSTS `preload`, and
> the point at which it stops being inert-versus-harmful and starts doing its
> job. `buildCspHeader` now emits it in no environment; `cspHeader.test.ts`
> guards its absence. `X-Frame-Options`, `Referrer-Policy`, HSTS and
> `Permissions-Policy` are unchanged.

## Evidence

Verified against a running production build, not just a config that
compiles: `curl -I` confirmed all five headers on a static page (`/en`), a
dynamic page (`/en/beers`), and a detail page (`/en/beers/{id}`); the app was
browsed end-to-end (search, sort, pagination, detail navigation) with zero
CSP violations in the console and zero blocked requests in the network log.
