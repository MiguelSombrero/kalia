# Iteration 6.5 — Sign-up

Goal: someone other than the author can create a Kalia account.

## Done when

- **DW-1:** A Keycloak account created today is still there, and still signs
  in, after `docker compose restart` and after `docker compose down` and up
  again without `-v`.
- **DW-2:** One committed realm file configures every environment, carries no
  credential and no localhost literal, and still describes the running realm
  after someone changes a realm setting — with a check that fails if it does
  not.
- **DW-3:** A visitor with no account creates one with an email address and a
  password, proves the address is theirs, and reaches their own empty cellar
  signed in, without an operator touching Keycloak — and the suites that
  cover it pass twice in a row on the same stack.
- **DW-4:** A visitor can instead create an account with Google, and what
  happens when that Google address already belongs to a Kalia account is a
  decision someone made, recorded in an ADR whose revisit trigger can
  actually fire.
- **DW-5:** The pages where all of this happens are recognisably Kalia and
  appear in the language the user was already reading, Finnish or English.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-6.5/01-persist-keycloak-state.md) | Persist Keycloak's state across restarts | refined |
| [02](iteration-6.5/02-parameterise-realm-configuration.md) | One realm file for every environment | refined |
| [03](iteration-6.5/03-prevent-realm-configuration-drift.md) | Keep realm configuration from drifting once the import stops running | refined |
| [04](iteration-6.5/04-send-email-from-kalia.md) | Give Kalia a way to send email | refined |
| [05](iteration-6.5/05-self-registration-with-email-verification.md) | Self-registration with email verification | refined |
| [06](iteration-6.5/06-kalia-branded-bilingual-auth-pages.md) | Kalia-branded, bilingual Keycloak pages | refined |
| [07](iteration-6.5/07-google-as-a-sign-up-route.md) | Google as a second sign-up route | refined |
| [08](iteration-6.5/08-revisit-account-linking.md) | Revisit account linking now that both of ADR-0033's premises have moved | refined |
| [09](iteration-6.5/09-deterministic-test-accounts.md) | Keep the test suites deterministic against a Keycloak that no longer resets | refined |
| [10](iteration-6.5/10-remove-beer-price.md) | Remove the beer price property | refined |
| [11](iteration-6.5/11-concurrent-add-bottle-race.md) | Fix the concurrent add-bottle 500 and lost write | refined |
| [12](iteration-6.5/12-bottle-future-date-uses-local-day.md) | Judge a bottle's brewed date against the user's local day | refined |
| [13](iteration-6.5/13-align-current-user-service-convention.md) | Make the caller-identity convention match the code | done |
| [14](iteration-6.5/14-fix-api-client-doc-contradiction.md) | Resolve architecture.md's contradiction about the API client | done |

Numbered 6.5 rather than inserted as a renumbered 7, for the same reason
[iteration 5.5](iteration-5.5.md) was: iterations 6–8 are already drafted under
`docs/tasks/iteration-6/` through `iteration-8/`, and `scripts/check-tasks.mjs`
accepts one decimal place in an iteration directory name for exactly this case.

Placed after [iteration 6](iteration-6.md) rather than before it, because
public cellars are what make a second real account worth having — but the two
do not otherwise depend on each other, and if the product owner would rather
have strangers before public cellars, this iteration can run first without
changing any task in it. **One caveat if the order does change:**
[task 05](iteration-6.5/05-self-registration-with-email-verification.md)'s
question 2 (what the sign-up form asks for) and
[iteration 6 task 01](iteration-6/01-profile-and-visibility.md)'s question 3
(where a profile's display name comes from) are the same decision seen from two
sides. Whichever is refined first should settle it deliberately, not by
accident.

The order in the table is the order of work, and here it is closer to a
constraint than a recommendation. Tasks 01–03 are infrastructure the rest
stands on: nothing about sign-up can be honestly verified while every account
is destroyed at the next restart, and
[task 03](iteration-6.5/03-prevent-realm-configuration-drift.md) is deliberately
ahead of the three tasks that each add realm configuration, because
retrofitting it means reverse-engineering a live database back into a file.
[Task 08](iteration-6.5/08-revisit-account-linking.md) runs last because it
needs both [01](iteration-6.5/01-persist-keycloak-state.md) and
[07](iteration-6.5/07-google-as-a-sign-up-route.md) to have landed before there
is anything to decide.

This iteration comes from a sign-up options analysis on 2026-08-29. Its two
externally-checked conclusions are recorded here so they are not re-researched:

- **Third-party OAuth providers are not excluded by the no-paid-plans
  constraint.** Google's `openid`/`email`/`profile` scopes are non-sensitive —
  no verification review, no payment, no contract — and GitHub OAuth apps are
  free. Apple is excluded (paid developer programme) and Facebook in practice
  (business verification).
- **Suomi.fi is unavailable, on eligibility rather than cost.** Private
  operators have no right to use Suomi.fi-tunnistus except when performing a
  public administration task; it is free only for public-administration bodies
  and their owned companies, and taking it into use requires a käyttölupa
  application to DVV. The commercial route to the same bank credentials is a
  paid contract with a Traficom-registered broker. It would also be
  disproportionate: strong identification yields henkilötunnus-grade identity
  for an app that sells nothing.

Four of the nine tasks were not in that analysis and came out of sketching the
iteration against the code. Each is a thing that breaks or rots quietly:
[03](iteration-6.5/03-prevent-realm-configuration-drift.md) (a persistent realm
stops being described by its committed file, because `--import-realm` skips a
realm that already exists),
[06](iteration-6.5/06-kalia-branded-bilingual-auth-pages.md) (Keycloak's pages
are English-only and outside [ADR-0011](../adr/0011-i18next-localization.md)'s
reach entirely, so a bilingual app has a monolingual front door),
[08](iteration-6.5/08-revisit-account-linking.md)
([ADR-0033](../adr/0033-keycloak-account-relinking.md)'s revisit trigger cannot
fire for a provider brokered inside Keycloak, so its stated safety argument
lapses silently), and
[09](iteration-6.5/09-deterministic-test-accounts.md) (the Playwright suite
relies on the realm being wiped every start, and CI's fresh stack hides the
breakage from everyone but the developer).

[Task 10](iteration-6.5/10-remove-beer-price.md) does not serve this
iteration's "Done when" (`Covers: none`) and is not about sign-up at all — it
removes the vestigial beer `price` field, a leftover of the deprecated
sell-beer vision ([ADR-0004](../adr/0004-backend-cart.md),
[ADR-0005](../adr/0005-defer-auth-mock-payments.md)). It rides along here
because it is small, product-owner-requested from
[PR #221](https://github.com/MiguelSombrero/kalia/pull/221)'s review, and 6.5
is the next open iteration; it depends on nothing else in it and can run in
any position.

[Tasks 11–14](iteration-6.5/11-concurrent-add-bottle-race.md) are riders too
(`Covers: none`, none about sign-up) — four MUST findings the product owner
lifted from the [quality backlog](quality-backlog.md) on 2026-09-04, chosen by
impact: **MUST-8** (task 11) and **MUST-9** (task 12) are user-facing cellar
bugs; **MUST-3** (task 13) is a documented backend convention that produces
wrong code in
[iteration-6 task 02](iteration-6/02-public-cellar-api.md); **MUST-5**
(task 14) is a self-contradiction in `docs/architecture.md`. Each depends on
nothing else in this iteration and can run in any position. The
`[needs decision]` points on MUST-3, MUST-8 and MUST-9 were settled in the
lifting conversation and are recorded in the task files as constraints.

One thing is deliberately **not** a task here. The
[backlog](backlog.md)'s GDPR entry — account deletion, data export, consent —
says it "becomes real the moment anyone but the author uses this", and
[task 05](iteration-6.5/05-self-registration-with-email-verification.md) is
that moment in mechanism if not yet in fact. It stays in the backlog because
nothing is deployed and no real person can register, and it is recorded here
as a reason not to deploy this iteration's work without picking it up first.
