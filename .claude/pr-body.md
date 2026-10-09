## Summary

Implements [iteration 7.5 task 08](../blob/iteration-7.5/catalog-layout/docs/tasks/iteration-7.5/08-catalog-layout.md), the catalog layout, as direction **A3**. The product owner chose it from five built directions across two rounds; the choice is recorded in [ADR-0069](../blob/iteration-7.5/catalog-layout/docs/adr/0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md).

- **Results are one column of ruled rows**, not a three-column grid of cards. Each row has a thin style strip as its only colour, the name, the brewery and style, the strength as the row's figure, and a small **Add** button.
- **Filters have a column of their own on a desktop.** Every field is the same width. On a phone, everything but the name search folds behind a native **Filters** row.
- **One Search button at every width, always last in the form**, so a phone visitor never sees two buttons and has to guess which fields each sends. `SearchFilters` is still a server component.
- **The result count comes first**, with each active filter as a chip that removes it.
- **A beer's page keeps the search that led to it** and links **← Back to results** to that exact search, page included.
- **Beers a signed-in visitor holds show "N in your cellar"** in the list and on the details page. An add from the catalog refreshes the page, so the marker is the confirmation.
- **The details page** keeps the name and brewery, with the style band beside them and four ruled facts. Style and country link back into the filtered catalog with a count, followed by other beers of the same style. **The description is no longer shown.** A backlog entry records that the stored field is now unused and should be removed.
- **The rest of the page:**
  - A page number past the last page now redirects to the last page.
  - Skeletons and the beer not-found page match the new layout.
  - Strength is written with a decimal comma in Finnish.

## Worth a reviewer's attention

- **Sign-off.** The product owner signed off the built page against A3 at both widths on 2026-10-09 ("matches"). They accepted three differences, recorded in ADR-0069:
  - An empty search still uses the shared `EmptyState` box.
  - Finnish strengths use a decimal comma everywhere, the band included.
  - Desktop browsers without `::details-content` (Safari before 18.4, Firefox before 143) show the filters folded behind their summary.
- **Beer URLs carry the search** (`/en/beers/<id>?query=…`), so one beer has as many URLs as there are searches. This is how the way back stays shareable, as the task's URL-state constraint requires.
- **The **Add** button in a row** is visually "Add", with the accessible name "Add to cellar: <beer>" (the visible label opens the name, WCAG 2.5.3). On the details page the button is the full primary *Add to cellar*. `Button` gained a `compact` size for the row button.
- **AUD-22 is left out of this PR:** a signed-out add that finishes after sign-in is a flow change. It is in the backlog.
- **`/code-review` findings:**
  - Fixed now: in browsers without `::details-content`, the desktop filters were unreachable; desktop *Clear all* showed when only the sort was set; the cellar read ran after the search instead of alongside it; the degrade-on-failure helper was duplicated; the query chip used English quotes in Finnish.
  - Skipped: the details page reads the whole cellar to show one count. The same-style rows use the same map, and cellars are small today.
- **Found while running the full e2e suite and left out of this PR:** `profile-visibility.spec.ts` fails intermittently. It reloads before the optimistic visibility save has persisted. That code is untouched here, and it is proposed as its own session.

## Test plan

- [x] `npm test`: all frontend unit suites pass, including new tests for `ResultSummary`, `links`, `formatAbv`, the details page's back link (filtered, paged search → exact URL), skeleton shapes against the shared layout frames, the not-found page, the compact button and `heldBottlesByBeer`.
- [x] `make verify-fast`: green.
- [x] `make verify` (JDK 25): verify-fast, frontend build, `mvn clean verify` (184 backend tests), api-drift and keycloak-check green. In e2e, one assertion in `navigation.spec.ts` still expected a bare beer URL; I fixed it and that spec passes.
- [x] `make frontend-e2e` full reruns: the first rerun had 2 failures in specs this diff does not touch: `shell.spec.ts` (beer not-found page height) passed 3 of 3 when repeated, and `profile-visibility.spec.ts` failed 1 in 3 when repeated, a race in that test. The final full run: **94 passed**.
- [x] New `e2e/catalog-layout.spec.ts` at 375×812 and 1280×800:
  - The count comes before the first beer, which starts on the first screen in English and Finnish, with no sideways scroll.
  - The search form shows exactly one button, with the filters open and closed.
  - Every control on the list and details pages is at least 24×24.
  - Axe passes.
  - A filtered, paged search leads back to itself.
  - Signed in, Tab from a row's link reaches its **Add**: Enter opens the dialog without navigating, Escape returns focus, Shift+Tab and Enter follow the link.
- [x] In the browser pane against the compose stack:
  - Phone catalog: name, folded Filters, one Search, first beer at 382px (was 603px).
  - Desktop: filter column beside the results, chips beside the count.
  - Details page at both widths: band, linked facts, same-style rows, *Back to results* returns to the search.
  - Finnish details: "10,2" in the band and the facts.

## Doc-sync

- **ADR-0069** (new) records every direction shown, the choice, the audit decisions and the sign-off. It is indexed in `docs/adr/README.md` and `docs/architecture.md`.
- **ADR-0021** is amended: its catalog examples no longer wear `Card`'s classes, and the rule stands.
- **`docs/architecture.md` §5:** checked. `SearchFilters` is still a server component. A line now says a decorating read (the cellar marker) is left out when it fails.
- **`docs/design.md`:** a new layout principle, *a form shows one submit button at a time, and it comes last*. No tokens were added.
- **`docs/tasks/backlog.md`:** the unused description field, and AUD-22.
- **`frontend/README.md`:** `BeerDetailsCard` renamed to `BeerDetailsView`. `backend/README.md` is not affected.
- **Task file:** criteria ticked and status `done`, also in the iteration index.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
