# Task 08: Revisit account linking now that both of ADR-0033's premises have moved

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-4

## Why

[ADR-0033](../../adr/0033-keycloak-account-relinking.md) set
`allowDangerousEmailAccountLinking: true` on the Keycloak provider. Both of the
things that made that safe change in this iteration.

**Its motivating problem largely disappears.** The ADR's Context is built on the
dev stack reimporting its realm on every start and handing `testuser` a new
`sub` each time, which strands the Valkey account index and locks the user out.
[Task 01](01-persist-keycloak-state.md) makes `sub` stable. The production-side
case the ADR also names — a Keycloak user deleted and recreated with the same
email — survives, but it is rarer than the one that drove the decision.

**Its safety argument gets a caveat.** The ADR is explicit that the flag is safe
"specifically because Keycloak is the *only* provider this app registers", and
sets a revisit trigger: "a second sign-in provider is added".
[Task 07](07-google-as-a-sign-up-route.md) adds one — but brokered *inside*
Keycloak, so Auth.js still sees a single provider and **the trigger never
fires**. The risk the flag's name warns about nonetheless reappears one layer
down, in Keycloak's own first-broker-login flow, where a Google account
presenting an email that already belongs to a password account is exactly the
collision the flag is dangerous about.

A revisit trigger that cannot fire is worse than none, because it reads as
coverage. That is the drift this task exists to close, and it has to be closed
in the same iteration that creates it.

## Scope

Two decisions, recorded where [ADR-0020](../../adr/0020-documentation-roles.md)
says they belong: whether Auth.js keeps `allowDangerousEmailAccountLinking`
now that its main justification is gone, and what Keycloak's first-broker-login
flow does when a brokered account claims an email that already exists.

Whatever ADR-0033 says afterwards has to be true, including its revisit
trigger.

## Non-goals

- Adding Google — [task 07](07-google-as-a-sign-up-route.md). This decides how
  it behaves at the edge, not whether it exists.
- A Kalia-side UI for linking or unlinking accounts.
- Changing how the backend identifies a user.
  [ADR-0028](../../adr/0028-resource-server-and-current-user.md)'s `sub` key is
  untouched by any answer here, which is precisely why the blast radius is
  bounded.

## Constraints

- **An accepted ADR is amended, not rewritten**
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)). ADR-0033 either
  gains a dated amendment or is superseded by a new ADR that says so.
- `node scripts/check-adrs.mjs` enforces the index and structure, and
  `docs/architecture.md` §9 and [docs/adr/README.md](../../adr/README.md) must
  agree with whatever changes.
- **This fails silently in the dangerous direction.** Account linking that is
  too permissive shows no error; it hands one person's cellar to another. There
  is no failing test to notice it after the fact, so the decision has to be
  pinned by a test written on purpose.
- Depends on [task 01](01-persist-keycloak-state.md) (stable `sub`) and
  [task 07](07-google-as-a-sign-up-route.md) (a second provider to collide
  with) having landed, which is why it runs last.

## Open questions

1. **Does `allowDangerousEmailAccountLinking` stay?** With `sub` stable, the
   remaining case is an administrator deleting and recreating a Keycloak user.
   Removing the flag restores the strict default and reintroduces a lockout
   with no self-service recovery; keeping it keeps a flag whose stated
   justification has shrunk.
2. **What does Keycloak's first-broker-login flow do on an email collision?**
   Automatically link, require the user to prove the existing account by
   signing into it, require an email confirmation, or refuse and create nothing.
   Keycloak's default is not automatic linking, and accepting the default
   without deciding is what this task forbids.
3. **Is Google's `email_verified` claim trusted as proof of the address?** It is
   the whole basis on which linking could be safe, and it is a claim from a
   third party.
4. **Does the stale-index clutter ADR-0033 accepted still get accepted?** It
   noted orphaned `auth:account-index:keycloak:<old-sub>` keys that are never
   removed. A stable `sub` means far fewer of them, which either makes the
   consequence moot or makes cleaning them cheap enough to bother with.
5. **Amendment or supersession?** Depends on how much of ADR-0033's decision
   survives question 1, and the answer changes what a reader of the old ADR
   is told.
6. **Is there a general lesson about revisit triggers?** A trigger phrased in
   terms of one layer's view of the world ("a second provider in Auth.js")
   missed a change that mattered. Whether that is worth a line in
   [ADR-0019](../../adr/0019-adr-format-and-conventions.md) or is a one-off is
   a judgement, not an obvious yes.

## Acceptance criteria

- [ ] ADR-0033 is amended or superseded so that every sentence in it is true of
      the system as it then stands, including its revisit trigger, and
      `node scripts/check-adrs.mjs` passes
- [ ] A brokered sign-in whose email already belongs to an existing account
      behaves the way question 2 decided — covered by an automated test that
      names the decision and was confirmed to fail against the other behaviour
- [ ] A test pins whether `allowDangerousEmailAccountLinking` is set, so a
      later change to it is a deliberate, reviewed edit rather than a silent one
- [ ] Two accounts with the same email cannot end up sharing one cellar,
      demonstrated end to end against the running stack rather than argued
- [ ] `docs/architecture.md` §6's account-linking paragraph matches the
      outcome

## Notes

Found while sketching this iteration on 2026-08-29. The finding is not that
ADR-0033 was wrong — it was right for the system it described — but that
[task 01](01-persist-keycloak-state.md) and
[task 07](07-google-as-a-sign-up-route.md) between them invalidate its context
while leaving its own revisit trigger silent.
