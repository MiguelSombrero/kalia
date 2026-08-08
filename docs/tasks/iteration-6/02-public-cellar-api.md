# Task 02: Public cellar read API

- **Status:** needs-refinement
- **Iteration:** [6](../iteration-6.md)

## Why

Every cellar endpoint built in [iteration 5](../iteration-5.md) answers for the
caller and nobody else — the isolation rule that task deliberately made
absolute. Making a cellar public means deliberately breaking it, for exactly
one case, and that is the kind of change that goes wrong quietly.

It is worth its own task for that reason. This is the first endpoint in Kalia
that serves one person's data to another, and the first read the app allows
anonymously that is not seeded reference data.

## Scope

Reading a cellar that its owner has marked public: the beers in it and their
bottles, available to any caller including a signed-out one, addressed by
whatever [task 01](01-profile-and-visibility.md) settles as the public
identifier.

## Non-goals

- Writing anything. A public cellar is readable, never editable, by anyone but
  its owner.
- Any UI — [task 04](04-public-cellar-page.md).
- Discovery: no endpoint that lists public cellars or searches them. You reach
  a cellar from a link or a profile.

## Constraints

- The signed-in user's own cellar endpoints from
  [iteration 5 task 02](../iteration-5/02-cellar-rest-api.md) are unchanged.
  This adds a read path; it does not relax the existing one.
- Default deny stays the rule
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md)): this
  endpoint is public only by being listed as such, and the list is the visible
  edit that makes it reviewable.
- Errors are RFC 9457 `problem+json`
  ([ADR-0014](../../adr/0014-shared-exception-handling.md)).
- **A private cellar must be indistinguishable from one that does not exist**,
  unless the product owner decides otherwise in question 1 below. This fails
  silently: an implementation returning 403 for private and 404 for unknown
  passes every functional test while telling strangers who has a cellar.

## Open questions

1. **Does a private cellar return 404 or 403?** 404 leaks nothing. 403 is more
   honest and tells a legitimate visitor that the link was right and the owner
   changed their mind. Whichever is chosen becomes the constraint above and the
   thing the test asserts.
2. **Does the public view show everything the owner sees?** Purchase price is
   the obvious candidate to withhold, and possibly notes. If anything is
   withheld, the public response is a different DTO, not a filtered one — worth
   deciding now rather than discovering during review. A second consequence of
   two DTOs: a client cannot render both views from one code path, so how far
   the two shapes are allowed to diverge is part of the answer, not a detail
   of it.
3. **Should a public cellar be `noindex` to search engines?** Public to anyone
   with a link is not the same as public to Google, and the two are easy to
   conflate. This may land in [task 04](04-public-cellar-page.md) instead, but
   the decision belongs with the visibility model.
4. **What does the owner see at their own public URL** — the public view, or
   their own with edit controls? A public view they cannot preview is a public
   view they cannot check.

## Acceptance criteria

- [ ] A signed-out request reads a public cellar's beers and bottles —
      integration test
- [ ] **A private cellar is unreadable by a signed-out caller, by a different
      signed-in user, and by a caller passing the owner's own identifier** —
      integration test for each, every one confirmed to fail against an
      implementation that ignores the visibility flag
- [ ] Flipping a cellar from public to private makes an identical request stop
      working — integration test doing exactly that, which is the case a test
      of two fixed cellars would miss
- [ ] The owner still reads and writes their own cellar unchanged, and no
      caller can write to anyone else's through the new path — integration test
- [ ] The generated OpenAPI client is regenerated and committed; the
      `api-client-drift` CI job passes
      ([ADR-0012](../../adr/0012-orval-api-client.md))
- [ ] `mvn clean verify` is green

## Notes

The visibility flag itself is [task 01](01-profile-and-visibility.md)'s. This
task is where it becomes true.
