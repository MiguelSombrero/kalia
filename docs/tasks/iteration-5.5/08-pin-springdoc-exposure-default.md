# Task 08: Pin the springdoc production-exposure default with a test

- **Status:** needs-refinement
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

`application.properties` sets `springdoc.api-docs.enabled` and
`springdoc.swagger-ui.enabled` to `${SPRINGDOC_ENABLED:false}` — verified
fail-safe by inspection, but by nothing automated. `pom.xml`'s
failsafe-plugin configuration sets both to `true` for every integration-test
run (needed so `*IT` tests can exercise Swagger UI), so no test ever
exercises the actual production default — an edit flipping the property's
fallback to `true` would pass CI unnoticed.

The Actuator half of this same class of gap is already resolved:
`KaliaApplicationIT.unexposedActuatorEndpointsAreNotReachable` pins the
declared Actuator exposure with an authenticated request. This task does the
same for springdoc.

## Scope

A test that starts the application *without* the failsafe override (or
otherwise proves the property's fallback value) and asserts
`/v3/api-docs` and `/swagger-ui/index.html` are unreachable by default.

## Non-goals

- Changing the default itself — it is already `false`, correctly.
- The failsafe plugin's IT-time override — that stays, since `*IT` tests need
  Swagger UI reachable.

## Constraints

- Must not rely on the same `pom.xml` failsafe override this finding is
  about — a test that inherits `SPRINGDOC_ENABLED=true` from the failsafe
  configuration would pass even against a flipped default, which is exactly
  the gap being closed.

## Open questions

**None.**

## Acceptance criteria

- [ ] A new test (unit or a `*Test`/`*IT` run outside the failsafe
      springdoc override) asserts `/v3/api-docs` and
      `/swagger-ui/index.html` are unreachable with no `SPRINGDOC_ENABLED`
      override set — confirmed to fail if the property's fallback is
      temporarily flipped to `true` locally
- [ ] `mvn clean verify` is green

## Notes

Quality backlog: COULD-9.
