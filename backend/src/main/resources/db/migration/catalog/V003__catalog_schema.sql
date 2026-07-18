-- Catalog module: breweries and beers (docs/architecture.md §3).
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
CREATE INDEX beer_style_idx ON catalog.beer (style);
