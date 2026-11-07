# Shared packages

Two npm workspaces that the web app and the mobile app both import, so the API
contract and the translations each have one copy
([ADR-0092](../docs/adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)).
Each ships TypeScript source — `exports` point at `.ts` files, with no build
step and no `dist/` — and the importing app compiles it. A package imports
nothing of `web/` or `mobile/` and nothing from `react-dom`, `next` or
`react-native`; `npm run lint` in each package fails on it.

| Package | Directory | Holds |
| --- | --- | --- |
| `@kalia/api` | `api/` | the API types and TanStack Query client generated from `backend/openapi.json`, and the platform-neutral fetch core |
| `@kalia/locales` | `locales/` | every string, `en` and `fi`, in `src/{en,fi}/common.json` |

## `@kalia/api`

- **Regenerate** with `make api-drift` from the repository root, or
  `npm run generate --workspace @kalia/api`. It reads `backend/openapi.json`, so
  it needs neither Docker nor a running backend
  ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
  After changing the API, `make openapi-spec` first rewrites that file from what
  the application serves. Never hand-edit `src/generated/`.
- **An API enum value is looked up through `enumLookup()`**, never a bare
  `Record`: the backend only adds values, so an installed app meets ones its
  build never saw. `enumLookup<E, V>(entries, fallback)` returns a function
  that answers `fallback` for an unlisted value; labels use
  `UNKNOWN_VALUE_LABEL_KEY` ("Other" in `en`, "Muu" in `fi`). The
  `kalia/no-closed-enum-map` rule (`eslint/enum-lookup-rules.cjs`, loaded by
  the web and mobile configs) fails a `Record` or mapped type keyed by a type
  imported from a `types` or `api` file or the generated client
  ([ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
- **The generated client calls a transport the app registers once at startup**,
  with `registerTransport()`; a call before that throws. `createFetchTransport()`
  is the core: base URL, timeout, JSON parsing, a non-2xx status returned
  rather than thrown, and the typed `ApiError` of
  [ADR-0023](../docs/adr/0023-typed-api-failures.md). The app supplies where the
  access token comes from and, optionally, how a call without its own
  `traceparent` gets one, and wraps the core with what is its own. A failure's
  `ApiError` names the call's trace id, and `httpFailure()` makes the same of an
  unexpected status. The web's
  is `web/lib/api/mutator.ts`, registered in `web/instrumentation.ts`.
- **What CI checks:** the backend's `CommittedOpenApiSpecIT` (the committed spec
  is the served one), the `api-client-drift` job (`make api-drift`: the committed
  client is what the spec generates), and the `api-breaking-change` job
  (`scripts/check-api-breaking.mjs`: `oasdiff` against `dev`'s spec, which
  `make verify-fast` also runs before a push, so install it with
  `brew install oasdiff`), advisory until the app is distributed beyond the
  product owner's own phone. Once it fails, a removal of
  an element `dev` already marks `deprecated` needs a line in
  `backend/openapi-breaking-ignore.txt` naming the minimum supported app build
  that excludes its last user. A new `oneOf` member in a 4xx or 5xx response
  body passes without one; in a 2xx body it fails.

## `@kalia/locales`

`src/index.ts` exports `resources` (every language, for i18next's `resources`
option), `locales` and `defaultLocale`. `@kalia/locales/load` exports
`loadResource` (one language on demand, for a backend) and is a file of its own
because Metro refuses its dynamic `import()`, so the app must not reach it
through the index. Each app
initialises i18next itself. `src/keys.test.ts` fails on a key present in one
language and not the other.

## Tests

`make packages-test` runs both packages' Vitest suites, and `make lint` their
lint. `api/platform-neutrality.test.ts` lints the committed violating fixtures
in `eslint-fixtures/neutrality/` as if they sat in either package, so the
neutrality rule in `eslint.config.mjs` is shown to still fire; a new pattern
there needs a fixture too.
