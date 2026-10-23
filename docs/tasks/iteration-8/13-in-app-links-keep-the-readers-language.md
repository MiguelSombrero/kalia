# Task 13: Links inside the app keep the reader's language

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

**A Finnish reader following a link inside the app can land on the English
page.** Three in-app links to a public cellar carry no locale: the feed's
username link (`FeedLineRow.tsx`), the profile's "Open" link
(`VisibilityControl.tsx`) and the cellar's "View" link (`CellarView.tsx`). A
visitor reading `/fi` whose browser asks for English is therefore sent to the
English cellar page.
[ADR-0050](../../adr/0050-public-cellar-addressing.md) makes the locale-less
address the one offered for copying, but it never says whether links inside
the app should use it too. The bilingual keyboard walk in iteration-7.5 task
13 found this.

**Switching language drops the current search.** `LocaleSwitcher.tsx:7-15,23`
builds its link from `usePathname()` alone, so `/en/beers?query=ipa` becomes
`/fi/beers`.

**Route knowledge is copied across features, which is why fixing the first
finding takes many edits.** `/cellars/${username}` is built in
`FeedLineRow.tsx:32`, `VisibilityControl.tsx:31` and `CellarView.tsx:39`, and
`/${locale}/beers/${id}` in `FeedLineRow.tsx:50`, `CellarBeerList.tsx:109`
and `cellar/actions.ts:48`. Meanwhile `features/catalog/links.ts:17` owns
`beerHref`. That breaks `frontend/README.md:145-146`: code "moves to lib once a
second feature uses it".

(Quality backlog SHOULD-32, COULD-37 and SHOULD-46.)

## Scope

Every in-app link to a cellar or a beer is built by one shared function and
carries the current locale. The address offered for copying stays
locale-less. Switching language keeps the page's query string.

## Non-goals

- The copied, shareable address. It stays locale-less, as ADR-0050 decides.
- Locale negotiation itself (`proxy.ts`).
- Translating anything new.

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**links inside the app carry the current locale; the address offered for
copying stays locale-less.** This amends
[ADR-0050](../../adr/0050-public-cellar-addressing.md) on the question it left
open ([ADR-0019](../../adr/0019-adr-format-and-conventions.md): amend, do not
rewrite).

- **This Next.js version postdates model training.** Check
  `frontend/node_modules/next/dist/docs/` before using `useSearchParams` in
  the switcher. If it needs a Suspense boundary to avoid opting the page out of
  static rendering, getting that wrong fails silently, and the app still
  builds.
- Feature import boundaries are lint-enforced (`eslint.config.mjs`), and
  shared route builders must sit where every feature may import them.
- Locales come from the validated list, never an `as Locale` assertion
  (iteration-5.5 task 09).

**Decided at refinement, 2026-10-15** (product owner):

- **The switcher carries every query parameter.** On the catalog, every one of
  them is search state. A stale parameter carried onto another page is
  harmless.

## Open questions

**None.**

## Acceptance criteria

- [x] Each of the three cellar links and every in-app beer link points to the
      current locale's page — vitest component tests, confirmed to fail
      against today's links
- [x] The address offered for copying on the profile page is still
      locale-less — vitest test
- [x] Switching language on `/en/beers?query=ipa` lands on
      `/fi/beers?query=ipa` with the same results — Playwright spec
- [x] Cellar and beer hrefs are built in one place, and no feature builds
      them by string concatenation
- [x] `npm test` and `npm run test:e2e` are green, including the bilingual
      keyboard flows

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-32, COULD-37 and
SHOULD-46, all confirmed 2026-10-14. SHOULD-32's `[needs decision]` was
settled while lifting it. SHOULD-46 is merged in because it is what turns
SHOULD-32 from N separate edits into one.
