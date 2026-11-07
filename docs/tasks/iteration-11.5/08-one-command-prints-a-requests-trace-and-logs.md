# Task 08: One command prints a request's trace and log lines as text

- **Status:** needs-refinement
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

## Open questions

- **Functional scope.** Whether both this and task 07 are needed, or one is
  enough; task 01 answers it first.
- **Interaction.** What a "failed request" is for the no-argument form — a 5xx,
  any 4xx, an exception in a log — and how many it lists.
- **Non-functional.** The length bound, and what is cut first when a trace is
  over it.

## Acceptance criteria

- [ ] `node --test` covers formatting a recorded trace into the tree, the length
      bound cutting a trace with hundreds of spans, and the no-argument listing
- [ ] Against the running profile, the target prints the tree of a request made
      a moment before, with its SQL statements and its log lines — verified by
      running it
- [ ] With the profile stopped, it exits non-zero naming how to start it
- [ ] `make help` lists it, the root README says how to use it, and
      `make verify-fast` is green
