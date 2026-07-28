# Iteration 4 — Authentication (Keycloak)

Goal: users can sign in; personal features become possible.

1. [x] Keycloak + Valkey in docker-compose, realm export committed
2. [ ] Next.js: OIDC Authorization Code + PKCE flow, Valkey-backed session, sign-in/out UI
3. [ ] Spring Boot as OAuth2 resource server; `identity` module resolves the current user; catalog endpoints stay public
4. [ ] Playwright E2E: sign in, see own name in the UI, sign out

**Done when:** a user can sign in and out; the backend knows who is calling on protected endpoints; browsing needs no account.
