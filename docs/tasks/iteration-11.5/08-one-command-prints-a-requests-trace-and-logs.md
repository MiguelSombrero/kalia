# Task 08: One command prints a request's trace and log lines as text

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-4

## Why

The question an agent asks most is narrow — what happened to *this* request —
and the general-purpose answer to it is large: a trace as JSON is every span
with every attribute, and its logs are every line from every tier. An MCP
server (task 07) answers any query; it does not shape the answer. A command
that prints one request as a short tree — tier, span, duration, status, the
SQL it ran, and the log lines at `WARN` and above — answers the common case in
a few hundred tokens, works in a session with no MCP server, in a CI log, and
for a developer at a terminal.

## Scope

A `make` target given a trace id prints that request's span tree and its log
lines as plain text, bounded in length, from the local profile. Given nothing,
it prints the most recent failed requests with their trace ids.

## Non-goals

- A general query tool; that is task 07.
- Metrics.

## Constraints

- Scripts in `scripts/` are dependency-free Node with a test beside them, and
  only Node's built-ins are imported (`scripts/check-script-imports.mjs`).
- The ports it reads are this worktree's, from the root `.env`
  (`scripts/stack-ports.mjs`).
- It prints nothing ADR-0013 keeps out of a log, whatever the store holds.
- **Decided at refinement (2026-11-15):**
  - Both this and task 07 are built
    ([task 01](01-decision-the-local-observability-stack.md)).
  - For the no-argument form, a "failed request" is one that answered `5xx`
    or wrote a line at `ERROR`. It lists the ten most recent.
  - The output is bounded at 150 lines. Over that, it first folds repeated
    sibling spans into one line with a count (`× 37`), then drops log lines
    below `WARN`, then cuts the tree and says how much it cut.

## Open questions

**None.**

## Acceptance criteria

- [ ] `node --test` covers formatting a recorded trace into the tree, folding
      repeated siblings into one counted line, the 150-line bound cutting a
      trace with hundreds of spans in the order above, and the no-argument
      listing of ten
- [ ] Against the running profile, the target prints the tree of a request made
      a moment before, with its SQL statements and its log lines — verified by
      running it
- [ ] With the profile stopped, it exits non-zero naming how to start it
- [ ] `make help` lists it, the root README says how to use it, and
      `make verify-fast` is green
