-- Seed data: a curated catalog of well-known craft beers (docs/roadmap.md
-- iteration 1). Deterministic content for dev/demo/test environments.

INSERT INTO catalog.brewery (name, name_sort_key, country_code, city, source) VALUES
    ('Brouwerij Westvleteren', 'brouwerij westvleteren', 'BE', 'Vleteren', 'SEED'),
    ('Brasserie de Rochefort', 'brasserie de rochefort', 'BE', 'Rochefort', 'SEED'),
    ('Brouwerij St. Bernardus', 'brouwerij st. bernardus', 'BE', 'Watou', 'SEED'),
    ('Brasserie d''Orval', 'brasserie d''orval', 'BE', 'Villers-devant-Orval', 'SEED'),
    ('Duvel Moortgat', 'duvel moortgat', 'BE', 'Puurs', 'SEED'),
    ('Brasserie Cantillon', 'brasserie cantillon', 'BE', 'Brussels', 'SEED'),
    ('Sierra Nevada Brewing Co.', 'sierra nevada brewing co.', 'US', 'Chico', 'SEED'),
    ('Russian River Brewing Company', 'russian river brewing company', 'US', 'Santa Rosa', 'SEED'),
    ('Founders Brewing Co.', 'founders brewing co.', 'US', 'Grand Rapids', 'SEED'),
    ('Bell''s Brewery', 'bell''s brewery', 'US', 'Kalamazoo', 'SEED'),
    ('BrewDog', 'brewdog', 'GB', 'Ellon', 'SEED'),
    ('The Kernel Brewery', 'the kernel brewery', 'GB', 'London', 'SEED'),
    ('Mikkeller', 'mikkeller', 'DK', 'Copenhagen', 'SEED'),
    ('Omnipollo', 'omnipollo', 'SE', 'Stockholm', 'SEED'),
    ('Lervig', 'lervig', 'NO', 'Stavanger', 'SEED'),
    ('Põhjala', 'põhjala', 'EE', 'Tallinn', 'SEED'),
    ('Maku Brewing', 'maku brewing', 'FI', 'Tuusula', 'SEED'),
    ('Weihenstephan', 'weihenstephan', 'DE', 'Freising', 'SEED'),
    ('Ayinger Privatbrauerei', 'ayinger privatbrauerei', 'DE', 'Aying', 'SEED'),
    ('Schneider Weisse', 'schneider weisse', 'DE', 'Kelheim', 'SEED');

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Westvleteren 12', 'Quadrupel', 10.2),
    ('Westvleteren 8', 'Dubbel', 8.0),
    ('Westvleteren Blond', 'Belgian Blonde', 5.8)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Brouwerij Westvleteren';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Rochefort 10', 'Quadrupel', 11.3),
    ('Rochefort 8', 'Belgian Strong Dark Ale', 9.2),
    ('Rochefort 6', 'Belgian Strong Dark Ale', 7.5)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Brasserie de Rochefort';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('St. Bernardus Abt 12', 'Quadrupel', 10.0),
    ('St. Bernardus Prior 8', 'Dubbel', 8.0),
    ('St. Bernardus Tripel', 'Tripel', 8.0)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Brouwerij St. Bernardus';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Orval', 'Belgian Pale Ale', 6.2)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Brasserie d''Orval';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Duvel', 'Belgian Strong Golden Ale', 8.5),
    ('Duvel Tripel Hop Citra', 'Belgian IPA', 9.5)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Duvel Moortgat';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Gueuze 100% Lambic Bio', 'Gueuze', 5.5),
    ('Kriek 100% Lambic Bio', 'Kriek', 5.5),
    ('Rosé de Gambrinus', 'Fruit Lambic', 5.0)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Brasserie Cantillon';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Bigfoot', 'Barleywine', 9.6),
    ('Pale Ale', 'Pale Ale', 5.6),
    ('Torpedo Extra IPA', 'IPA', 7.2)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Sierra Nevada Brewing Co.';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Pliny the Elder', 'Double IPA', 8.0),
    ('Blind Pig IPA', 'IPA', 6.3),
    ('Supplication', 'American Wild Ale', 7.8)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Russian River Brewing Company';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('KBS', 'Imperial Stout', 12.0),
    ('Breakfast Stout', 'Oatmeal Stout', 8.3),
    ('All Day IPA', 'Session IPA', 4.7)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Founders Brewing Co.';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Two Hearted Ale', 'IPA', 7.0),
    ('Hopslam', 'Double IPA', 10.0),
    ('Expedition Stout', 'Imperial Stout', 10.5)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Bell''s Brewery';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Punk IPA', 'IPA', 5.4),
    ('Elvis Juice', 'IPA', 6.5),
    ('Jack Hammer', 'IPA', 7.2)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'BrewDog';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Export India Porter', 'Porter', 6.0),
    ('India Pale Ale Citra', 'IPA', 6.7),
    ('Table Beer', 'Session Ale', 3.0)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'The Kernel Brewery';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Beer Geek Breakfast', 'Oatmeal Stout', 7.5),
    ('1000 IBU', 'Double IPA', 9.6),
    ('Spontanale', 'Wild Ale', 5.5)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Mikkeller';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Fatamorgana', 'Double IPA', 8.0),
    ('Zodiak', 'IPA', 6.2)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Omnipollo';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Konrad''s Stout', 'Imperial Stout', 10.4),
    ('Lucky Jack', 'Pale Ale', 4.7)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Lervig';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Öö', 'Imperial Stout', 10.5),
    ('Virmalised', 'IPA', 6.5),
    ('Kosmos', 'IPA', 5.5)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Põhjala';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Amarillo IPA', 'IPA', 6.2),
    ('Savu Gose', 'Gose', 4.2),
    ('Pimeä Imperial Stout', 'Imperial Stout', 9.0)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Maku Brewing';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Hefeweissbier', 'Hefeweizen', 5.4),
    ('Vitus', 'Weizenbock', 7.7),
    ('Korbinian', 'Doppelbock', 7.4)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Weihenstephan';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Celebrator', 'Doppelbock', 6.7),
    ('Bräuweisse', 'Hefeweizen', 5.1),
    ('Altbairisch Dunkel', 'Dunkel', 5.0)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Ayinger Privatbrauerei';

INSERT INTO catalog.beer (brewery_id, name, style, abv, source)
SELECT b.id, v.name, v.style, v.abv, 'SEED'
FROM (VALUES
    ('Aventinus', 'Weizenbock', 8.2),
    ('Original', 'Hefeweizen', 5.4)
) AS v(name, style, abv)
JOIN catalog.brewery b ON b.name = 'Schneider Weisse';
