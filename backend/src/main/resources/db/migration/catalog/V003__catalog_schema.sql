-- Catalog module: breweries, beers and the reviews of contributed beers (docs/architecture.md §3).

-- Trigram matching for the beer-name search index below. In public, not
-- catalog: an extension is database-wide, not one module's.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Two spellings of one name are one name once compatibility forms (fullwidth
-- letters, ligatures), case, whitespace and punctuation are folded.
-- scripts/wikidata-migration.mjs folds at least as much before the import; do
-- not make this fold more than it does.
CREATE FUNCTION catalog.fold_name(name text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN regexp_replace(lower(normalize(name, NFKC)), '[[:space:][:punct:]]', '', 'g');

-- source records where a row came from (ADR-0077). It defaults to USER: the
-- entities do not map the column, so every row the app inserts is a user's, while
-- the seed and the import name theirs.
-- contributor_id is the identity sub of the user who added a USER row; it is
-- never served by any read, and may be cleared while the row is kept.
-- country_code is the ISO 3166-1 alpha-2 code (ADR-0079).
-- name_sort_key is name folded to String.CASE_INSENSITIVE_ORDER's order, held in
-- C collation so the database sorts bytes and no locale can reorder the list
-- (ADR-0087). The application, the seed and scripts/wikidata-migration.mjs all
-- write it.
-- moderation_status is who may see the row (ADR-0091). Its default is what the seed
-- and the import insert; the entities write PENDING for a user's row. A
-- REJECTED or REMOVED row is hidden, never deleted, and drops out of the
-- unique index below so its name can be proposed again.
CREATE TABLE catalog.brewery (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    name_sort_key text COLLATE "C" NOT NULL,
    country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    city         text,
    source       text NOT NULL DEFAULT 'USER' CHECK (source IN ('SEED', 'WIKIDATA', 'USER')),
    wikidata_qid text UNIQUE,
    contributor_id uuid,
    moderation_status text NOT NULL DEFAULT 'APPROVED'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK ((source = 'WIKIDATA') = (wikidata_qid IS NOT NULL)),
    CHECK (contributor_id IS NULL OR source = 'USER'),
    CHECK (moderation_status = 'APPROVED' OR source = 'USER')
);

CREATE UNIQUE INDEX brewery_folded_name_country_idx
    ON catalog.brewery (catalog.fold_name(name), country_code)
    WHERE moderation_status IN ('PENDING', 'APPROVED');

-- The cap on one contributor's waiting entries counts these (ADR-0091).
CREATE INDEX brewery_pending_contributor_idx ON catalog.brewery (contributor_id)
    WHERE moderation_status = 'PENDING';

-- The brewery list's page and its search's page are read off this index (ADR-0087).
CREATE INDEX brewery_name_sort_key_idx ON catalog.brewery (name_sort_key, id);

CREATE TABLE catalog.beer (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brewery_id   uuid NOT NULL REFERENCES catalog.brewery (id),
    name         text NOT NULL,
    style        text NOT NULL,
    abv          numeric(4, 1) NOT NULL CHECK (abv >= 0),
    source       text NOT NULL DEFAULT 'USER' CHECK (source IN ('SEED', 'WIKIDATA', 'USER')),
    wikidata_qid text UNIQUE,
    contributor_id uuid,
    moderation_status text NOT NULL DEFAULT 'APPROVED'
        CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK ((source = 'WIKIDATA') = (wikidata_qid IS NOT NULL)),
    CHECK (contributor_id IS NULL OR source = 'USER'),
    -- An admin may remove any approved beer, an imported or seeded one included
    -- (ADR-0102), so a beer that is not a user's is APPROVED or REMOVED. It is
    -- never PENDING or REJECTED, which only a user's addition goes through.
    CONSTRAINT beer_non_user_status_check
        CHECK (moderation_status IN ('APPROVED', 'REMOVED') OR source = 'USER')
);

CREATE UNIQUE INDEX beer_brewery_folded_name_idx
    ON catalog.beer (brewery_id, catalog.fold_name(name))
    WHERE moderation_status IN ('PENDING', 'APPROVED');

CREATE INDEX beer_pending_contributor_idx ON catalog.beer (contributor_id)
    WHERE moderation_status = 'PENDING';

-- The admin queue counts a contributor's rejections beside their waiting entries.
-- Rows are never deleted (ADR-0091), so rejections only accumulate among the
-- approved catalog.
CREATE INDEX beer_rejected_contributor_idx ON catalog.beer (contributor_id)
    WHERE moderation_status = 'REJECTED';

CREATE INDEX beer_brewery_id_idx ON catalog.beer (brewery_id);

-- One row per decision on a contributed beer (ADR-0102): the only trail of who
-- decided what. beer_id is a catalog row, so it has a foreign key; a beer is never
-- deleted (ADR-0091), and a beer decided twice (approved, then removed) has two rows.
-- decided_by is the identity sub of the deciding admin, and nullable because deleting
-- that account clears it and keeps the record.
-- The suggested_* columns hold what an admin changed when approving a suggestion with
-- edits: the values as the contributor suggested them. A row with suggested_name set is
-- an edited approval; the beer and brewery rows themselves hold the values as decided.
-- suggested_brewery_id is the brewery the beer pointed at when it was suggested, which an
-- edit may have replaced. The brewery's name, country and city are kept only when the
-- brewery was new (still pending), the only kind an edit can change.
CREATE TABLE catalog.review (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beer_id     uuid NOT NULL REFERENCES catalog.beer (id),
    decided_by  uuid,
    outcome     text NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED', 'REMOVED')),
    reason_code text CHECK (reason_code IN
        ('ALREADY_IN_CATALOG', 'NOT_A_REAL_BEER', 'INAPPROPRIATE', 'INCORRECT_DETAILS')),
    decided_at  timestamptz NOT NULL,
    suggested_name                 text,
    suggested_style                text,
    suggested_abv                  numeric(4, 1),
    suggested_brewery_id           uuid REFERENCES catalog.brewery (id),
    suggested_brewery_name         text,
    suggested_brewery_country_code text,
    suggested_brewery_city         text,
    -- Only a rejection has a reason, and every rejection has one.
    CHECK ((outcome = 'REJECTED') = (reason_code IS NOT NULL)),
    CONSTRAINT review_suggested_values_check CHECK (
        (suggested_name IS NULL) = (suggested_style IS NULL)
        AND (suggested_name IS NULL) = (suggested_abv IS NULL)
        AND (suggested_name IS NULL) = (suggested_brewery_id IS NULL)
        AND (suggested_brewery_name IS NULL) = (suggested_brewery_country_code IS NULL)
        AND (suggested_brewery_name IS NULL OR suggested_name IS NOT NULL)
        AND (suggested_name IS NULL OR outcome = 'APPROVED'))
);

-- A decided beer's 409 reads its latest record.
CREATE INDEX review_beer_id_decided_at_idx ON catalog.review (beer_id, decided_at DESC);

-- The search filters BeerSpecifications builds, indexed to match their shape
-- (ADR-0044); BeerSearchIndexIT asserts the planner picks each one.
-- lower(style) is a function call, which a plain index on the raw column
-- cannot serve; a country code is compared as it is stored.
CREATE INDEX beer_style_lower_idx ON catalog.beer (lower(style));
CREATE INDEX brewery_country_code_idx ON catalog.brewery (country_code);
-- No B-tree can serve the name filter's leading-wildcard LIKE; a trigram GIN
-- index can. fastupdate is off because until autovacuum flushes GIN's pending
-- list the planner costs this index above the full scan it exists to replace.
CREATE INDEX beer_name_trgm_idx ON catalog.beer USING gin (lower(name) public.gin_trgm_ops)
    WITH (fastupdate = off);
-- The search's default sort, lower(name) then id, so an unfiltered page reads
-- its 20 rows off the index instead of sorting the whole table (ADR-0078).
CREATE INDEX beer_lower_name_id_idx ON catalog.beer (lower(name), id);
-- The brewery search's substring filter, as beer_name_trgm_idx is the beer search's.
CREATE INDEX brewery_name_trgm_idx ON catalog.brewery USING gin (lower(name) public.gin_trgm_ops)
    WITH (fastupdate = off);
