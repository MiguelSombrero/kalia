# Task 13: The README and the architecture describe a project with a mobile app

- **Status:** done
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

Mobile is Kalia's primary UI, and the two documents a newcomer reads first still
describe a web-and-backend project. The findings of the 2026-11-05 sweep:

- **The API's callers** (SHOULD-107). `docs/architecture.md` §4 says the web app
  is the API's only caller, so "endpoints are client-agnostic resources" holds
  by circumstance. The app has called `/beers`, `/profile` and `/app-config`
  directly since iteration 9
  ([ADR-0095](../../adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md));
  the rule is load-bearing now.
- **The README** (SHOULD-110). Its Architecture paragraph presents the BFF as
  the whole client story; its tech stack breaks its own "add a technology when
  you add it to a manifest" rule for everything `mobile/package.json` installs
  and for Maestro; "Development approach" names only Playwright for user flows;
  the base-image list omits nginx.
- **The tree** (SHOULD-111). The README's repository tree lists the backend
  modules without `appconfig/` or the module-neutral `web/`, though §3's table
  is the module list's home, and the workspace layout is stated both there and
  in §2.
- **Version numbers** (SHOULD-113). The npm-overrides note records "the latest"
  version of `next` and a `sharp` line, which go false on the next release and
  restate the manifests.
- **A promise made too early** (SHOULD-114). `mobile/README.md` says two `make`
  targets "appear when it merges"; both exist.
- **Smaller staleness** (COULD-122). ADR-0002's amendment lists the modules
  without `appconfig`; `docs/architecture.md` says only `edge` is published, though the dev
  overlay publishes postgres, valkey and mailpit; §8 describes unbuilt admin
  behaviour beside text about `make moderate`; ADR-0090's rate table names a
  `frontend` zone that `edge/nginx.conf` calls `web`; the ADR index and
  `keycloak/README.md` have small omissions.

## Scope

Each statement is corrected to what the repository does, each fact kept at its
one home with pointers from elsewhere, and no version number is restated away
from its manifest.

## Non-goals

- Documenting what iteration 11 changes; its tasks update the documents they
  touch.
- The backlog's mobile section (`docs/tasks/backlog.md`), which is a different
  document with decisions to make.
- Restating facts that other findings already name as duplicated.

## Constraints

- Each documented fact has one home — ADRs *why*, `docs/architecture.md`
  *shape*, READMEs *how*
  ([ADR-0020](../../adr/0020-documentation-roles.md)).
- A version is recorded in its manifest and nowhere else.
- §3's table is asserted by `ArchitectureDocumentationTest`; a change to it
  changes the test.
- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

**Decided at refinement, 2026-11-07** (product owner):

- **The README tree is the home of the layout:** it shows the top-level
  directories, `packages/` included, and points at §3's table for the backend
  modules; §2's layout block becomes a pointer to the tree.
- **The tech stack is kept in step with the manifests by editing;** no check
  is added.
- **`docs/architecture.md` no longer mentions `make moderate`,** which
  iteration 10.5 replaced: that part of COULD-122 is confirmed and dropped.

## Open questions

**None.**

## Acceptance criteria

- [x] §4 of `docs/architecture.md` states that the web's BFF and the mobile app
      both call the API and what that requires of it
- [x] `README.md` names the mobile app in its Architecture paragraph, lists
      every technology `mobile/package.json` installs and Maestro, and names
      nginx among the base images
- [x] The README tree names `packages/` and points at §3 for the backend
      modules, §2's layout block is a pointer to it, and the test that asserts
      §3's table, `ArchitectureDocumentationTest`, passes
- [x] No version number is restated outside its manifest in the README's
      overrides note, and the stale sentence in `mobile/README.md` is gone
- [x] Each smaller item of COULD-122 is corrected, and a search finds no
      `frontend` zone in ADR-0090 or the edge's configuration
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-107, SHOULD-110,
SHOULD-111, SHOULD-113, SHOULD-114 and COULD-122; the open question on the tree
is SHOULD-111's `[needs decision]`.
