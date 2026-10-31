# Shortcuts for common local-dev commands, and — since ADR-0046 — the
# verification gate agents run too. `verify` and `verify-fast` are the one
# place the check list lives; CLAUDE.md and the skills name the target
# rather than restating what it runs, so there is exactly one thing to keep
# in sync with CI. `verify` runs every CI check but one: the two image scans in
# vulnerability-scan.yml stay CI-only, since building both images costs
# minutes per run (ADR-0046).

.PHONY: help up down restart logs ps backend-test backend-verify web-test packages-test \
        web-build web-e2e lint check compose-check api-drift api-breaking openapi-spec \
        keycloak-check trivy-scan verify \
        verify-fast install-hooks next-adr sync-indexes stack-env moderate

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

stack-env: ## Give this worktree its own host ports for the stack, so it can run beside another's (writes the root .env)
	node scripts/stack-env.mjs

moderate: ## Approve, reject or remove everything one contributor added to the catalog: make moderate ACTION=approve|reject|remove WHO=<username or id> (needs the stack's postgres up)
	@test -n "$$ACTION" -a -n "$$WHO" || { echo "usage: make moderate ACTION=approve|reject|remove WHO=<username or id>"; exit 1; }
	docker compose exec -T postgres psql -U kalia -d kalia -v action="$$ACTION" -v who="$$WHO" < scripts/moderate-contributor.sql

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

web-test: ## Run the web app's unit tests
	npm test --workspace web

packages-test: ## Run the shared packages' unit tests (the client's fetch core, the strings, the platform-neutrality rule)
	npm test --workspace @kalia/api --workspace @kalia/locales

web-build: ## Production build of the web app (includes type checking)
	npm run build --workspace web

web-e2e: ## Run the web app's E2E tests (needs the stack up)
	npm run test:e2e --workspace web

lint: ## Lint the web app and the shared packages
	npm run lint --workspace web --workspace @kalia/api --workspace @kalia/locales

check: ## Run doc/task/comment/glossary/design-token/token-styling/contrast/keycloak-theme/raster/host-path/text-block/index/catalog-import/link checks and their self-tests
	node scripts/check-adrs.mjs
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
	node --test scripts/*.test.mjs

compose-check: ## Fail if the deployable compose file renders without a secret, or carries anything dev-only (needs the docker CLI, no daemon)
	node scripts/check-compose.mjs

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

api-breaking: ## Fail if backend/openapi.json breaks an installed app against origin/dev's copy (needs oasdiff, ADR-0093)
	@git fetch --quiet origin dev 2>/dev/null || echo "warning: fetch failed — origin/dev may be stale" >&2
	node scripts/check-api-breaking.mjs origin/dev

# check-keycloak-realm-config runs first and, on a stack that is already up,
# before keycloak-config reconciles the realm below — so a setting changed in
# the admin console fails the check instead of being healed and never reported
# (ADR-0054). With nothing running, a fresh realm is imported first so the
# check has something to compare against.
keycloak-check: ## Fail if Keycloak's realm rejects sign-in (web or mobile client), has drifted from keycloak/realm-export.json, or loses an account to a fresh container (needs Docker)
	@docker compose up -d --build --wait --wait-timeout 120 edge
	@docker compose ps --status running --quiet keycloak | grep -q . \
	    || { docker compose up -d --build --wait --wait-timeout 120 postgres keycloak edge \
	         && docker compose run --rm keycloak-config; }
	node scripts/check-keycloak-realm-config.mjs
	docker compose up -d --build keycloak-seed
	node scripts/check-keycloak-signin.mjs testuser testuser123
	node scripts/check-keycloak-pkce-flow.mjs testuser testuser123
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

verify-fast: check lint web-test packages-test api-drift ## Everything CI checks that needs neither Docker nor a build (the pre-push gate)

verify: verify-fast compose-check web-build backend-verify api-breaking keycloak-check trivy-scan web-e2e ## Every check CI runs but the image scans, in CI's order (needs Docker and trivy)

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
