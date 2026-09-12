-- Feed module: a record of things that happened (docs/architecture.md §3,
-- ADR-0053). One schema per module (docs/architecture.md §3); feed is the
-- first consumer of a cellar application event.
CREATE SCHEMA IF NOT EXISTS feed;

-- One row per act, frozen at write time and never updated afterwards
-- (ADR-0058). user_id and beer_id are cross-module references by id only, no
-- foreign key (docs/architecture.md §3). event_id is the idempotency key for
-- the at-least-once event publication registry (ADR-0058).
CREATE TABLE feed.line (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        uuid NOT NULL UNIQUE,
    user_id         uuid NOT NULL,
    beer_id         uuid NOT NULL,
    quantity        integer NOT NULL,
    brewed_date     date,
    occurred_at     timestamptz NOT NULL,
    sequence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The table is read newest-first and grows forever; an unindexed feed
-- degrades quietly as it fills rather than failing (ADR-0058).
CREATE INDEX line_sequence_number_idx ON feed.line (sequence_number);

-- Whose cellar the line came from, queryably (docs/architecture.md §3).
CREATE INDEX line_user_id_idx ON feed.line (user_id);
