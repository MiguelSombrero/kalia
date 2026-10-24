-- Catalog module: breweries and beers (docs/architecture.md §3).

-- Trigram matching for the beer-name search index below. In public, not
-- catalog: an extension is database-wide, not one module's.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Two spellings of one name are one name once case, whitespace and
-- punctuation are folded. scripts/wikidata-migration.mjs folds at least as
-- much before the import; do not make this fold more than it does.
CREATE FUNCTION catalog.fold_name(name text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURN regexp_replace(lower(name), '[[:space:][:punct:]]', '', 'g');

-- source records where a row came from (ADR-0077). Its default marks V004's
-- seed rows, which predate the column, as SEED; V008 changes it to USER, since
-- the entities do not map the column and every row the app inserts is a user's.
-- contributor_id is the identity sub of the user who added a USER row; it is
-- never served by any read, and may be cleared while the row is kept.
-- country_code is the ISO 3166-1 alpha-2 code (ADR-0079). country exists only
-- for V004's rows, which name their country in English: V008 codes them, sets
-- country_code NOT NULL and drops country.
CREATE TABLE catalog.brewery (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    country      text,
    country_code text CHECK (country_code ~ '^[A-Z]{2}$'),
    city         text,
    source       text NOT NULL DEFAULT 'SEED' CHECK (source IN ('SEED', 'WIKIDATA', 'USER')),
    wikidata_qid text UNIQUE,
    contributor_id uuid,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK ((source = 'WIKIDATA') = (wikidata_qid IS NOT NULL)),
    CHECK (contributor_id IS NULL OR source = 'USER')
);

CREATE UNIQUE INDEX brewery_folded_name_country_idx
    ON catalog.brewery (catalog.fold_name(name), country_code);

CREATE TABLE catalog.beer (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brewery_id   uuid NOT NULL REFERENCES catalog.brewery (id),
    name         text NOT NULL,
    style        text NOT NULL,
    abv          numeric(4, 1) NOT NULL CHECK (abv >= 0),
    description  text,
    source       text NOT NULL DEFAULT 'SEED' CHECK (source IN ('SEED', 'WIKIDATA', 'USER')),
    wikidata_qid text UNIQUE,
    contributor_id uuid,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK ((source = 'WIKIDATA') = (wikidata_qid IS NOT NULL)),
    CHECK (contributor_id IS NULL OR source = 'USER')
);

CREATE UNIQUE INDEX beer_brewery_folded_name_idx
    ON catalog.beer (brewery_id, catalog.fold_name(name));

CREATE INDEX beer_brewery_id_idx ON catalog.beer (brewery_id);

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
