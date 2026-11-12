# ADR-0111: The beer-style-to-group mapping lives in `@kalia/api`, so both clients colour a style alike

- **Status:** accepted
- **Date:** 2026-11-11
- **Amended:** 2026-11-11 by this ADR — [ADR-0064](0064-visual-identity-can-art-square.md) said the mapping lives in the frontend only; it now lives in the shared package

## Context

A beer's style is free text in the catalog. [ADR-0064](0064-visual-identity-can-art-square.md)
colours it by one of twelve groups and kept the keyword mapping in the web app
alone, with the product owner choosing that over a backend-owned list. The mobile
app needs the same mapping for its colour-field cards
([ADR-0110](0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)),
and the API sends no group, only the style text.

## Decision

**The keyword mapping from a style name to its group is one module in `@kalia/api`,
with one test, which both clients import.**

- The web's three uses import it from the package; its behaviour and its test
  are unchanged, and the test moved with the module.
- The phone looks the group up in the token source's beer-style colours through
  the enum-lookup helper of [ADR-0093](0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md),
  so a group the build has no colour for takes the neutral grey rather than none.
- The mapping stays out of the backend, as ADR-0064 decided.

## Alternatives considered

**Copy the mapping into the app.** The smallest change, with no web edit. Rejected
because the keyword table, its order and its 77-case test would exist twice, and
a keyword added for one client would colour the same beer differently on the other
without any check noticing.

**Send the group from the backend.** Rejected in ADR-0064 and not reopened: it
makes the backend own a presentation list, and an installed app would meet a group
it does not know.

## Consequences

- Good, because a style is one colour on both clients, and the one test that pins
  the order cases covers both.
- Bad, because `@kalia/api` now holds a presentation rule beside the transport
  and the generated client, which a reader looking for the client would not expect.
- Neutral, because the web's generated stylesheet is unchanged: the group names are
  checked against it by the moved test, and against the phone's colours by a test
  in the app.
