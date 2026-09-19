/**
 * Which catalog card each spec adds to the cellar.
 *
 * Specs sharing a worker share one Keycloak account, so they share its
 * cellar. add-to-cellar asserts exact bottle deltas on its two cards, which
 * only holds while no other spec touches them — the separation is a real
 * contract between these files, kept here so it is visible in one place
 * instead of as a comment in each of them.
 */
export const CATALOG_CARD = {
  /** add-to-cellar.spec.ts — asserts exact before/after bottle counts. */
  addFromList: 0,
  /** add-to-cellar.spec.ts — opened via its detail page. */
  addFromDetail: 1,
  /** public-cellar.spec.ts — only needs the cellar to be non-empty. */
  publicCellar: 6,
  /** front-page-feed.spec.ts — only needs its own addition to be findable. */
  frontPageFeed: 12,
  /** live-front-page.spec.ts — only needs its own addition to be findable. */
  liveFrontPage: 13,
} as const;

// bottle-future-date.spec.ts deliberately borrows `addFromList` rather than
// claiming a card: it needs the *first* card only incidentally, and it
// removes the bottle it added before finishing. Its cleanup is what keeps
// add-to-cellar's exact deltas true, so do not drop it.
