# Task 12: Do we need a design system?

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-8

## Why

[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) called
`components/ui/` "the extraction seam the roadmap flags for a possible future
design system: self-contained today, movable to its own package later without
rework." That sentence has been carried forward for five iterations without
anyone deciding whether the extraction should happen, and a possibility nobody
decides about is a question that quietly costs something every time a component
is written.

This iteration is the moment it can be answered honestly rather than
speculatively. Before it, the evidence was three primitives — `Button`, `Badge`,
`Card` — which is too little to reason from. After it, six surfaces have been
laid out again against one identity, and the component inventory that came out
of that is real evidence: which patterns recurred across four pages, which were
one-offs that only looked shared, and how much of the redesign's cost was
components versus layout.

The product owner's framing is worth keeping: this may well not be needed. The
task exists to have the conversation with evidence in hand and record the
answer, not to build a design system.

## Scope

One decision, recorded: whether `components/ui/` becomes a documented design
system, stays a folder of primitives, or takes some third shape — and if it
becomes one, what "design system" means here concretely, since the phrase
covers everything from a README to a versioned package with its own release
process.

An inventory of what the redesign actually produced is part of the task, as the
evidence the decision rests on.

## Non-goals

- Building it. If the answer is yes, what gets built is scheduled work, and
  this task says what and where rather than doing it.
- Reopening the two-layer token system.
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s structure is
  settled and [task 03](03-visual-identity.md) works inside it.
- Kalia's design brief. [Task 14](14-where-design-intent-lives.md) owns whether
  a standing design document exists and what is in it; this task decides
  whether `components/ui/` becomes a system. If the answer here is yes, its
  documentation and that document have to resolve into one thing rather than
  two that disagree — which is task 14's question 7, asked from this side.
- The JS/TS token pipeline. It has its own revisit trigger in
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) — a second
  consuming app, or a JS-side need to read a token — and neither has fired.
  Worth naming here because "design system" and "token pipeline" get conflated,
  and they are different questions with different triggers.

## Constraints

- **YAGNI is the default.** The repository has rejected speculative tooling
  before, in this exact area and in writing
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s rejection of a
  token pipeline as "tooling built years ahead of the need"). A yes has to
  point at a need that exists.
- [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md): this earns an
  ADR either way. "We considered a design system and decided against it, for
  these reasons, revisit when X" is exactly the kind of decision that vanishes
  from a codebase if it is not written down — and its absence is what let the
  question sit open for five iterations.
- [ADR-0020](../../adr/0020-documentation-roles.md): if the answer involves
  documentation, each fact gets one home. A design system that restates what
  `docs/architecture.md` §5 and
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) already say is a
  fourth copy to keep in step.
- The [backlog](../backlog.md)'s mobile-client entry is the strongest live
  argument for extraction and the strongest reason to wait: a native client
  cannot consume CSS custom properties, and nothing is deployed.

## Open questions

1. **What would a design system be, here?** Documentation of the primitives; a
   rendered component catalogue; usage rules a reviewer can cite; a separate
   package; or all four. They have wildly different costs and only one of them
   is "a folder move".
2. **What is the need it serves?** One app, one frontend, no second consumer,
   and — per this iteration's evidence — a token convention that held across
   forty components without enforcement. The honest question is what is
   actually going wrong that a design system would fix.
3. **Is a component catalogue worth it on its own?** A rendered page showing
   every primitive in every state is the one artefact that would have made this
   iteration easier, independently of whether anything is extracted — and
   [task 01](01-how-a-design-task-runs.md) may already have built something
   like it for prototyping.
4. **Does [iteration 8](../iteration-8.md) change the answer?** It adds
   catalog-contribution forms, the first UI written under the new identity
   rather than converted to it. That is the first real test of whether a new
   feature can inherit the identity without a system telling it how — and it
   happens right after this task.
5. **What is the revisit trigger?** If the answer is no, it needs one that can
   actually fire, rather than lapsing the way
   [ADR-0033](../../adr/0033-keycloak-account-relinking.md)'s did — which
   [iteration 6.5 task 08](../iteration-6.5/08-revisit-account-linking.md) had
   to be written to fix.
6. **Who is the system for?** A design system's usual purpose is coordinating
   people. Kalia has one product owner and agents. Whether that makes it more
   valuable — agents forget, documents do not — or less, is the interesting
   version of this question.

## Acceptance criteria

- [ ] An inventory of what the redesign produced exists — every shared
      component, where it is used, and whether it recurred or was a one-off —
      as the evidence the decision cites
- [ ] An ADR records the decision, names the rejected alternatives, and states
      at least one Bad or Neutral consequence, passing
      `node scripts/check-adrs.mjs`
- [ ] If the answer is no, the ADR states a revisit trigger that can fire — a
      condition someone would notice — rather than a date or an intention
- [ ] If the answer is yes, the ADR states what gets built, where it lives,
      which facts move into it and which stay in
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md),
      `docs/architecture.md` §5 and `frontend/README.md` — and the tasks that
      build it are written, not started
- [ ] `docs/architecture.md` §5's "seam for a possible future design-system
      extraction" wording is replaced by whatever is now true, since it is the
      sentence this task exists to resolve
- [ ] The ADR names the test or check that would prove the decision is being
      followed, if any, without writing it here
- [ ] `node scripts/check-adrs.mjs` and `node scripts/check-tasks.mjs` pass

## Notes

Requested by the product owner on 2026-09-12, in these words: this is something
they do not know whether the project needs, and they want the conversation to
happen through a task rather than be settled by an agent's assumption either
way.

Placed last in the iteration deliberately, and the iteration index records the
cost of that: the six surfaces are built before the system is named, so
anything extracted here is extracted from code that already exists.

This task produces no production code unless the answer is yes and the work is
small enough to ride along, so it likely takes
[ADR-0026](../../adr/0026-task-file-format.md)'s automated-test exception — the
one [iteration 7 task 05](../iteration-7/05-feed-delivery-decision.md) and
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md) each took.
