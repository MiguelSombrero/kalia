# ADR-0067: Every page sits in one sticky bar and one `Page` component, with a Menu button on a phone, so that header and pages share a frame

- **Status:** accepted
- **Date:** 2026-10-04

## Context

Kalia had no shell. The layout held a header and each page built its own
container, mostly by copying one class string (`mx-auto flex min-h-screen
max-w-3xl flex-col gap-6 p-6 sm:p-8`), with `max-w-5xl` on the catalog and
`max-w-md` on sign-up. Nothing shared that string and nothing said the next page
should match it. Every `<main>` was a full viewport tall beneath a header, so
every page scrolled by the header's own height whatever it held (AUD-01). The
header spanned the whole window and lined up with no content beneath it
(AUD-03), wrapped to two rows at 375px (AUD-04), carried no mark (AUD-05) and
offered Sign in and Create an account as small muted text (AUD-11). There was
no footer, and a URL that matched no route got the framework's black default
page outside Kalia altogether (AUD-45).

This was run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)), in three rounds of
mockups at 375×812 and 1280×800 with the real mark, Finnish and English
strings and seeded beers. The identity it sits in is
[ADR-0064](0064-visual-identity-can-art-square.md) and the mark is
[ADR-0065](0065-imagery-icons-and-mark-specimen.md).

## Decision

**Every page renders through a `Page` component inside a layout that owns one
sticky header and one slim footer; the header is a single 56px row that holds
the mark, the three destinations and the visitor's account actions from 1024px
up and a Menu button below that, and the header and every page share one 1024px
frame and its left edge.** This is direction A, "Bar", of the five the product
owner chose between.

- **`Page` is the container.** It renders `<main id="main-content"
  tabIndex={-1}>`, which is the skip link's target (WCAG technique SCR28), and
  takes a width: *text* (768px), *wide* (the whole 1024px frame) or *narrow*
  (448px, for forms and messages). Every width is left-aligned inside the frame,
  so a page title and the wordmark above it start at the same x on every page.
  The class string that built the container now exists in one place, and the
  header imports the frame's classes from the same file rather than restating
  them.
- **A page is as tall as its content, and no taller.** `Page` grows to fill the
  space between header and footer instead of being a viewport tall itself, so a
  short page ends on the footer at the bottom of the window and a long one
  scrolls for its content only.
- **The header stays on screen.** The wordmark is a link home, Home stays in
  the navigation, and the visitor's account actions sit in the bar: Sign in is
  the one filled control and Create an account an outline beside it on a
  desktop; on a phone Sign in is in the bar and Create an account and the
  language switch are in the menu.
- **The phone menu is a disclosure, not a dialog.** A button with
  `aria-expanded` and `aria-controls` shows or hides a panel, Escape closes it
  and returns focus to the button, and following a link closes it. It needs no
  new dependency, so [ADR-0021](0021-design-tokens-ui-primitives.md)'s list of
  behaviour exceptions is unchanged.
- **The footer carries identity and nothing that does a job.** The mark and
  the tagline, and no controls. Language and account live in the header and the
  menu only, so each control has one home.
- **Pages the router cannot find render in the shell.** A catch-all route under
  the locale raises the locale's own not-found page, so a mistyped URL gets
  Kalia's header and footer rather than the framework's default. The error and
  not-found pages sit at the top of a narrow `Page`, not centred in a
  viewport-tall column.
- **The wordmark is a type token.** Capitals at normal width and wide spacing,
  which no existing token describes, so `--text-wordmark` is added to
  `docs/design.md`'s rows with the rule that the display face stays on page
  titles.
- **Below 1024px the phone header is used.** The two agreed widths are 375 and
  1280; the Finnish desktop bar (Sign in, Create an account, language and three
  destinations) needs about 790px beside the mark, so 768px would not fit it.
  Tablets therefore get the Menu button.
- **The `Page` component, not a layout that owns `<main>`, and not a documented
  set of classes.** Decided in refinement; the rejected alternatives are below.

### How each audit finding on this surface was settled

| Finding | Settled |
|---|---|
| AUD-01 pages taller than their content | Fixed: `Page` has no viewport height. |
| AUD-02 three widths with no reason | Fixed: three named widths, each with a stated job. |
| AUD-03 header shares an edge with nothing | Fixed: header and pages share one frame and one left edge. |
| AUD-04 header wraps to two rows at 375 | Fixed: one 56px row, English and Finnish. |
| AUD-05 mark missing from Kalia's own pages | Fixed for the app: mark and wordmark in the header, footer mark. Keycloak is [task 11](../tasks/iteration-7.5/11-keycloak-pages-carry-the-identity.md)'s. |
| AUD-06 targets under 24×24 in the header | Fixed for the shell: every header, menu and footer control is at least 36px, the menu button 44. Page-body targets stay with tasks 07–10. |
| AUD-07, 08, 09 heading scale, typefaces, one rectangle for six things | Not decided here. The scale and typeface are ADR-0064's; what a card means is tasks 07–09's. |
| AUD-10 short pages end where content ends | Fixed: the footer closes every page. |
| AUD-11 sign-in and sign-up are the quietest things | Fixed: Sign in is filled, Create an account outlined. |
| AUD-12 no way home but "Home" | Fixed: the wordmark links home. |
| AUD-13 header says "Test User", the rest say "testuser" | **Not fixed here, deliberately.** The session carries Keycloak's display name only; the username comes from a backend profile call. Showing it in a header on every page needs either a change to how the session is built or a backend call per request, and which of the two names Kalia shows is [task 10](../tasks/iteration-7.5/10-profile-and-sign-up-layout.md)'s decision about identity. The header keeps showing the display name. |
| AUD-45 three not-found pages | Fixed for the framework default, which now renders Kalia's locale not-found page. A missing beer and a missing cellar keep their own pages, owned by [08](../tasks/iteration-7.5/08-catalog-layout.md) and [09](../tasks/iteration-7.5/09-cellar-layout.md). |
| AUD-46 message pages centred in a viewport-tall column | Fixed: they sit at the top of a narrow `Page`. |
| AUD-48 one error page for every route | **Not fixed here, deliberately.** The error page is framed by the shell now, but its wording is copy, which this iteration leaves alone, and the real fix is an error boundary per section so one failed request does not replace the page. That belongs to the layout task that owns each section ([07](../tasks/iteration-7.5/07-front-page-layout.md) for the feed). |
| AUD-49, 50 kept | Kept: nothing scrolls sideways at 375, and the current page is still marked by weight and a bar, not colour alone. |

## Alternatives considered

**B, "Tabs".** A masthead that scrolls away, all three destinations as a ruled
tab row at both widths, a full footer with the language switch, and one 1024px
width for every page. Its strength was that nothing is hidden, so no menu
widget was needed. Rejected for A: the navigation scrolled away on a long page,
a phone's language switch and Create an account lived at the bottom of the
page, and a single width made a feed run 1024px wide.

**C, "Rail".** A bottom tab bar and a top strip on a phone, a 240px left rail
on a desktop, no header and no footer. Rejected for A: a phone lost 112px of
height to two bars, the account showed in two places, the mark lost its
wordmark in the phone strip because Create an account would not fit beside it,
and the rail took 240px that the catalog's columns needed.

**A2, A with B's full footer.** Mark and tagline, the three destinations, the
language switch, and Create an account on a phone. Rejected for A: the phone
menu and the footer then both offered the destinations, the language switch and
Create an account, and the footer measured about 400px on a phone.

**A3, A with a footer of the mark, tagline and destinations.** Rejected for A:
its only job was a second route to links already in the header and the menu,
at about 270px on a phone.

**A `Page` that is a layout.** A layout that owns `<main>` outright, with pages
supplying only their content. Rejected: a page could not say it was wide
without a prop passed up through the layout, and every route's `loading`,
`error` and `not-found` file would need to opt out to render a message.

**A documented set of container classes.** The class string stays copied but is
written down. Rejected: it is the drift this task exists to remove, in a place
no check can see.

**Radix for the phone menu.** A dialog or a navigation-menu primitive.
Rejected: a disclosure needs no focus trap, since the page behind it is not
made inert, and the control is a plain button and a list of links that the
browser handles.

## Consequences

- Good, because a page is a `Page` and a width, and the container, the skip
  link's target and the frame are decided in one component.
- Good, because the header is the same 56px at both agreed widths and in both
  languages, and Sign in is always in it.
- Bad, because the bar is sticky: it takes 56px of every phone screen,
  always, in return for the way home and Sign in never being out of reach.
- Bad, because a phone's destinations are behind a button, one tap further than
  they were, and the menu is a widget with its own keyboard and focus behaviour
  to keep tested.
- Bad, because text pages are 768px in a 1024px frame, so on a desktop the right
  256px is empty on them.
- Neutral, because a URL that matches no route now answers 200 with a
  `noindex` tag, as Next streams a not-found page behind a `loading` boundary,
  where the framework's own default answered 404. Kalia's missing-beer and
  missing-cellar pages already behave this way; a true 404 would need the
  existence check in `proxy.ts` before the body streams.
- Neutral, because between 768 and 1023px the phone header is used, which the
  agreed widths do not verify.
- Neutral, because the header names a person by Keycloak's display name while the
  rest of the app says username, until task 10 decides.
- **Revisit trigger:** a destination added to the navigation, which makes the
  desktop bar wider than 1024px in Finnish and could push the breakpoint up.

## Evidence

Checked in the running app, on Next 16.3.6, by Playwright at 375×812 and
1280×800 (`frontend/e2e/shell.spec.ts` and the surface tour), and by eye in
the desktop app's browser pane at both widths.

**The mockups were measured before the product owner saw them.** Each of the
five was run through 2 widths × 5 pages × signed in and out × English and
Finnish: no horizontal overflow, no control under 24×24, and the not-found page
fitting the frame without scrolling. That check caught one mockup artefact (the
rail 2px taller than its frame) and two wrong numbers in the mockups' own cost
notes (footer heights), both corrected before publishing.

**The built shell, both widths.** The header is no taller than 58px at 375 and
at 1280 in English and in Finnish, so it does not wrap even with *Kirjaudu
sisään* in the bar. Every link, button and input in the header and footer is at
least 24×24, signed out and signed in, with the phone menu open. Four short
pages (an unmatched URL, a missing beer, a missing cellar, a signed-out
cellar) each have a document no taller than the window, and the footer's
bottom edge is the window's bottom edge. The `@axe-core/playwright` scan found
no WCAG 2.1 AA violation on any app page the surface tour visits, and none with
the menu open.

**A sticky header with an open panel is a trap on a short screen.** Found in
review: the open menu has no height of its own, and in a 667×375 window its
last rows were below the fold with nothing to scroll. The panel now caps its
height at the window less the bar and scrolls inside itself. The test asserts
the panel ends inside a 375px-tall window and scrolls (`overflow-y: auto`,
content taller than the box); it was written with the fix and not run against
the uncapped panel.

**`outline-none` does not remove the focus ring from `<main>`.** After a
keyboard skip-link jump, `main#main-content` matched `:focus-visible` and drew
a 2px ring around the whole page column, because Tailwind's utilities live in a
layer and `globals.css`'s `:focus-visible` rule does not, and an unlayered rule
beats a layered one whatever the specificity. The container's own rule in
`globals.css` removes it; the test asserts `outline-style: none` after a
keyboard jump.

**A streamed not-found page answers 200.** `/en/no-such-page` returns 200 with
`<meta name="robots" content="noindex">`, as Next documents for a page streamed
behind a `loading` boundary
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`,
"Status Codes"). `/en/beers/<unknown id>` and `/en/cellars/<unknown>` returned
200 the same way before this change.

**The product owner signed off the built app live** on 2026-10-04, in the
desktop app's browser pane at both agreed widths against the chosen mockup:
"Matches".
