# Task 07: An agent queries the telemetry through an MCP server

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-4

## Why

A store an agent can only reach through a browser it has to screenshot is one
it will not use: the viewer is built for a person, and a screenshot of a chart
is both expensive and, here, kept off every shared surface
([no-screenshots rule](../../../.claude/rules/no-screenshots.md)). The store's
query languages — for traces, logs and metrics — are what an agent can use
directly, given a tool that runs them and returns text.

## Scope

A project-scoped MCP server, configured in the repository, lets an agent in
this repository search traces, read a trace, query logs and query metrics in
the local profile, read-only. It needs no step an agent cannot do itself beyond
the product owner's one-time approval of the server, and it answers with output
small enough to leave room in the agent's context for the work it was reading
it for.

## Non-goals

- An MCP server for a hosted service.
- Writing to the store or the viewer: dashboards, alerts, annotations.

## Constraints

- **Nothing leaves the machine**: the server runs locally and talks only to the
  local profile ([`CLAUDE.md`](../../../CLAUDE.md)).
- **Read-only**: the server's credential, if any, can read and cannot change
  anything, and is a dev-only value, never committed as a live one.
- The port it reaches is this worktree's, read from the environment, never
  hard-coded.
- A new dependency's version is asked for ([`CLAUDE.md`](../../../CLAUDE.md)),
  and an MCP server run from a package registry is pinned to an exact version.
- `.claude/settings.json` is shared configuration; a change to what agents may
  run there is reviewed like code.

## Open questions

- **Integrations.** Which server — the viewer's own MCP server if task 01 chose
  Grafana, or one per store — and how it is run: a pinned container, or a
  pinned binary or package.
- **Non-functional.** How an answer's size is bounded: by the server's own
  limits, by the tools it exposes, or by a wrapper.
- **Functional scope.** Whether it is configured in `.mcp.json` for every
  session, or opted into per session.
- **Edge cases.** The profile is not running: what the server answers, so an
  agent reads "not started" rather than a stack trace.

## Acceptance criteria

- [ ] In a fresh session in a worktree with the profile on, an agent finds the
      trace of a request it just made by its trace id, reads its spans, and
      reads its log lines — verified by doing it
- [ ] A test in `scripts/` fails if the committed MCP configuration names a
      host other than localhost or an unpinned version, and was seen to fail
      against such a configuration
- [ ] The server's credential cannot create a dashboard — verified by trying
- [ ] With the profile stopped, the server answers with a message naming how to
      start it
- [ ] The root README says how the server is enabled, and `make verify-fast` is
      green
