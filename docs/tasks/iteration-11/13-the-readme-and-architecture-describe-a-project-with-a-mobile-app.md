# Task 13: The README and the architecture describe a project with a mobile app

- **Status:** needs-refinement
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

## Open questions

- **Module boundaries.** For the tree: add the two packages to it, or point its
  module lines at §3 and reduce §2's layout block to a pointer at the README.
- **Completion signals.** Whether a check should keep the tech stack in step
  with the manifests, or this stays an editing task.
- **Functional scope.** How much of `docs/architecture.md` §8's admin text is
  now built and how much waits for the admin pages of iteration 10.5.

## Acceptance criteria

- [ ] §4 of `docs/architecture.md` states that the web's BFF and the mobile app
      both call the API and what that requires of it
- [ ] `README.md` names the mobile app in its Architecture paragraph, lists
      every technology `mobile/package.json` installs and Maestro, and names
      nginx among the base images
- [ ] The README tree and `docs/architecture.md` §2 and §3 agree, and the test
      that asserts §3's table, `ArchitectureDocumentationTest`, passes
- [ ] No version number is restated outside its manifest in the README's
      overrides note, and the stale sentence in `mobile/README.md` is gone
- [ ] Each smaller item of COULD-122 is corrected, and a search finds no
      `frontend` zone in ADR-0090 or the edge's configuration
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-107, SHOULD-110,
SHOULD-111, SHOULD-113, SHOULD-114 and COULD-122; the open question on the tree
is SHOULD-111's `[needs decision]`.
