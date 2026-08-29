-- Catalog module: breweries and beers (docs/architecture.md §3).

-- Trigram matching for the beer-name search index below. In public, not
-- catalog: an extension is database-wide, not one module's.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE TABLE catalog.brewery (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    country    text NOT NULL,
    city       text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.beer (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brewery_id  uuid NOT NULL REFERENCES catalog.brewery (id),
    name        text NOT NULL,
    style       text NOT NULL,
    abv         numeric(4, 1) NOT NULL CHECK (abv >= 0),
    description text,
    price_cents integer NOT NULL CHECK (price_cents >= 0),
    currency    varchar(3) NOT NULL DEFAULT 'EUR',
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (brewery_id, name)
);

CREATE INDEX beer_brewery_id_idx ON catalog.beer (brewery_id);

-- The search filters BeerSpecifications builds, indexed to match their shape
-- (ADR-0044); BeerSearchIndexIT asserts the planner picks each one.
-- lower(style) and lower(country) are function calls, which a plain index on
-- the raw column cannot serve.
CREATE INDEX beer_style_lower_idx ON catalog.beer (lower(style));
CREATE INDEX brewery_country_lower_idx ON catalog.brewery (lower(country));
-- No B-tree can serve the name filter's leading-wildcard LIKE; a trigram GIN
-- index can. fastupdate is off because until autovacuum flushes GIN's pending
-- list the planner costs this index above the full scan it exists to replace.
CREATE INDEX beer_name_trgm_idx ON catalog.beer USING gin (lower(name) public.gin_trgm_ops)
    WITH (fastupdate = off);
