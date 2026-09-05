# Shortcuts for common local-dev commands, and — since ADR-0046 — the
# verification gate agents run too. `verify` and `verify-fast` are the one
# place the check list lives; CLAUDE.md and the skills name the target
# rather than restating what it runs, so there is exactly one thing to keep
# in sync with CI.

.PHONY: help up down restart logs ps backend-test backend-verify frontend-test \
        frontend-build frontend-e2e lint check api-drift keycloak-check verify \
        verify-fast install-hooks next-adr

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

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

frontend-test: ## Run frontend unit tests
	(cd frontend && npm test)

frontend-build: ## Production build of the frontend (includes type checking)
	(cd frontend && npm run build)

frontend-e2e: ## Run frontend E2E tests (needs the stack up)
	(cd frontend && npm run test:e2e)

lint: ## Lint the frontend
	(cd frontend && npm run lint)

check: ## Run doc/task/comment/glossary consistency checks
	node scripts/check-adrs.mjs
	node scripts/check-tasks.mjs
	node scripts/check-comments.mjs
	node scripts/check-glossary.mjs
	node --test scripts/check-glossary.test.mjs

api-drift: ## Fail if the committed API client has drifted from the live spec (needs Docker)
	docker compose up -d --build backend postgres
	@i=0; until curl -sf http://localhost:8080/actuator/health >/dev/null; do \
	    i=$$((i + 1)); \
	    [ $$i -lt 60 ] || { echo "backend never became healthy"; exit 1; }; \
	    sleep 2; \
	done
	(cd frontend && npm run generate:api)
	git diff --exit-code -- frontend/lib/api/generated

keycloak-check: ## Fail if Keycloak's realm rejects sign-in for the seeded dev account (needs Docker)
	docker compose up -d --build --wait postgres keycloak
	docker compose up -d --build keycloak-seed
	@i=0; until node scripts/check-keycloak-signin.mjs testuser testuser123; do \
	    i=$$((i + 1)); \
	    [ $$i -lt 30 ] || exit 1; \
	    sleep 2; \
	done

verify-fast: check lint frontend-test ## Everything CI checks that needs neither Docker nor a build (the pre-push gate)

verify: verify-fast frontend-build backend-verify api-drift keycloak-check frontend-e2e ## Every check CI runs, in CI's order (needs Docker)

install-hooks: ## Install scripts/hooks/pre-push as this repository's git pre-push hook
	@dest="$$(git rev-parse --git-common-dir)/hooks/pre-push"; \
	if [ -e "$$dest" ] && ! cmp -s scripts/hooks/pre-push "$$dest"; then \
	    echo "$$dest already exists and differs — move it aside first"; exit 1; \
	fi; \
	install -m 755 scripts/hooks/pre-push "$$dest"; \
	echo "installed $$dest (a copy — re-run after editing scripts/hooks/pre-push)"

next-adr: ## Print the next unused ADR number (scans every branch, not just this one)
	@git fetch --quiet --prune origin 2>/dev/null || echo "warning: fetch failed — remote-tracking refs may be stale" >&2
	@node scripts/next-adr.mjs
