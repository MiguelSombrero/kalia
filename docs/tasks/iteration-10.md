# Iteration 10 — Kalia on your own iPhone

Goal: Kalia runs on the product owner's physical iPhone against the stack on
their Mac, signed with a free Apple ID, and reinstalling it every seven days is
a documented routine rather than a surprise.

## Done when

- **DW-1:** `mobile/README.md` takes a developer from a clean iPhone to Kalia
  installed on it, at no cost.
- **DW-2:** On the phone, Kalia signs in against the Keycloak running on the
  Mac and browses the catalog served from it, without breaking the browser or
  simulator setup.
- **DW-3:** The routine for re-signing after the free Apple ID's seven-day
  expiry is written down and has been carried out once.
- **DW-4:** A release-mode build — bundled JavaScript, no dev menu — runs on
  both the iPhone and the Android emulator.
- **DW-5:** How a real phone reaches the Mac, and where app errors are visible
  without a paid service, are each a recorded decision.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

- **Decision: how a real phone reaches the Mac** — Tailscale (a stable
  `*.ts.net` HTTPS name), the Mac's address on the same Wi-Fi, or a tunnel;
  what Keycloak's issuer becomes; how the stack serves the phone without
  breaking `localhost`.
- **Implement that decision** — stack configuration, Keycloak hostname and
  redirect URIs, the app's API base URL per build variant.
- **App identity** — bundle identifier, app name, icon and splash screen;
  shipped assets go on the raster-image check's allowlist.
- **Free Apple ID signing** — Xcode's Personal Team, trusting the developer on
  the phone, the seven-day re-signing routine, and the account's limits written
  down so that no later task plans on push notifications, universal links or
  testers.
- **Build variants** — development (dev menu, Metro) and release builds on
  both platforms; versioning and build-number rules.
- **Decision: error visibility without a paid service** — local logging only
  for now, or a crash service whose free tier needs no card; if neither fits,
  recorded as deferred.

This comes before the design work in [iteration 11](iteration-11.md) on
purpose. Signing and device networking are where a first mobile project loses
days, which is cheaper to find out with almost nothing built; and a design
judged by hand needs a real phone — the simulator has no haptics and no
camera, and no thumb.
