-- Indexes for the filters BeerSpecifications builds. BeerSearchIndexIT asserts
-- each one is the index the planner picks.

-- In public, not catalog: an extension is database-wide, not one module's.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- lower(style) and lower(country) are function calls, which a plain index on
-- the raw column cannot serve, so beer_style_idx goes rather than stays.
DROP INDEX catalog.beer_style_idx;
CREATE INDEX beer_style_lower_idx ON catalog.beer (lower(style));
CREATE INDEX brewery_country_lower_idx ON catalog.brewery (lower(country));

-- No B-tree can serve the name filter's leading-wildcard LIKE; a trigram GIN
-- index can. fastupdate is off because until autovacuum flushes GIN's pending
-- list the planner costs this index above the full scan it exists to replace.
CREATE INDEX beer_name_trgm_idx ON catalog.beer USING gin (lower(name) public.gin_trgm_ops)
    WITH (fastupdate = off);
