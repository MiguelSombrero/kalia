# ADR-0105: The admin reviews suggestions in a queue beside the suggestion, edits in place, and rejects through a dialog that asks for the reason

- **Status:** accepted
- **Date:** 2026-11-06

## Context

[Iteration 10.5](../tasks/iteration-10.5.md) gives review an API
([ADR-0102](0102-a-suggestion-is-a-pending-beer-with-its-new-brewery-and-an-admin-reviews-it-inside-catalog-which-publishes-one-event-per-decision.md))
and a route only an admin reaches
([ADR-0101](0101-an-admin-is-a-realm-role-in-the-access-token-which-the-backend-enforces-on-one-path-prefix-and-the-web-reads-in-its-bff.md)).
What the admin works in was left to this design task
([task 11](../tasks/iteration-10.5/11-design-the-admin-review-page.md)), and it
is most of whether review gets done: a queue that costs three clicks a
suggestion, hides the brewery that came with the beer, or makes reject as easy
to hit as approve is a queue that grows.

The page is Kalia's first tool rather than a page for readers. The identity
([ADR-0064](0064-visual-identity-can-art-square.md)), the page shell
([ADR-0067](0067-page-shell-sticky-bar-and-page-component.md)) and the feedback
rules in [`docs/design.md`](../design.md) bind it, so the choice was the
structure of the work, not the look.

This was run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)): five rounds of
mockups at 375 and 1280, in English and Finnish, with seeded-style sample data
(a queue of 15 over three pages, a contributor with no username, two
suggestions sharing one new brewery, a typo to correct) and switches for the
states the API forces on the page (a `409` from a concurrent decision, a
`404`, and the edit's `400`, duplicate `409` and stale-brewery `409`). The
mockups were not committed.

## Decision

**The review page is a queue with the chosen suggestion beside it; the admin
approves in one click, edits in place, and rejects through a dialog that asks
"do you really want to reject this suggestion?" and takes the reason inside it.**

- **Layout.** From the large breakpoint up the queue is a 340px column on the
  left, oldest first, one row per suggestion (a strip of the beer's style
  colour, its name, its brewery, its contributor and how long it has waited),
  and the suggestion fills the column beside it with the first one already
  open. Below the breakpoint there is no room for two columns, so the list and
  the suggestion take turns: choosing a row replaces the list with the
  suggestion and a *Back to the queue* button. The queue pages under its
  last row, *Previous / Page n of m / Next*.
- **The suggestion** shows its name with the style badge and the ABV, the
  brewery with a *New brewery* badge after its name when it came with the
  beer, who suggested it (or *No username yet* when they have none) with their
  waiting and rejected counts, and when it was suggested. The badge is shown
  once, after the brewery's name, not also beside the beer.
- **Approving is one click.** When the brewery is new the button reads
  *Approve beer and brewery*, and nothing else: no second line, no brewery
  name in the button.
- **Editing is a mode of the suggestion.** *Edit and approve* turns the
  suggestion's own fields into inputs in the same place, with *Save and
  approve* and *Cancel*, and each changed field says what was suggested
  (*Suggested: …*). A suggestion that came with a new brewery chooses between
  two radio rows, *New brewery* and *Existing brewery*: the first shows the
  brewery's name, country and city as editable fields, the second finds an
  approved brewery to re-point at, and says under it what brewery was
  suggested. The labels do not say "as suggested", because an edited field is
  no longer as suggested. A refusal from the server stays in the form: the
  fields it names are marked and described on the field, and a duplicate
  names the existing beer or brewery and links to it.
- **Rejecting is guarded by a dialog, and the reason is chosen in it.** The
  *Reject* button opens a dialog titled *Do you really want to reject this
  suggestion?*. Inside it the admin picks one of the four reasons; the red
  *Reject suggestion* button stays disabled until one is picked, so the reason
  is mandatory and is never chosen before the admin has been asked. The
  dialog also says what becomes of a new brewery (rejected with the beer, or
  left pending because another suggestion still needs it). Confirming closes
  the dialog at once; the suggestion then shows its outcome and a toast
  reports it, as [`docs/design.md`](../design.md) says of a removal.
- **A decided suggestion shows its outcome on the page.** Where the
  suggestion was, a panel says what happened ("Approved. *Hazy Hammer* and
  *Sahalahti Brewing Co.* are in the catalog", "Approved as edited…",
  "Rejected: Not a real beer. *Löyly Brew Lab* stays pending: *Löyly Stout*
  still needs it") with *Next suggestion*. A brewery left `PENDING` is never
  called rejected.
- **A refusal is shown where the action was**, in the page's error box (an ink
  edge, the red cross cell, the message): a `409` from a concurrent decision
  says how it was decided and when, a `404` says the suggestion is no longer
  waiting, and either leaves the admin a way on to the next one.
- **The empty queue** says nothing is waiting and that new suggestions appear
  here; **loading** is the page's own skeleton below the guard, since the
  admin route has no `loading.tsx`.

No semantic token is added and the identity is not departed from: the red
confirm button is `--color-destructive`, the confirm of an outcome that cannot
be taken back, which is what its meaning row allows.

## Alternatives considered

**Direction B — a list opening a page per suggestion.** A full-width ruled
table, each row opening its own page with *Previous / Next*, the same
structure at both widths and a link of its own per suggestion. Not chosen: it
costs a page load and a step back to see the queue for every suggestion, which
is the cost the page exists to avoid, and the per-suggestion link it buys is
not something the admin needs, since a suggestion that is decided stops
having a page.

**Direction C — a list expanding in place.** One list whose rows unfold the
suggestion and its actions underneath, the decided row staying in place as a
one-line result. Not chosen: a long open row pushes the rest of the queue
down, so the next suggestion is not in view when the admin finishes one, and
the suggestion has no stable place to look at.

**Editing as a form of its own.** *Edit and approve* opens a separate narrow
page with an *As suggested* summary above the form. Not chosen: it takes the
admin out of the suggestion to fix a typo, and the in-place fields already
carry what was suggested as a hint under each one.

**Rejecting with a confirm step inside the page, an undo window, or nothing.**
The first picks a reason from radio rows and then presses a red button; the
second rejects as soon as a reason is picked and sends the call eight seconds
later unless *Undo* is pressed; the third rejects as soon as a reason is
picked. The product owner chose none of them, and asked for the dialog. The
undo window would also have been the only one to rely on the browser: the API
has no undo, so the decision is not sent until the window closes, and closing
the tab inside it silently drops a decision the admin saw confirmed.

**Naming the new brewery as a checklist or a bracket.** A box above the
buttons listing the beer and the brewery as two ticked rows, or the two joined
by a bracket tagged *Approved together* in the suggestion's facts. Not chosen:
the button's own words already say that two things are approved, and the
brewery is on the page with its *New brewery* badge; both alternatives repeat
what is a few lines away.

**Two ways to draw the brewery choice in the edit form.** Radio rows against a
two-way toggle. The product owner chose the radio rows, which are what the
add-a-beer form already uses for the same choice.

## Consequences

- Good, because the admin works through the queue without leaving it: after a
  decision the next suggestion is one click, and the whole queue stays on
  screen at 1280.
- Good, because the destructive outcome is guarded exactly where the cost is,
  and the guard doubles as the place the mandatory reason is collected.
- Bad, because rejecting is a click, a pick and a confirmation, three steps
  for the outcome an admin takes most often on obvious junk. Approving, the
  other common outcome, stays one.
- Bad, because the side-by-side layout does not exist at 375: the phone
  behaves like a list that opens a page, so the queue and the suggestion are
  never on screen together there.
- Neutral, because a decided suggestion's panel stays until the admin moves
  on, and the queue is refreshed behind it: the panel is page state, not a
  toast, so it outlives the toast that announces it.
- Neutral, because choosing an existing brewery to re-point at is a search
  over the catalog's brewery search rather than the list the mockup drew, as
  there are far more breweries than a list can hold.
- **Revisit trigger:** a queue long enough that the admin wants to filter or
  search it, or a suggestion that carries more than the beer and its brewery.

## Evidence

Chosen from built alternatives over five rounds, each shown to the product
owner in the desktop app's browser pane. Round one showed the three layouts
with switches for editing, the guard and the new-brewery pairing; the product
owner chose the side-by-side layout, editing as a mode, and the button's words,
and asked for a guard that none of the variants had (a dialog asking whether to
reject, with the reason picked inside it). Round two built that, round three
shortened the approve button to *Approve beer and brewery*, round four removed
the duplicate *New brewery* badge under the beer's name, and round five
renamed the brewery choice in the edit form and offered radio rows against a
toggle; the product owner chose the radio rows on 2026-11-06.

Every colour pairing the mockups used, computed from their own values,
met WCAG AA, the ten style-group colours included.
