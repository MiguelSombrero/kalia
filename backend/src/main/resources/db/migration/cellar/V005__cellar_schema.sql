-- Cellar module: entries and the bottles they own (docs/architecture.md §3).
-- One schema per module (docs/architecture.md §3); created here rather than
-- in common/V001 because that migration predates this module.
CREATE SCHEMA IF NOT EXISTS cellar;

-- One entry per (user, catalog beer); user_id and beer_id are cross-module
-- references by id only, no foreign key (docs/architecture.md §3).
CREATE TABLE cellar.entry (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    beer_id    uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, beer_id)
);

CREATE INDEX entry_user_id_idx ON cellar.entry (user_id);

-- Quantity is derived by counting these rows, never stored
-- (docs/architecture.md §3): no quantity column exists anywhere here.
CREATE TABLE cellar.bottle (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id         uuid NOT NULL REFERENCES cellar.entry (id) ON DELETE CASCADE,
    container_type   text NOT NULL CHECK (container_type IN ('BOTTLE', 'CAN', 'KEG')),
    brewed_date      date,
    best_before_date date,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bottle_entry_id_idx ON cellar.bottle (entry_id);
