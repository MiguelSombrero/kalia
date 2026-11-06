-- An admin may remove any approved beer, an imported or seeded one included (ADR-0102), so a
-- beer that is not a user's may be REMOVED as well as APPROVED. It may still never be PENDING
-- or REJECTED, which only a user's addition goes through. beer_check2 is the name Postgres gave
-- the third table-level CHECK in V003, which required every non-user beer to be APPROVED.
ALTER TABLE catalog.beer DROP CONSTRAINT beer_check2;
ALTER TABLE catalog.beer ADD CONSTRAINT beer_non_user_status_check
    CHECK (moderation_status IN ('APPROVED', 'REMOVED') OR source = 'USER');
