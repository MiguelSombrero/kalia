-- Profile module: who a user is to other users (docs/architecture.md §3,
-- ADR-0049). One schema per module (docs/architecture.md §3).
CREATE SCHEMA IF NOT EXISTS profile;

-- id is the Keycloak sub itself, not a separately generated id: a profile
-- is keyed by it (ADR-0049), so there is exactly one row per subject and no
-- separate lookup column is needed.
CREATE TABLE profile.profile (
    id            uuid PRIMARY KEY,
    username      text NOT NULL,
    cellar_public boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Do not delete profile rows: a row is the permanent reservation of its
-- username, and deleting one frees the name for someone else (ADR-0080).
CREATE UNIQUE INDEX profile_username_lower_key ON profile.profile (lower(username));
