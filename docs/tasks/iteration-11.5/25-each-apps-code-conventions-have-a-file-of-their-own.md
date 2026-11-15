# Task 25: Each app's code conventions have a file of their own, loaded with its subtree

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

Each app's README holds both how to run it and how to write code in it.
`mobile/README.md` is at its 320-line cap (`scripts/check-doc-size.mjs`) with
a Conventions section of about 65 lines, and tasks 11, 12 and 26–28 add
conventions to it that do not fit. The web's README holds about 110 lines of
conventions and the backend's about 25, each under a cap shared with
everything else the README says.

The conventions are the part of each README that binds every edit, and they
grow with each feature. The run-and-test text is the part a session reads
once.

## Scope

- `backend/CONVENTIONS.md`, `web/CONVENTIONS.md` and `mobile/CONVENTIONS.md`
  each hold their README's Conventions (or Code conventions) section, moved
  whole. Each README keeps how to run, test and build, its Traps section
  beside the commands they warn about, and a one-line pointer to the new
  file.
- Each subtree's `CLAUDE.md` imports its `CONVENTIONS.md` as well as its
  README, so the conventions load whenever the subtree is touched.
- Every link into a moved section points at its new home.
- `scripts/check-doc-size.mjs` caps each new file.
- [ADR-0035](../../adr/0035-agent-context-layout.md) is amended to name the
  new file in the agent context layout.

## Non-goals

- New conventions. Tasks 11, 12 and 26–28 add them.
- A `CONVENTIONS.md` for `packages/`, whose README stays the one home for it.

## Constraints

- **An accepted ADR is amended, not rewritten**
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **Each fact has one home** ([ADR-0020](../../adr/0020-documentation-roles.md)):
  the moved text is moved, not copied, and a rule whose violation fails
  silently keeps its warning inline where an editor meets it
  ([CLAUDE.md](../../../CLAUDE.md)).
- **The nested `CLAUDE.md` files are not re-injected after `/compact`**, so
  what the root `CLAUDE.md` repeats from them stays repeated there.
- **This task runs before tasks 11, 12 and 26–28**, which write into the
  files it creates.
- **Decided at refinement (2026-11-15):** the product owner chose a file of
  its own over raising the README cap or compressing the README, for all
  three subtrees rather than mobile alone. Only the Conventions section
  moves; the Traps stay in the README.

## Open questions

**None.**

## Acceptance criteria

- [ ] The three `CONVENTIONS.md` files exist, each README's Conventions
      section is gone and replaced by a one-line pointer, and each README's
      Traps section is unchanged
- [ ] A test in `scripts/` fails if a subtree's `CLAUDE.md` does not import
      both its README and its `CONVENTIONS.md`, and was seen to fail with one
      import removed
- [ ] `scripts/check-doc-size.mjs` caps each new file, and its test covers one
- [ ] ADR-0035 carries the amendment, and `make check`'s link check passes
- [ ] `make verify-fast` is green

## Notes

Added at refinement on 2026-11-15, when the product owner chose a
conventions file of its own for each subtree in answer to task 11's
question about the mobile README's cap. Task 11 was split into tasks 11 and 25–28 at refinement on 2026-11-15, by the
product owner's decision. The analysis behind all five was drafted on
2026-11-14 against `dev` at `769b6afe`.
