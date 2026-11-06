-- One row per decision on a contributed beer (ADR-0102): the only trail of who
-- decided what, now that no script does it. beer_id is a catalog row, so it has a
-- foreign key; a beer is never deleted (ADR-0091), and a beer decided twice (approved,
-- then removed) has two rows. decided_by is the identity sub of the deciding admin,
-- and nullable because deleting that account clears it and keeps the record. A beer
-- decided by the script before this table existed has no row.
CREATE TABLE catalog.review (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beer_id     uuid NOT NULL REFERENCES catalog.beer (id),
    decided_by  uuid,
    outcome     text NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED', 'REMOVED')),
    reason_code text CHECK (reason_code IN
        ('ALREADY_IN_CATALOG', 'NOT_A_REAL_BEER', 'INAPPROPRIATE', 'INCORRECT_DETAILS')),
    decided_at  timestamptz NOT NULL,
    -- Only a rejection has a reason, and every rejection has one.
    CHECK ((outcome = 'REJECTED') = (reason_code IS NOT NULL))
);

-- A decided beer's 409 reads its latest record.
CREATE INDEX review_beer_id_decided_at_idx ON catalog.review (beer_id, decided_at DESC);
