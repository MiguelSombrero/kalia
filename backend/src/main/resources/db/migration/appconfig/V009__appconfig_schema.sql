-- App-config module: what the server tells an installed app about itself
-- (docs/architecture.md §3, ADR-0093). One schema per module.
CREATE SCHEMA IF NOT EXISTS appconfig;

-- Exactly one row, changed by an operator through `make app-config`
-- (backend/README.md), never by the application. It starts permissive, so no
-- build is blocked until an operator says so.
CREATE TABLE appconfig.app_config (
    id                    smallint PRIMARY KEY CHECK (id = 1),
    minimum_build_ios     integer NOT NULL DEFAULT 0 CHECK (minimum_build_ios >= 0),
    minimum_build_android integer NOT NULL DEFAULT 0 CHECK (minimum_build_android >= 0),
    maintenance           boolean NOT NULL DEFAULT false
);

INSERT INTO appconfig.app_config (id) VALUES (1);
