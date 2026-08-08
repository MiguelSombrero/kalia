# Backlog

Unscheduled work — not yet assigned to an iteration.

Product ideas the [vision](../../README.md) names but nothing is being built
on. None of these is a decision anyone is making yet, which is why none of them
has an ADR ([ADR-0032](../adr/0032-when-a-decision-earns-an-adr.md)):

- **Beer ratings, sourced from elsewhere.** A 1–5 average from an existing beer
  platform (Untappd, Pint Please, …), shown on a beer. Kalia never collects
  reviews itself — that boundary is settled and is in the vision. Which source,
  and whether one is available on acceptable terms, is not.
- **Where to buy.** A beer's page listing shops that stock it, and what they
  charge. Entirely dependent on whether beer retailers publish usable APIs;
  distant. Kalia links out and does not sell — there is no basket, no checkout
  and no payment in this idea.
- **Likes and comments on feed events**, once the feed
  ([iteration 7](iteration-7.md)) exists.
- Recommendations ("if you liked this IPA…")
- Following other users, so a feed can be personal rather than global
- Admin UI + role-based access for catalog management

Engineering work:

- Observability: structured logs, metrics, tracing
- Deployment target + IaC
- GDPR: account deletion, data export, and the consent story — becomes real
  the moment anyone but the author uses this
- Search engine — PostgreSQL full-text is fine at this size; OpenSearch only if
  faceted search outgrows it
- **A failing token refresh is silent.** `frontend/lib/auth/refreshAccessToken.ts`
  returns `unavailable` and the caller sends no token, so a Keycloak outage
  looks exactly like ordinary anonymous browsing — nothing logs, nothing
  counts it ([ADR-0029](../adr/0029-silent-token-refresh.md)). Found while
  building refresh; deliberately not fixed there, because the frontend has no
  logging convention at all and inventing one for a single call site is the
  wrong place to settle it. Belongs with the structured-logs item above.
- **401 responses carry no body**, unlike every other error in the API, which
  is RFC 9457 problem+json (`docs/architecture.md` §4,
  [ADR-0014](../adr/0014-shared-exception-handling.md)). Spring Security's
  `BearerTokenAuthenticationEntryPoint` answers with headers only — found
  while verifying [ADR-0028](../adr/0028-resource-server-and-current-user.md).
  Not urgent: the frontend already handles a bodyless error response. **The
  trap when fixing it:** that entry point sets the `WWW-Authenticate` header
  RFC 9110 requires on a 401, and a naive `ProblemDetail` replacement carries
  no headers and would silently drop it — the identical defect ADR-0014
  records for the 405 `Allow` header. Any fix needs a test pinning both the
  body and the header.
- **The Keycloak realm export is hardcoded to localhost**, and one of the
  hardcoded values is a credential. `keycloak/realm-export.json` pins the
  `kalia-frontend` client's `redirectUris`, `webOrigins` and
  `post.logout.redirect.uris` to `http://localhost:3000`, `sslRequired` to
  `none`, the client secret to `kalia-dev-secret` in plaintext, and
  `testuser`'s password to `testuser123` — so the realm cannot be imported
  anywhere but a dev machine, and the committed secret plus a known-password
  account become live credentials the moment it is. Blocks the deployment
  item above. Keycloak's startup import resolves `${VAR}` placeholders from
  environment variables, which lets one committed file serve every
  environment with the values supplied per deployment; the compose service
  would then carry today's literals as its own environment
  ([docker-compose.yml](../../docker-compose.yml)), leaving local development
  unchanged. **The trap when fixing it:** a placeholder that does not resolve
  does not necessarily stop the server — depending on how the importer treats
  it, the realm either fails to import or imports with the literal
  `${KALIA_FRONTEND_URL}` as its redirect URI, and both leave a *healthy*
  Keycloak serving a realm that silently rejects every sign-in. Compounding
  it, `--import-realm` skips a realm that already exists, so a second attempt
  against the same database changes nothing. Any fix has to be verified from
  an empty database (`docker compose down -v`) with an automated check that
  the imported realm's redirect URI matches the configured frontend origin —
  asserting the container started proves nothing.
