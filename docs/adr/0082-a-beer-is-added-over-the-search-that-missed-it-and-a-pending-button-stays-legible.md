# ADR-0082: A beer the catalog lacks is added in a dialog over the search that missed it, and a button sending its form fades only as far as its label stays legible

- **Status:** accepted
- **Date:** 2026-10-23
- **Amended:** 2026-10-26 ([iteration 8.5 task 05](../tasks/iteration-8.5/05-brewery-questions-answered-by-the-api.md)) —
  the similarity rule is the API's now, not the client's. The hint is a
  brewery-scoped `GET /api/v1/beers?breweryId=&similarTo=` returning the
  brewery's beers whose name contains any word of the typed one (a word is a
  run of letters and digits at least two long; case ignored), so a brewery
  with more than a page of beers keeps the hint, and the form no longer
  filters a first page itself. It is looser than "contain one another or
  share a word" in one way: a word matches inside another word. A duplicate
  brewery's `409` names the brewery as the catalog spells it (id, name,
  country), so the form no longer searches for it. The decision itself stands

## Context

[Iteration 8 task 03](../tasks/iteration-8/03-add-beer-ui.md) builds the
form for adding a beer to the catalog on top of
[task 02](../tasks/iteration-8/02-add-beer-api.md)'s `POST /api/v1/beers`.
Until now a search that found nothing ended in an empty state and a dead end.
A user only finds out that the catalog lacks a beer at one moment: when they
search for the beer in their hand and it is not there.

The task left three questions to a choice from built directions: where the
way in lives, whether the form is a page or a dialog, and where the user
lands once the beer exists. Whichever direction was chosen had to do three
more things. It carries the search term into the form. It shows the
brewery's similarly named beers before the user submits, because task 02's
duplicate rule cannot catch two spellings of one name. It creates a brewery
the catalog lacks without leaving the form. Refinement had already fixed the
fields (a name, a brewery, a style and an ABV, with no description), that a
duplicate beer or brewery is reported with a link to the one that exists,
and that no page names who added a beer.

Three earlier choices bind every direction: the catalog's ruled column beside
its filter column
([ADR-0069](0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md)),
the page shell
([ADR-0067](0067-page-shell-sticky-bar-and-page-component.md)), and the one
error style ([ADR-0071](0071-profile-a-name-tag-over-two-visibility-choices-and-one-error-style.md)).

While choosing, the product owner asked whether the "Adding…" button had a
convention behind its look. It had none. [`docs/design.md`](../design.md) was
silent. The app's three buttons that wait on a request in view (adding a
bottle, editing a bottle, retrying the feed) were disabled while they waited
but drawn exactly like an enabled button, and still darkened on hover. The
feed's retry kept saying *Try again* throughout. The mockup's faded button was the mockup's own invention.

## Decision

**A beer the catalog lacks is added in a dialog over the search that missed
it, reached from that empty result and from a line under every searched
result list, and the user lands back on a search that now finds the beer.
Every button sending its form says what it is doing and is drawn at 75 %
opacity, the faintest at which its label still meets AA.** This is direction
B, the product owner's choice from three built directions in one round.

- **The ways in.** A search that found nothing carries a sentence and a
  primary *Add a beer* button under the usual empty state. A search that did
  find beers ends with *Not the beer you were looking for? Add a beer* under
  the list, above the pagination, because a search can find the wrong beers
  as easily as none. The catalog with no search at all carries neither.
- **Signed out, both ways in invite signing in** instead of opening a form
  that would fail, and signing in returns to the same search.
- **The form is the shared `Dialog`**, over the search it came from, so
  *Cancel* and `Escape` return to exactly those results. The search term is
  already the beer's name. While the styles and countries load, the fields
  are skeleton blocks.
- **The brewery is searched for, or added in place.** Typing in the brewery
  field lists the catalog's breweries that match, and the last option adds
  the typed name as a new brewery. Choosing it opens the brewery's name, a
  country from the fixed list and an optional city inside the same form,
  under a rule.
- **The brewery's similarly named beers are listed before submitting**, under
  the brewery field, each with a link to open it. "Similarly named" means the
  two names, with case, spaces and punctuation ignored, contain one another
  or share a word. A new brewery says it has no beers to compare against.
- **A duplicate is named and linked, never a generic error.** A duplicate
  beer puts the error box above the buttons naming the existing beer, with a
  link that opens it. A duplicate brewery names the existing brewery, with a
  *Use it* button that picks it in the brewery field.
- **A refusal the client did not predict is still shown.** A `400` marks each
  field the server named and says so in the box above the buttons; a field
  the form does not have is reported by the box alone. Any other failure says
  the beer could not be added and to try again.
- **Landing.** Once the beer exists, the dialog closes and the page moves,
  without a reload, to a catalog search for the new beer's name. Its row is
  highlighted once, as new feed entries are, and carries a *Just added*
  badge, and a toast confirms. The row's *Add* opens the existing add-to-cellar
  dialog, so the beer and the bottle stay two acts. The highlight and the
  badge are this browser's memory of the add, not part of the address, so a
  reload or a shared link shows the search plainly. Keyboard focus moves to
  the new beer's row, since the control that opened the dialog is gone from
  the search it lands on. **The one exception:** when the first page of that
  search would not show the new beer, because a common name such as "IPA"
  sorts it further down, the user lands on the beer's own page instead, with
  the same toast and focus on the page. The server checks that first page
  before answering, so the client never lands where the beer cannot be seen.
- **A button sending its form** ([docs/design.md](../design.md#feedback-and-errors)
  holds the rule). Its label names the action in progress (*Adding…*), it is
  disabled, drawn at 75 % opacity with the progress cursor, and it does not
  react to hover. This applies to every such button, and the three that
  existed are brought to it in the same pull request; the feed's retry now
  reads *Trying again…* while it waits. *Publish cellar* is not one of them:
  pressing it closes the question it sits in, so it is never seen waiting. A destructive button is
  never left in this state: white on the destructive fill at 75 % is 3.82:1,
  and the one removal in the app closes its dialog at once and reports by
  toast.

## Alternatives considered

**A, "From the dead end".** The empty search was the only way in. The form
was its own narrow page, `/beers/new`, shaped like sign-up, with what happens
next as two numbered steps, and the user landed on the new beer's page with
*Add to cellar* as its action. Not chosen; the product owner preferred B. A
also left a user whose search found the wrong beers with no way to the form.

**C, "Beer, then bottle".** An outlined *Add a beer* sat on the catalog's
title row on every catalog page, beside a link on the empty result. The form
was a wide page in two numbered steps with a live preview of the beer's page.
Once the beer existed the page moved to step 2, adding bottles inline, which
could be skipped. Not chosen; the product owner preferred B. C also came
closest to the task's non-goal of adding a beer straight into the cellar in
one step: the steps stayed separate, but in one flow.

**The pending button at 60 % opacity, as the round-one mockup drew it.**
White on that blend is 3.26:1, under AA's 4.5:1 for text. WCAG and axe both
exempt a disabled control, so every check would pass, but the one word
saying what is happening would be the faintest text on the page. Not chosen.

**The pending button at full colour, with only its words changing.** 8.42:1,
and today's app with the hover fixed. Not chosen: the product owner wanted a
button that is waiting to look unavailable as well as say so.

**Recording the pending look for new buttons only.** A smaller pull request.
Not chosen: the three existing buttons would then contradict the rule the
moment it was written.

## Consequences

- Good, because the catalog grows from the one place a user discovers it is
  missing something, and the form never takes them away from that search.
- Good, because a duplicate is caught before submitting as well as after: the
  brewery's similar names are on screen while the name is still being typed.
- Good, because every button that is waiting on a request now looks and
  reads the same way, and its label passes AA while it waits.
- Bad, because the form lives in a dialog, so it has no address. A user
  cannot bookmark or share "add this beer", and a dialog tall enough for a
  new brewery scrolls on a phone.
- Bad, because the landing searches for the beer's name, not the search the
  user typed. A user who searched "oo bourbon" and named the beer
  "Öö Bourbon" lands on a search for "Öö Bourbon". A beer with a common name
  lands on its own page instead, so there are two landings, and adding one
  costs a second catalog read.
- Neutral, because the similarity rule is the client's own and is not task
  02's duplicate rule. It can list a beer that is not a duplicate and miss one
  that is spelled differently, which is why it is a hint and the server's
  `409` remains the authority.
- Neutral, because the disabled controls that are not waiting on a request
  (a quantity stepper at its limit, sign-in before the page hydrates) stay at
  full strength. The rule is about a request in flight, not about disabled
  buttons in general.
- **Revisit trigger:** editing a beer ([backlog](../tasks/backlog.md)), whose
  form would want the same fields with an address of its own; or a second
  destructive action that has to wait on its request.

## Evidence

Round one built three directions, A, B and C, as self-contained mockups
showing every state at 375 and 1280 in English and Finnish: nothing found,
signed out, the form loading, the term carried in, the brewery's beers, a new
brewery, invalid input, a duplicate, a server refusal, the pending button,
the landing and adding a bottle. Each listed the contrast of every colour
pairing it used, computed from its own values, and all passed AA. They were
shown in the desktop app's browser pane. The mockups are not kept; this ADR
is their record.

The pending button was settled on a fourth page showing it three ways beside
an enabled one, in B's dialog footer. Contrast of white text on the cobalt
fill composited over white, by WCAG 2.2's relative-luminance formula: 60 %,
3.26:1; 75 %, 4.67:1; full, 8.42:1. On the destructive fill at 75 %, 3.82:1.
Ink on white at 75 %, the outline button, 8.42:1.

The built flow, run in Chromium against the compose stack on 2026-10-23:
`e2e/add-beer.spec.ts` goes from a search that found nothing through the
dialog to the search finding the new beer, and on to a bottle of it in the
cellar, without a document reload. It also adds a beer whose brewery is new,
follows a duplicate's link to the existing beer, and scans every state with
axe at 375×812 and 1280×800 in both locales. The suite's catalog target-size
check found the line under a searched result list at 20px tall on a phone;
it was raised to the 24×24 floor before sign-off. The product owner signed
the built flow off against B in the browser pane at both widths on
2026-10-23, with no departures from the mockup. Code review then found that
a beer named "IPA" landed on a search whose first page did not show it; the
product owner chose the fallback to the beer's own page over narrowing the
search by style and country, which a common name can still overflow, or
leaving it. The e2e suite adds an "IPA" from a new brewery and lands on its
page.
