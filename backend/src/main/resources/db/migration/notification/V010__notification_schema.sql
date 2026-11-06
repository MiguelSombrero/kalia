-- Notification module: what a user is told and has not yet acknowledged (ADR-0103).
CREATE SCHEMA IF NOT EXISTS notification;

-- One row per review decision for the suggestion's contributor, frozen when written.
-- recipient_id and beer_id are cross-module references by id only, no foreign key
-- (docs/architecture.md §3). event_id is the idempotency key for the at-least-once event
-- registry. A row exists until the recipient acknowledges it, so unread is existence:
-- no read flag, no timestamp, and nothing sweeps old rows.
CREATE TABLE notification.notification (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       uuid NOT NULL UNIQUE,
    recipient_id   uuid NOT NULL,
    outcome        text NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED')),
    edited         boolean NOT NULL,
    beer_id        uuid NOT NULL,
    beer_name      text NOT NULL,
    suggested_name text,
    reason_code    text CHECK (reason_code IN
        ('ALREADY_IN_CATALOG', 'NOT_A_REAL_BEER', 'INAPPROPRIATE', 'INCORRECT_DETAILS')),
    decided_at     timestamptz NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    -- Only a rejection has a reason, and every rejection has one.
    CHECK ((outcome = 'REJECTED') = (reason_code IS NOT NULL))
);

-- The count is read on every signed-in page render, the list pages by it, and deleting
-- an account deletes by it (ADR-0103, ADR-0104).
CREATE INDEX notification_recipient_id_decided_at_idx
    ON notification.notification (recipient_id, decided_at DESC);
