# Shortcuts for common local-dev commands, and — since ADR-0046 — the
# verification gate agents run too. `verify` and `verify-fast` are the one
# place the check list lives; CLAUDE.md and the skills name the target
# rather than restating what it runs, so there is exactly one thing to keep
# in sync with CI. `verify` runs every CI check but one: the two image scans in
# vulnerability-scan.yml stay CI-only, since building the images costs
# minutes per run (ADR-0046).

.PHONY: help up down restart logs ps backend-test backend-verify repeat-it web-test packages-test mobile-lint mobile-test mobile-start mobile-metro-up mobile-metro-down mobile-ios mobile-ios-release mobile-ios-device mobile-ios-device-release mobile-android mobile-android-release mobile-doctor phone-mode phone-mode-off \
        web-build web-e2e lint check compose-check action-pins api-drift api-breaking openapi-spec \
        keycloak-check trivy-scan verify \
        verify-fast install-hooks next-adr sync-indexes stack-env app-config

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

stack-env: ## Give this worktree its own host ports for the stack, so it can run beside another's (writes the root .env)
	node scripts/stack-env.mjs

app-config: ## Set what the server tells the app: make app-config [IOS=<build>] [ANDROID=<build>] [MAINTENANCE=on|off] (needs the stack's postgres up; omitted settings stay as they are)
	@test -n "$$IOS$$ANDROID$$MAINTENANCE" || { echo "usage: make app-config [IOS=<build>] [ANDROID=<build>] [MAINTENANCE=on|off]"; exit 1; }
	docker compose exec -T postgres psql -U kalia -d kalia -v ios="$$IOS" -v android="$$ANDROID" -v maintenance="$$MAINTENANCE" < scripts/set-app-config.sql

up: ## Build and start the full stack in the background
	docker compose up --build -d

down: ## Stop the full stack
	docker compose down

restart: down up ## Restart the full stack

logs: ## Follow logs for all services
	docker compose logs -f

ps: ## Show status of all services
	docker compose ps

backend-test: ## Run backend unit tests (fast, no Docker)
	(cd backend && mvn test)

backend-verify: ## Run backend unit + integration tests from clean (needs Docker)
	(cd backend && mvn clean verify)

# Each run is its own Maven invocation, so it boots a fresh context and
# container (~20 s): slow, but the runs are independent, which is the point.
repeat-it: ## Run one integration test COUNT times (default 20), stopping at the first failure: make repeat-it TEST=Class#method [COUNT=n] (needs Docker)
	@case "$(TEST)" in *#*) ;; *) echo "usage: make repeat-it TEST=<Class>#<method> [COUNT=<n>]"; exit 2;; esac
	@count=$(or $(COUNT),20); \
	case "$$count" in ''|*[!0-9]*|0) echo "COUNT must be a positive integer, got '$$count'"; exit 2;; esac; \
	for i in $$(seq 1 $$count); do \
	    echo "repeat-it: run $$i of $$count: $(TEST)"; \
	    (cd backend && mvn -B -q verify -Dtest=NoSuch -Dsurefire.failIfNoSpecifiedTests=false -Dit.test='$(TEST)') \
	        || { echo "repeat-it: FAILED on run $$i of $$count"; exit 1; }; \
	done; \
	echo "repeat-it: $$count of $$count runs passed: $(TEST)"

web-test: ## Run the web app's unit tests
	npm test --workspace web

packages-test: ## Run the shared packages' unit tests (the client's fetch core, the strings, the platform-neutrality rule)
	npm test --workspace @kalia/api --workspace @kalia/locales

mobile-lint: ## Lint and type-check the mobile app (strict TypeScript; no Docker, no native build)
	npm run lint --workspace mobile

mobile-test: ## Run the mobile app's Jest unit tests (no network, no simulator)
	npm test --workspace mobile

mobile-start: ## Start Metro in the FOREGROUND for the development build (it never returns: an agent uses mobile-metro-up), on this worktree's METRO_PORT and with its stack as the origins; after a switch of mode add ARGS="--clear" (extra flags: ARGS="...")
	env $$(node scripts/mobile-env.mjs) npm start --workspace mobile -- $$(node scripts/phone-mode.mjs metro-args) $(ARGS)

mobile-metro-up: ## Start this worktree's Metro detached on its own METRO_PORT and return once it answers (exit 0), or fail with its log after 120 s (extra expo flags: ARGS="--clear")
	node scripts/mobile-metro.mjs up $(ARGS)

mobile-metro-down: ## Stop the Metro mobile-metro-up started for this worktree, and no other process
	node scripts/mobile-metro.mjs down

mobile-ios: ## Build the development build and run it on the iOS Simulator against this stack, leaving Metro detached and returning (extra flags: ARGS="--device 'iPhone 17e'")
	node scripts/mobile-native.mjs ios $(ARGS)

mobile-ios-release: ## Build the release build (JavaScript inside, no dev menu, no Metro) and run it on the iOS Simulator (extra flags: ARGS="...")
	node scripts/mobile-native.mjs ios --release $(ARGS)

mobile-ios-device: ## Build the development build and install it on the connected iPhone, signed with KALIA_APPLE_TEAM_ID from the root .env
	node scripts/mobile-native.mjs ios-device

mobile-ios-device-release: ## Build the release build and install it on the connected iPhone, so the app works with the Mac away; needs phone mode (make phone-mode HOST=...)
	node scripts/mobile-native.mjs ios-device --release

mobile-android: ## Build and run the development build on the Android emulator, leaving Metro detached and returning, with adb reverse for this stack's ports and the JDK the build needs; refuses in phone mode (extra flags: ARGS="...")
	node scripts/mobile-native.mjs android $(ARGS)

mobile-android-release: ## Build the release build (the end-to-end one: JavaScript inside, cleartext to localhost only) and run it on the Android emulator; refuses in phone mode (extra flags: ARGS="...")
	node scripts/mobile-native.mjs android --release $(ARGS)

mobile-doctor: ## Check the Mac's native toolchain for the app, naming each missing or wrong-version tool (ARGS="ios", "ios-device" or "android" for one platform; ARGS="phone" for the route to an iPhone)
	node scripts/mobile-doctor.mjs $(ARGS)

phone-mode: ## Let a phone reach this stack over the tailnet: make phone-mode HOST=<this Mac's tailnet name> (rewrites the root .env, recreates the services, replaces the machine's tailscale serve forwards)
	@test -n "$(HOST)" || { echo "usage: make phone-mode HOST=<this Mac's tailnet name>"; exit 1; }
	node scripts/phone-mode.mjs on "$(HOST)"

phone-mode-off: ## Back to localhost only: clear the phone host from the root .env, recreate the services, remove the tailscale serve forwards
	node scripts/phone-mode.mjs off

web-build: ## Production build of the web app (includes type checking)
	npm run build --workspace web

web-e2e: ## Run the web app's E2E tests (needs the stack up)
	npm run test:e2e --workspace web

lint: ## Lint the web app and the shared packages
	npm run lint --workspace web --workspace @kalia/api --workspace @kalia/locales --workspace @kalia/tokens

check: ## Run doc/size/task/comment/glossary/design-token/token-styling/contrast/keycloak-theme/raster/host-path/text-block/index/catalog-import/link/script-import/clear-text-logging/markup-stripping/failure-doc-path checks and their self-tests
	node scripts/generate-tokens.mjs --check
	node scripts/check-adrs.mjs
	node scripts/check-doc-size.mjs
	node scripts/check-tasks.mjs
	node scripts/check-comments.mjs
	node scripts/check-glossary.mjs
	node scripts/check-design-tokens.mjs
	node scripts/check-token-styling.mjs
	node scripts/check-contrast.mjs
	node scripts/check-keycloak-theme.mjs
	node scripts/check-no-raster-images.mjs
	node scripts/check-no-host-paths.mjs
	node scripts/check-text-blocks.mjs
	node scripts/sync-indexes.mjs --check
	node scripts/check-no-untappd.mjs
	node scripts/wikidata-migration.mjs --check
	node scripts/check-links.mjs
	node scripts/check-script-imports.mjs
	node scripts/check-clear-text-logging.mjs
	node scripts/check-markup-stripping.mjs
	node scripts/check-failure-doc-paths.mjs
	node --test scripts/*.test.mjs

compose-check: ## Fail if the deployable compose file renders without a secret, or carries anything dev-only (needs the docker CLI, no daemon)
	node scripts/check-compose.mjs

action-pins: ## Fail if a workflow pins an Action to a commit SHA its repository does not have (asks GitHub; GITHUB_TOKEN optional)
	node scripts/check-action-pins.mjs

# Two halves, neither needing a running backend (ADR-0093): the backend's own
# CommittedOpenApiSpecIT holds backend/openapi.json equal to what the
# application serves (it runs with `make backend-verify`), and this
# regenerates the client from that file and fails if the committed one differs
# (--intent-to-add, so a generated file nobody committed counts as a difference).
api-drift: ## Fail if the committed API client differs from what backend/openapi.json generates (no Docker, no backend)
	npm run generate --workspace @kalia/api
	git add --intent-to-add --all -- packages/api/src/generated
	git diff --exit-code -- packages/api/src/generated

openapi-spec: ## Rewrite backend/openapi.json from what the application serves, then regenerate the client (needs Docker)
	(cd backend && mvn -q -B -Dopenapi.write=true -Dit.test=CommittedOpenApiSpecIT -Dtest=NoSuch -Dsurefire.failIfNoSpecifiedTests=false verify)
	npm run generate --workspace @kalia/api

api-breaking: ## Report a change in backend/openapi.json that would break an installed app, against origin/dev's copy; fails only once ENFORCED is on in the script (needs oasdiff, ADR-0093)
	@git fetch --quiet origin dev 2>/dev/null || echo "warning: fetch failed — origin/dev may be stale" >&2
	node scripts/check-api-breaking.mjs origin/dev

# check-keycloak-realm-config runs first and, on a stack that is already up,
# before keycloak-config reconciles the realm below — so a setting changed in
# the admin console fails the check instead of being healed and never reported
# (ADR-0054). With nothing running, a fresh realm is imported first so the
# check has something to compare against.
keycloak-check: ## Fail if Keycloak's realm rejects sign-in (web or mobile client), has drifted from keycloak/realm-export.json, lets anyone but testadmin hold the admin role or lets the app's token carry it, or loses an account to a fresh container (needs Docker)
	@docker compose up -d --build --wait --wait-timeout 120 edge
	@docker compose ps --status running --quiet keycloak | grep -q . \
	    || { docker compose up -d --build --wait --wait-timeout 120 postgres keycloak edge \
	         && docker compose run --rm keycloak-config; }
	node scripts/check-keycloak-realm-config.mjs
	docker compose up -d --build keycloak-seed
	node scripts/check-keycloak-signin.mjs testuser testuser123
	node scripts/check-keycloak-pkce-flow.mjs testuser testuser123
	docker compose up -d --build --wait --wait-timeout 300 backend
	node scripts/check-keycloak-admin.mjs testadmin testuser testuser123 --backend
	docker compose up -d --force-recreate --no-deps --wait --wait-timeout 120 keycloak
	node scripts/check-keycloak-signin.mjs testuser testuser123

# Flags match the manifest scan in vulnerability-scan.yml, which scans `.`;
# here the two manifests are named, because `.` would also walk node_modules
# and target. A new manifest elsewhere needs a line below. Trivy is a local
# prerequisite (`brew install trivy`); it does not pick the ignore file up
# on its own, so it is named here as the workflow's `trivyignores` input does.
trivy-scan: ## Fail on a fixable HIGH/CRITICAL CVE in package-lock.json or pom.xml, as CI does (needs trivy)
	@command -v trivy >/dev/null || { echo "trivy is not installed — brew install trivy, or see https://trivy.dev"; exit 1; }
	trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --ignorefile .trivyignore.yaml package-lock.json
	trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 --ignorefile .trivyignore.yaml backend/pom.xml

verify-fast: check lint web-test packages-test mobile-lint mobile-test api-drift api-breaking ## Everything CI checks that needs neither Docker nor a build (the pre-push gate; needs oasdiff)

# Waits for the seed to exit, which `up -d` alone does not. Not `run`, which
# recreated postgres and keycloak under the running backend on one runner (CI
# run 43440449766, cause not established); --no-recreate rules that out.
.PHONY: seed-accounts
seed-accounts: ## Create testuser and testadmin in the running stack and wait until they exist (needs Docker)
	docker compose up -d --no-recreate keycloak-seed
	@docker compose wait keycloak-seed > /dev/null \
	    || { docker compose logs --no-color keycloak-seed; exit 1; }

# The flows in mobile/.maestro/ on every simulator or emulator this host has
# (ADR-0096). It starts the stack and seeds the sign-in flow's account itself,
# as web-e2e does, and fails when no platform ran. Maestro is a one-off
# download: node scripts/mobile-e2e.mjs install-maestro
.PHONY: mobile-e2e
mobile-e2e: ## Run the mobile end-to-end flows on the iOS Simulator and Android emulator this host has; fails if neither ran; refuses in phone mode (needs Docker and Maestro; one platform: ARGS="--platform ios")
	@node scripts/phone-mode.mjs refuse "make mobile-e2e"
	docker compose up -d --build --wait --wait-timeout 300 edge backend keycloak
	$(MAKE) seed-accounts
	node scripts/mobile-e2e.mjs $(ARGS)

verify: verify-fast compose-check action-pins web-build backend-verify keycloak-check trivy-scan web-e2e mobile-e2e ## Every check CI runs but the image scans, in CI's order (needs Docker and trivy)

install-hooks: ## Install scripts/hooks/pre-push as this repository's git pre-push hook
	@dest="$$(git rev-parse --git-common-dir)/hooks/pre-push"; \
	if [ -e "$$dest" ] && ! cmp -s scripts/hooks/pre-push "$$dest"; then \
	    echo "$$dest already exists and differs — move it aside first"; exit 1; \
	fi; \
	install -m 755 scripts/hooks/pre-push "$$dest"; \
	echo "installed $$dest (a copy — re-run after editing scripts/hooks/pre-push)"

sync-indexes: ## Copy each ADR's and task's title and status into its index row
	node scripts/sync-indexes.mjs

next-adr: ## Print the next unused ADR number (scans every branch, not just this one)
	@git fetch --quiet --prune origin 2>/dev/null || echo "warning: fetch failed — remote-tracking refs may be stale" >&2
	@node scripts/next-adr.mjs
