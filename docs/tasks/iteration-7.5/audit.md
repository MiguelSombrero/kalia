# Iteration 7.5 audit — the app as it stands

A snapshot, written for [task 02](02-design-audit-baseline.md) and dead once
iteration 7.5 ends. It describes Kalia as `dev` had it on 2026-10-02 (commit
`270b3a7`), at the two agreed widths, **375×812** and **1280×800**. It records
what is wrong and never what to do about it: what replaces a bad layout is
[task 03](03-visual-identity.md) onwards.

## How to read it

**IDs are permanent.** `AUD-NN` is never renumbered or reused. A finding that
is dropped keeps its row and is marked *dropped* with the reason, so a later
task's citation never goes stale. That is the rule
[the quality backlog](../quality-backlog.md) follows.

**Kind** is one of:

- **problem** — a visual or usability defect in something that exists.
- **product** — a flow that is missing a step, rather than a control that is
  hard to use.
- **keep** — something deliberately right, recorded so the redesign can show it
  kept it on purpose rather than by accident.

**Seen at** names the surface and width. *Both* means both agreed widths.
*Cross-page* marks a finding no single surface shows: it was found by
comparing pages, which is why a task scoped to one page could not have found
it.

**Who answers for a finding** is the task that owns the surface, per the
iteration's [DW-5](../iteration-7.5.md). A cross-page finding is answered by
the task that owns the part of the app where the difference is decided, named
in its row.

| Surface | Task |
|---|---|
| Shell: header, content width, page height, generic error and not-found | [06](06-page-shell.md) |
| Front page | [07](07-front-page-layout.md) |
| Catalog list, beer details, their loading, empty and not-found states | [08](08-catalog-layout.md) |
| Own cellar, public cellar, their dialogs and prompts | [09](09-cellar-layout.md) |
| Profile, Kalia's sign-up page | [10](10-profile-and-sign-up-layout.md) |
| Keycloak's login and registration pages | [11](11-keycloak-pages-carry-the-identity.md) |

## How it was gathered

Each surface was opened in the desktop app's browser pane at both widths,
signed out and signed in as the seeded dev account, against this worktree's
own compose stack. Sizes were read from the rendered DOM rather than estimated.
Nothing here is a screenshot and none was committed. The committed evidence
that every surface exists and renders is
[`frontend/e2e/surface-tour.spec.ts`](../../../frontend/e2e/surface-tour.spec.ts).

What was **not** observed, so a reader does not assume it was:

- The loading frame of any surface. The skeleton findings (AUD-47) compare the
  skeleton's source with the sizes of the real content, not a captured frame.
- The last few desktop checks (sign-up, the out-of-range catalog page, the
  `?page=abc` error page) ran at the browser pane's own 1024px width, not 1280,
  after the pane's emulation was reset. Each sits in a fixed-width column
  (`max-w-md`, `max-w-5xl`, `max-w-3xl`), so nothing in them changes between
  1024 and 1280.
- Finnish was spot-checked on the cellar at 375 only. Every other finding is
  from the English UI.
- Keycloak's other pages (password reset, email verification) are
  [task 11](11-keycloak-pages-carry-the-identity.md)'s to inventory; this audit
  covers the two the iteration index names.

The empty-feed, empty-cellar and empty-search states were seen on a fresh
database; the populated ones after adding five beers through the UI with the
cellar set public.

The error state was reached by stopping the backend (AUD-16, AUD-48), and
reproduces without that: `/en/beers?page=abc` renders the same error page, a
mistyped query string rather than a failure the visitor could have caused
anywhere else. The tour spec uses that URL as its only deterministic way in.

## Across pages

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-01 | problem | Cross-page, both | Every Kalia page is taller than the viewport whatever it holds. Each `<main>` is a full viewport tall *beneath* the header, so the document measures 852px at 1280×800 and 900px at 375×812 on a page with one heading and a sentence, and scrolls by the header's own height. Seen on the front page, cellar, profile, a beer's details, sign-up, the not-found pages and the error page. Only the catalog is longer for a real reason. Owner: 06. |
| AUD-02 | problem | Cross-page, 1280 | The content column has three widths with no stated reason: 768px on the front page, a beer's details, both cellars, profile, the not-found and error pages; 1024px on the catalog; 384px on sign-up. Moving catalog to a beer's details moves the content's left edge from 121px to 249px. Owner: 06. |
| AUD-03 | problem | Cross-page, 1280 | The header spans the whole window and shares an edge with no content beneath it: its nav starts at x≈10 while content starts at x=121, 249 or, on sign-up, further in. The header and the page read as two unrelated things. Owner: 06. |
| AUD-04 | problem | Cross-page, 375 | The header wraps to two rows, 88px of the 812, before any content. Navigation is on the first row and account and language on a second that ends at about two thirds of the width, so the block has a ragged right edge. Signed out, signed in and in Finnish all do this. Owner: 06. |
| AUD-05 | problem | Cross-page, both | The mark is on the pages Kalia does not own and missing from the ones it does. Keycloak's login and registration show a glass icon beside a serif wordmark; Kalia's own header has neither. The name appears only as the front page's heading, and the favicon is still the one from the project skeleton commit. Owners: 06, 11. |
| AUD-06 | problem | Cross-page, both | Text links and small controls are far below the 24×24 target the iteration set. Header: Home 39×20, Catalog 52×20, Cellar 38×20, Sign in 45×20, Create an account 121×20, the username link 85×20, Sign out 54×20, EN 19×20, **FI 12×20**. Elsewhere: "← Back to catalog" 20px tall, every beer name link in the catalog 20px tall, "Make your cellar public" 17px, "Back to your cellar" 17px, "View your public cellar" 20px, the visibility radios and the age checkbox 13×13, and on Keycloak "Forgot Password?" 111×19, "Register" 59×22 and "« Back to Login" 112×22. Owners: 06, 07, 08, 09, 10, 11. |
| AUD-07 | problem | Cross-page, both | The heading scale is two sizes and an exception. Every page title is 30px Fraunces except the front page's, which is 24px; the beer names in catalog cards are 16px Inter semibold, the same size as body text; the same beer is a 16px `h2` in the catalog, a 30px `h1` on its details page and a plain button label with no heading in the cellar. Keycloak's titles are 28px Red Hat Display at weight 400 against the app's weight 700. There is nothing between 30 and 16. Owners: 06, 07, 08, 09. |
| AUD-08 | problem | Cross-page, both | A visit crosses four typefaces. Kalia sets headings in Fraunces and everything else in Inter; Keycloak sets its title in Red Hat Display and its body in Red Hat Text, with only the wordmark in Fraunces. Sign in and the front page do not look like the same product's type. Owners: 11, and 03, which decides the type. |
| AUD-09 | problem | Cross-page, both | One white bordered rectangle stands for six different things: a catalog result with an action in it, a feed entry, an expandable cellar row, the panel of facts on a beer's details, the owner's "this is how others see your cellar" banner, and (dashed, with more padding) every empty and sign-in prompt. Nothing tells a visitor which of these is a thing to open, a thing to read or a thing to act on. Owners: 07, 08, 09. |
| AUD-10 | problem | Cross-page, both | Short pages end where their content ends. On the front page, a beer's details, the profile, sign-up and the empty cellar, half or more of the viewport below the content is empty cream and nothing closes the page: no footer, no repeated navigation, no mark. Owner: 06. |

## Header and shell

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-11 | problem | Both | The two ways into the product are the quietest things in the header. "Sign in" (a button) and "Create an account" (a link) are styled identically, in small muted text, and look like each other; neither differs from the three navigation links. On the pages that most need a visitor to sign in, the header offers them at the lowest weight on the page. Owner: 06. |
| AUD-12 | problem | Both | "Home" is the only way back to the start, there is no wordmark to return to it, and its label is the same size as every other nav item. Owner: 06. |
| AUD-13 | problem | Both | The signed-in header names a person "Test User" while the profile, the public cellar's title and the front-page feed name the same person "testuser". Two names for one identity appear in one visit, and nothing says which one other people see. Owner: 10 (profile), 06 (header). |

## Front page

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-14 | product | Both, signed out | A signed-out visitor is offered no route into the product on the front page itself. What Kalia is takes one 14px line under a 24px name, and joining is the header's 121×20 link. A new visitor sees either "Nothing here yet" or strangers' activity with no sentence about what they are looking at. Owner: 07. |
| AUD-15 | problem | Both, signed in | A feed entry has no internal hierarchy. Who, what and when are one sentence of the same weight in a card, five of them stacked identically; only the username is a link, the beer's name is not, and nothing in the entry is an image. Owner: 07. |
| AUD-16 | problem | Both | If the feed request fails the whole page is replaced by the generic error page, heading included. A failure in one section takes down the page, and nothing says which page it was. Seen by stopping the backend. Owner: 07 (and 06 for the error page itself, AUD-48). |
| AUD-17 | problem | 1280 | The front page above the fold is a heading, a tagline and a short list in a 768px column on a 1280px window: cream margins either side and, below the list, empty space down to the fold. Owner: 07. |

## Catalog list

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-18 | problem | 375 | The filters push the results off the first screen. Five stacked fields plus a sort and a button make the form 407px tall; the first beer begins at y=603 of 812, so the first screenful is a form. The page is 4233px, about five screens, and "Page 1 of 3 (54 beers)" appears only at the very bottom. Owner: 08. |
| AUD-19 | problem | 1280 | The filter row wraps unevenly. Five fields share one row; "Sort by" and the only primary button drop to a second row on their own, left-aligned and away from the search field they act on. Owner: 08. |
| AUD-20 | problem | Both | The catalog's dominant, most repeated control is "Add to cellar". All 20 cards on a page carry the same outline button (119×38 at 375), as heavy as anything else on the card, while the way to a beer's own page is a 20px-tall link of its name. The card as a whole is not a target. Owner: 08. |
| AUD-21 | product | Both, signed in | Adding a beer to the cellar from the catalog confirms nothing and changes nothing. The dialog closes; no message appears two seconds later; the card is identical to the one beside it. A visitor cannot tell whether the add worked, or which beers they already hold. The beer's details page is the same for a beer in the cellar and one that is not. Owner: 08. |
| AUD-22 | product | Both | A visitor who clicks "Add to cellar" signed out is sent straight to Keycloak's sign-in page with no word on why. After signing in they land back on the beer's page with nothing added; they have to find the button and click it again. Owner: 08. |
| AUD-23 | product | Both | "← Back to catalog" on a beer's details goes to the unfiltered first page, so a visitor loses their query, filters and page. Task 08 already carries a fix for this one; it is recorded so the audit and the task agree it was a finding. Owner: 08. |
| AUD-24 | product | Both | The number of results is shown only at the bottom, in the pagination summary. Task 08 carries this one too. Owner: 08. |
| AUD-58 | problem | Desktop | An out-of-range page contradicts itself. `?page=999` shows "No beers match your search." above a summary reading "Page 1000 of 3 (54 beers)": the page says both that nothing matches and that 54 beers exist. Owner: 08. |

## A beer's details

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-25 | problem | Both, signed in | The same control changes shape with sign-in state. Signed out, "Add to cellar" is a small intrinsic-width button; signed in it stretches to the full width of the column: 704px at 1280, 327px at 375. Owner: 08. |
| AUD-26 | problem | 1280 | The page is a title, a line, a button, a two-fact panel and a sentence, then roughly 480px of empty cream. The panel is the full column wide and holds two short facts packed to its left edge. Nothing on the page is visual. At 375 the same content fits one screen. Owner: 08. |
| AUD-27 | problem | Both | The only navigation back is a 12–14px underlined text link above the title, 20px tall. Owner: 08. |

## Own cellar

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-28 | problem | 375 | The cellar row collapses. Title, brewery, style chip, ABV chip and bottle count share one line, so the title column shrinks to about 60px: "Duvel Tripel Hop Citra" wraps to four lines of one word, and the brewery name is overlapped and clipped by the style chip ("Sierra Nevad…" under "Barleywine", "Four…" under "Oatmeal Stout"). Row heights on one screen run from 112 to 160px. Finnish does the same. The public cellar uses the same row and has the same fault. Owner: 09. |
| AUD-29 | problem | Both | Bottles are indistinguishable when no dates were entered. Three bottles of one beer expand into three identical "Bottle" lines, each with Edit and Remove; in the public cellar, three bare "Bottle" lines. Owner: 09. |
| AUD-30 | product | Both | The empty cellar says it is empty and gives no way to fill it. The only way to put a beer in is a button on a catalog card; the empty state does not link to the catalog and the cellar page has no add action of its own. Owner: 09. |
| AUD-31 | product | Both | A cellar row leads nowhere. It is an expand-and-collapse toggle only; nothing in it links to the beer's details page, and the page has no total. Owner: 09. |
| AUD-32 | product | Both | The cellar page does not say who can see it or how to share it. Visibility and the link to the public view live only on the Profile page. Owner: 09. |
| AUD-33 | product | Both, signed out | The sign-in prompt on Cellar and on Profile offers "Sign in" and nothing for a visitor with no account; creating one is only the header's 121×20 link. Owners: 09, 10. |

## Public cellar

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-34 | product | Both | A stranger arriving by link learns whose cellar it is from the title alone: a username, with no name, no summary and no sign of when it last changed. Nothing says what Kalia is or where the rest of it is. Owner: 09. |
| AUD-35 | problem | 375 | The row fault of AUD-28 applies in full; the owner sees the same cramped list a stranger sees. Owner: 09. |

## Profile

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-36 | problem | Both | The profile is a heading, a username, two radio buttons and one sentence: about a quarter of the screen at 375. The username — the thing the page is about — is the smallest, lightest text on it. The radios are the browser's native 13×13 control in the browser's default blue, not the app's green. Owner: 10. |
| AUD-37 | problem | Both | The visibility choice takes effect on selection with no label that it was saved; the only response is the explanatory sentence changing, and the consequence it names ("your additions appear on Kalia's front page") is a clause in that sentence. Owner: 10. |

## Sign-up

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-38 | problem | Both | The page is a heading, a paragraph, a 13×13 checkbox and a button in a 384px column, narrower than any other page's. It carries none of the sign-up itself: the form it leads to is on another site's page. Owner: 10. |
| AUD-39 | product | Both | The page tells the visitor they will "set your email and password, and pick a username" on Keycloak's page next, and names the vendor. The registration page that follows asks for username, email, first name and last name, and no password. What was promised and what appears differ. Owner: 10, 11. |

## Keycloak login and registration

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-40 | problem | 1280 | The two pages place their card differently. The login card is vertically centred (top at y=113); the registration card starts at the top (y=24) and is 9px taller than the window, so the page scrolls by 9px. Both are a ~360px card in a window 1280 wide with no relation to Kalia's 768 or 1024 columns. Owner: 11. |
| AUD-41 | problem | Both | A language dropdown sits inside the card above the form, listing English and Finnish, although the visitor arrived with the language already chosen in Kalia. At 375 it takes a full-width row above the first field. It is a second language control that looks nothing like Kalia's EN/FI toggle. Owner: 11. |
| AUD-42 | problem | Both | The registration page's document title is "Sign in to Kalia", the same as the login page's. Owner: 11. |
| AUD-43 | product | Both | Neither page links back to Kalia. The wordmark is not a link and the only links are "Forgot Password?", "Register" and "« Back to Login"; the way out is the browser's back button. Owner: 11. |
| AUD-44 | problem | Both | The login page's links are small: "Forgot Password?" 111×19, "Register" 59×22. The primary action and the fields are comfortably sized. (Counted under AUD-06 too.) Owner: 11. |

## Loading, error and not-found states

| ID | Kind | Seen at | What is wrong |
|---|---|---|---|
| AUD-45 | problem | Cross-page, both | Three different not-found pages. A missing beer and a missing cellar each get a Kalia page with a heading, a sentence and a link back (to the catalog and to the front page respectively); any other URL under a locale, such as `/en/no-such-page`, gets the framework's default: a black page, system font, a "404" beside "This page could not be found.", no header, no Kalia anywhere. Owners: 06 (the default), 08, 09. |
| AUD-46 | problem | Both | The message pages (error and both not-found pages) centre their text in a viewport-tall column beneath the header, so the message sits at about the middle of the window and the page scrolls by the header's height (see AUD-01). Owner: 06. |
| AUD-47 | problem | Both | Skeletons do not match what replaces them, judged from `BeerListSkeleton`, `CellarListSkeleton` and `FeedSkeleton` against measured content. The cellar skeleton draws four 56px rows where real rows are 68px at 1280 and 112–160px at 375; the feed skeleton draws 64px cards where real ones are 92px at 375; the catalog skeleton draws 112px cards where real ones are 162px at 375, and five small blocks where the form is a 407px stack. The page jumps when content arrives. The loading frame itself was not captured. Owners: 07, 08, 09, 10. |
| AUD-48 | problem | Cross-page, both | One error page serves every route. The catalog, the front page and the cellar, with the backend stopped, showed the same heading, sentence and button. It names neither the page nor what failed, and replaces the whole page rather than the part that broke. Owner: 06. |

## Kept on purpose

| ID | Kind | Seen at | What is right |
|---|---|---|---|
| AUD-49 | keep | Both | No page scrolls sideways at 375. Every surface measured has a document width of exactly 375 (Finnish spot-checked on the cellar). |
| AUD-50 | keep | Both | The current page is marked in the navigation by weight and underline, not by colour alone, at both widths. |
| AUD-51 | keep | Both | Every filter on the catalog has a visible label rather than a placeholder standing in for one. |
| AUD-52 | keep | Both | An empty search says so and offers "clear all filters" in the same place. |
| AUD-53 | keep | Both | The add-bottle dialog fits 375×812 without scrolling, with 38px-tall controls. |
| AUD-54 | keep | Both | The cellar's Edit and Remove buttons are 38px tall with a visible label and an icon, not an icon alone. |
| AUD-55 | keep | Both | The owner of a public cellar is told "This is how others see your cellar" with a link back; a stranger is not shown that line. |
| AUD-56 | keep | 375 | Keycloak's sign-in page fits one screen at 375 with its fields, one primary action and a link to register, under a mark, a wordmark and a green rule. |
| AUD-57 | keep | Both | A not-found page for a beer is its own page with its own way back, not the generic one. |

## Cross-page findings

Looked for and found: AUD-01 to AUD-10, AUD-45 and AUD-48. Each was invisible
from any one surface. Page height, column width, a heading scale, what a card
means and the missing mark are all differences *between* pages, and the pages
that carry them are each internally consistent.
