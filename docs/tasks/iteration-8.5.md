# Iteration 8.5 — Quality sprint before mobile

Goal: the API a mobile client is about to inherit is complete, typed and
pruned, and Kalia carries no known MUST, no unbounded anonymous cost and no
dev credential a deployment could inherit by omission.

## Done when

The OpenAPI spec describes every response the API sends, with the shape it is
sent in, and nothing in `/api/v1` is there without a consumer or a recorded
reason. No MUST is open in the [quality backlog](quality-backlog.md). Every
anonymous read and every unauthenticated route has a bound that does not
depend on what one account chose to store or send. The stack refuses to start
as a deployment without its secrets. `CLAUDE.md` has room for iteration 9's
additions, and CI blocks a merge that fails it. Each finding this iteration
lifted is fixed, or its decision is recorded where its task says.

## Tasks

| ID | Task | Status |
|---|---|---|
| [09](iteration-8.5/09-sign-up-limiter-cannot-lock-forever.md) | The sign-up limiter can never lock sign-up for good | done |
| [19](iteration-8.5/19-docs-match-iteration-8.md) | The documentation says what iteration 8 built, once | done |
| [01](iteration-8.5/01-api-errors-complete-and-typed.md) | Every API error is documented and typed as it is sent | done |
| [02](iteration-8.5/02-api-contract-pruned-before-it-freezes.md) | The API sheds what nobody uses before mobile freezes it | refined |
| [03](iteration-8.5/03-concurrent-bottle-writes-lose-nothing.md) | Two writes to one cellar entry never silently lose a bottle | done |
| [04](iteration-8.5/04-no-silent-single-instance-assumptions.md) | The backend assumes one instance only where it says so | done |
| [05](iteration-8.5/05-brewery-questions-answered-by-the-api.md) | The API answers the add-beer form's questions itself | refined |
| [06](iteration-8.5/06-generated-client-ready-to-share.md) | The generated client is what a shared package should hold | done |
| [07](iteration-8.5/07-identity-owns-the-caller.md) | `identity` owns who the caller is, and services own who may read what | done |
| [08](iteration-8.5/08-claude-md-within-its-budget.md) | CLAUDE.md fits its budget again, and says what is true | done |
| [10](iteration-8.5/10-unauthenticated-edges-throttled.md) | The unauthenticated edges are throttled and bounded | refined |
| [11](iteration-8.5/11-one-account-cannot-inflate-an-anonymous-read.md) | One account cannot make an anonymous read arbitrarily expensive | refined |
| [12](iteration-8.5/12-user-added-catalog-entries-governed.md) | Contributed catalog entries are reviewed, never deleted, and named cleanly | refined |
| [13](iteration-8.5/13-sessions-and-stack-credentials-hardened.md) | Sessions and the stack's credentials are safe beyond one laptop | refined |
| [14](iteration-8.5/14-cve-gate-and-updates-trustworthy.md) | The CVE gate and dependency updates do what they claim | done |
| [21](iteration-8.5/21-node-26-replaces-node-24.md) | Node 26 replaces Node 24 everywhere it is pinned | in-progress |
| [15](iteration-8.5/15-catalog-reads-hold-at-imported-size.md) | The catalog's lookup reads hold at the size it now is | refined |
| [16](iteration-8.5/16-observability-baseline.md) | A failure on the server can be seen and counted | refined |
| [17](iteration-8.5/17-ci-enforces-the-gate.md) | CI blocks a merge that fails it, and the Docker gate runs | in-progress |
| [18](iteration-8.5/18-process-records-and-skills-match-practice.md) | The PR record and the skills match how work is actually done | refined |
| [20](iteration-8.5/20-small-correctness-fixes.md) | Three small things that show the wrong thing are fixed | done |
| [22](iteration-8.5/22-each-worktree-runs-its-own-stack.md) | Each worktree can run its own stack at the same time as another | needs-refinement |

Numbered 8.5 for the reason [iteration 5.5](iteration-5.5.md) and
[iteration 7.5](iteration-7.5.md) were: iteration 9 is already drafted, and
this sprint has to land before it.

The tasks were chosen from the [2026-10-24 sweep](quality-backlog.md) and the
[backlog](backlog.md) in the product owner's priority order: what helps the
mobile client first (tasks 01–08), then security (09–14), then performance and
architecture (15–17), then the rest (18–20). The table's order is the order of
work, with two exceptions to that grouping:

- **[09](iteration-8.5/09-sign-up-limiter-cannot-lock-forever.md) and
  [19](iteration-8.5/19-docs-match-iteration-8.md) come first** because each
  holds a MUST — the limiter bug and the glossary that contradicts the wire —
  and neither waits on another task.
- **[01](iteration-8.5/01-api-errors-complete-and-typed.md) precedes
  [05](iteration-8.5/05-brewery-questions-answered-by-the-api.md)**, since
  task 05's `409` follows task 01's decision on how an error's extra fields are
  declared.

Left out on purpose: the Keycloak pages' titles, the names registration asks
for and the password-reset autocomplete (backlog, COULD-26), which remain
backlog work; splitting `AddBeerDialog` (COULD-61); and COULD-65, the access
token outliving sign-out, which belongs to [iteration 9](iteration-9.md)'s
mobile-authentication decision rather than to a task of its own.
