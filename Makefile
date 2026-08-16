# Shortcuts for common local-dev commands. Human convenience only — Claude
# Code agents follow CLAUDE.md's ## Commands section directly, not these
# targets, so there is exactly one place either of us has to keep in sync.

.PHONY: help up down restart logs ps backend-test backend-verify frontend-test frontend-e2e lint check

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

backend-verify: ## Run backend unit + integration tests (needs Docker)
	(cd backend && mvn verify)

frontend-test: ## Run frontend unit tests
	(cd frontend && npm test)

frontend-e2e: ## Run frontend E2E tests (needs the stack up)
	(cd frontend && npm run test:e2e)

lint: ## Lint the frontend
	(cd frontend && npm run lint)

check: ## Run doc/task/comment consistency checks
	node scripts/check-adrs.mjs
	node scripts/check-tasks.mjs
	node scripts/check-comments.mjs
