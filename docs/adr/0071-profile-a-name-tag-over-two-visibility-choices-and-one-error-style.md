# ADR-0071: The profile is a name tag above two visibility choices that each list what they show, and every error in Kalia uses one style

- **Status:** accepted
- **Date:** 2026-10-11

## Context

[Iteration 7.5 task 10](../tasks/iteration-7.5/10-profile-and-sign-up-layout.md)
lays out the profile page and Kalia's own sign-up page again. Both had been
built for their function and never designed.

The profile was a heading, the username in small grey text, two native radio
buttons and one sentence. A username is what strangers see in the front-page
feed, on a public cellar and in its address. On the profile it was the
smallest text on the page (AUD-36). Making a cellar public publishes a page to
anyone with the link, and that choice was a radio that saved the moment it was
selected. Nothing said it had been saved, and its consequences were a clause
in one sentence (AUD-37). The header called the same person by Keycloak's
first and last name, while every other surface used the username (AUD-13).
[ADR-0067](0067-page-shell-sticky-bar-and-page-component.md) left that choice
to this task.

The sign-up page was a heading, a paragraph, a native checkbox and a button
(AUD-38). The paragraph promised that Keycloak's next page would ask for a
password, which it does not (AUD-39). The realm verifies the email first and
asks for the password after the verification link is opened, which
[iteration 6.5 task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)
decided on purpose.

Three constraints shaped the answer. A profile may show only what is already
public ([ADR-0049](0049-profile-module-and-public-identity.md)). Nothing on it
may become a way to see a cellar that is not public
([ADR-0050](0050-public-cellar-addressing.md)). Anything the sign-up page says
about credentials must be what Keycloak enforces
([ADR-0055](0055-self-registration-via-keycloak.md)).

During the choice the product owner asked whether error messages look the same
everywhere. They did not. The add-bottle and edit-bottle dialogs and sign-up
printed plain text, while the feed error and the toasts used a box with a red
cell. The product owner made one error style part of this task.

## Decision

**The profile is a name tag, with the username set large as the page's title,
above two side-by-side visibility choices that each list what they make
visible. Making a cellar public asks once, inline; making it private does
not; either outcome is reported by a toast that goes away. Every error in
Kalia uses one style built on a red square with a white cross.** This is
direction A2, the product owner's choice from four built directions across two
rounds.

- **The name tag.** A hairline frame holds the person's slot of
  [ADR-0065](0065-imagery-icons-and-mark-specimen.md), the label *Your name on
  Kalia*, and the username as the page's `h1`. The username is set in the
  display face larger than any other page's title, on a line of its own. Under
  it, one sentence says where the name appears and that it cannot be changed,
  because it is the cellar's address. The page is *wide*, so a long username
  fits on one line on a desktop.
- **The visibility choices.** Under the heading *Who can see your cellar?*
  sit two radio tiles, *Only me* and *Anyone with the link*. Each tile lists
  what that choice shows. Public shows the cellar's beers and bottles,
  counted, with their dates, and shows the person's additions on the front
  page, including the ones made while the cellar was private, because the feed
  filters by visibility when it is read
  ([ADR-0059](0059-feed-respects-cellar-visibility.md)). It also says what is
  never shown, the email or account details. Private says the cellar's address
  shows the not-found page to everyone. The current choice carries an ink
  *Current* tag.
- **Going public asks; going private does not.** Choosing *Anyone with the
  link* opens a question under that tile, *Publish your cellar?*, with *Keep
  private* and *Publish cellar*. Nothing is saved until *Publish cellar* is
  pressed. Choosing *Only me* saves at once, because reducing what is visible
  carries no risk worth a question.
- **The outcome is a toast.** "Saved. Your cellar is public." (or private)
  appears in the same success toast, with the same timing, that reports a
  removed bottle in the cellar, and then disappears. A failed save puts the
  choice back and shows the failure toast the profile already had. Nothing
  about the save stays on the page.
- **A public cellar's address is shown.** While the cellar is public, a block
  under the choices shows its address with *Copy link* and *Open*. There is no
  preview of the cellar itself.
- **One name everywhere (AUD-13).** The header shows the username. The session
  takes its name from Keycloak's `preferred_username` rather than its name
  claim, and an existing user's stored name is corrected at their next
  sign-in.
- **Sign-up is a narrow page, flush left.** The three real steps are numbered
  because they are a sequence: confirm your age here, choose a username and
  give your email on the next page, then open the emailed link and set your
  password. The second step says the username is public and cannot be changed.
  The acknowledgement is a 24px box in a hairline frame, and the one button
  comes last and fills the column. This is the "single form" layout that
  [task 11](../tasks/iteration-7.5/11-keycloak-pages-carry-the-identity.md)
  inherits. The refinement agreed it would be centred. The product owner chose
  the flush-left direction over a centred one, so
  [docs/design.md](../design.md)'s rule that a narrow page is not centred
  stands for single-form pages too.
- **One error style.** The red square with a white cross means "error". An
  error about one field turns the field's edge red and puts a line under it
  that starts with a small red square, tied to the field for assistive
  technology. An error about a whole action is a box with the toast's red cell,
  placed just above the action's button. An error reported after the fact is
  the failure toast. Sign-up's two errors, the add-bottle and edit-bottle
  dialogs' field and save errors, and the feed's load error all use it. The
  rule itself lives in [docs/design.md](../design.md).
- **Where the built page departs from the mockup, by agreement.** The
  product owner signed the built page off against A2 at both widths on
  2026-10-11, accepting these differences. Sign-up's step numerals are ink,
  not cobalt, because cobalt means "act here" and the *Here* label already
  marks the current step. *Copy link* is a word without an icon, since the icon
  set has none for copying, and it is left out where the browser offers no
  clipboard. Both choices are locked for the moment a save is in flight, so
  two saves cannot overlap.
- **Signed out and loading.** The signed-out profile is the cellar's sign-in
  prompt, with *Sign in* and *Create an account* (AUD-33). The skeleton draws
  the name tag, the heading and the two tiles.
- **Audit findings on these surfaces.**
  - AUD-36: the username is the largest thing on the page, and the radios are
    24px tiles in the identity.
  - AUD-37: the consequences are listed on each choice, going public asks
    first, and a toast reports every save.
  - AUD-38: the page carries the whole sequence it starts, in a column of the
    narrow width every form uses.
  - AUD-39: the sign-up page claims only what the realm enforces. The product
    owner kept the realm's verify-first order rather than adding a password to
    the registration form.
  - AUD-13: the header shows the username.
  - AUD-33: *Create an account* sits beside *Sign in* on the signed-out
    profile.
  - The profile's and sign-up's share of AUD-06 and AUD-47. No control is under
    24px, and the skeleton draws the layout that ships.
  - AUD-49 is kept: neither page scrolls sideways at 375.

## Alternatives considered

**B, "Shop window".** A settings column beside a window onto the cellar's
public address. The window showed exactly what a stranger gets there: the
public cellar when public, Kalia's not-found page when private, and a dashed
outline of what would appear while a change was waiting. A Private/Public
switch staged the change and one button applied it, and sign-out sat in the
column. Sign-up was a centred card. Not chosen. The product owner preferred A.
A preview also has to be built so that it can never read a cellar that is not
public, and B's centred sign-up would have needed the shell's rule about
narrow pages amended.

**C, "Spec sheet".** One ruled ledger with rows for name, cellar, address,
front page and account. Each consequence of visibility was a row that changed
when visibility did. Going public opened a dialog listing what becomes
visible. Going private was instant, with a toast. Sign-up put the form beside a
ledger of what Kalia shows about a person. Not chosen. The product owner
preferred A, and C made the username one row among five.

**A, "Name tag", as first built.** A2 without its two changes. A save was
confirmed by a "Saved" line that stayed on the page. Sign-up's errors used a
box of their own, unlike any other error in the app. Not chosen as it stood:
the product owner asked for the confirmation to disappear like the cellar's,
and for one error style everywhere. Those changes became A2.

**A password on the registration form.** It would let a person finish
signing up in one sitting on one device. Not chosen, because the account would
then hold a working password before anyone proved they own the address.
Someone could register with another person's address, and that person's click
on the verification link would hand the account to whoever chose its password.
The verify-first order was decided in iteration 6.5, and this task only
describes it truthfully.

**Error style: keep each surface's own, and fix sign-up only.** A smaller pull
request. Not chosen: the product owner asked for one style everywhere in this
pull request, so that no page keeps a different way of saying something went
wrong.

## Consequences

- Good, because the page a person sees about themselves leads with the name
  others know them by, and the most consequential choice in Kalia now says
  what it does before it does it.
- Good, because one name names a person everywhere, header included.
- Good, because an error now looks the same on every page, so a visitor learns
  one sign for "something went wrong".
- Bad, because the profile now reads the owner's cellar to count it. The page
  costs a second backend call, and if that call fails the public tile falls
  back to a sentence without numbers.
- Bad, because the sign-up page describes Keycloak's flow in Kalia's words. If
  the realm's registration flow changes, this page's steps must change with
  it, and nothing fails when they drift.
- Neutral, because Keycloak still asks for a first and last name at
  registration that Kalia no longer shows anywhere. Removing them is a Keycloak
  user-profile change for task 11.
- Neutral, because an invalid field's red edge is a pairing the contrast list
  did not have: the destructive colour against the page, as a non-text
  boundary.
- **Revisit trigger:** a display name or a rename path for usernames, either
  of which changes what the name tag says. Uploads (backlog), at which point
  the person's slot holds a photograph.

## Evidence

Round one built three directions, A, B and C, as self-contained mockups
showing every state at 375 and 1280 in English and Finnish. Each listed the
contrast of every colour pairing it used, computed from its own values, and
all passed AA. Round two built A2. The mockups are not kept; this ADR is
their record.

Before the sign-up page's steps were written, the running realm's
registration page was fetched. It asks for username, email, first name and
last name, and renders no password field. `e2e/sign-up.spec.ts` drives the
rest in Chromium against the compose stack: the emailed verification link
opens Keycloak's set-password page, after which the new account is signed in.
The three steps say exactly that.

The built pages were checked in Chromium against the compose stack, signed
in as the seeded test account:

- **1280×800:** the username is set at 64px on one line inside the name tag,
  and the two choices sit side by side. Choosing *Anyone with the link* opens
  the question under that tile and moves focus to it. *Publish cellar* shows
  the success toast, which is gone after five seconds, and the address block
  appears. *Only me* saves without asking.
- **375×812:** the username fits one line at 28px, the choices stack, and
  nothing on the profile, the signed-out profile or sign-up scrolls sideways.
  Sign-up's unticked-box state draws the red edge on the box's frame and the
  error line under it.
- **Finnish:** every new string fits both widths.
- **The header** shows `testuser`. That account was stored as "Test User"
  before the change, and its name was corrected at its next sign-in.

`e2e/profile-layout.spec.ts` renders the signed-out profile, both visibility
states with the question open, sign-up, and both sign-up errors at both widths.
Each state passes the `@axe-core/playwright` scan and stays inside the column.
`e2e/profile-visibility.spec.ts` checks that keeping the cellar private sends
no request, and that the choice survives a reload. `e2e/public-cellar.spec.ts`
still finds a private cellar indistinguishable from a missing one.
