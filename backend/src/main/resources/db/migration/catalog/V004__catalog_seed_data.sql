-- Seed data: a curated catalog of well-known craft beers (docs/roadmap.md
-- iteration 1). Deterministic content for dev/demo/test environments;
-- prices are illustrative, in EUR cents.

INSERT INTO catalog.brewery (name, country, city) VALUES
    ('Brouwerij Westvleteren', 'Belgium', 'Vleteren'),
    ('Brasserie de Rochefort', 'Belgium', 'Rochefort'),
    ('Brouwerij St. Bernardus', 'Belgium', 'Watou'),
    ('Brasserie d''Orval', 'Belgium', 'Villers-devant-Orval'),
    ('Duvel Moortgat', 'Belgium', 'Puurs'),
    ('Brasserie Cantillon', 'Belgium', 'Brussels'),
    ('Sierra Nevada Brewing Co.', 'United States', 'Chico'),
    ('Russian River Brewing Company', 'United States', 'Santa Rosa'),
    ('Founders Brewing Co.', 'United States', 'Grand Rapids'),
    ('Bell''s Brewery', 'United States', 'Kalamazoo'),
    ('BrewDog', 'United Kingdom', 'Ellon'),
    ('The Kernel Brewery', 'United Kingdom', 'London'),
    ('Mikkeller', 'Denmark', 'Copenhagen'),
    ('Omnipollo', 'Sweden', 'Stockholm'),
    ('Lervig', 'Norway', 'Stavanger'),
    ('Põhjala', 'Estonia', 'Tallinn'),
    ('Maku Brewing', 'Finland', 'Tuusula'),
    ('Weihenstephan', 'Germany', 'Freising'),
    ('Ayinger Privatbrauerei', 'Germany', 'Aying'),
    ('Schneider Weisse', 'Germany', 'Kelheim');

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Westvleteren 12', 'Quadrupel', 10.2, 'Legendary Trappist quadrupel, dark fruit and caramel.', 1250),
    ('Westvleteren 8', 'Dubbel', 8.0, 'Trappist dubbel with plum and chocolate notes.', 1090),
    ('Westvleteren Blond', 'Belgian Blonde', 5.8, 'The monks'' everyday blond, grassy hops and grain.', 890)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Brouwerij Westvleteren';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Rochefort 10', 'Quadrupel', 11.3, 'Intense Trappist quad, fig, leather and port.', 690),
    ('Rochefort 8', 'Belgian Strong Dark Ale', 9.2, 'Deep brown Trappist ale, dried fruit and spice.', 550),
    ('Rochefort 6', 'Belgian Strong Dark Ale', 7.5, 'The softest Rochefort, caramel and herbal tones.', 490)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Brasserie de Rochefort';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('St. Bernardus Abt 12', 'Quadrupel', 10.0, 'Abbey-style quad, raisin, banana bread and yeast.', 480),
    ('St. Bernardus Prior 8', 'Dubbel', 8.0, 'Rich dubbel with dark fruit and soft carbonation.', 420),
    ('St. Bernardus Tripel', 'Tripel', 8.0, 'Classic tripel, spicy and dry with citrus.', 420)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Brouwerij St. Bernardus';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Orval', 'Belgian Pale Ale', 6.2, 'Brettanomyces-conditioned Trappist pale, dry-hopped.', 390)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Brasserie d''Orval';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Duvel', 'Belgian Strong Golden Ale', 8.5, 'The definitive strong golden, pear and pepper, bone dry.', 320),
    ('Duvel Tripel Hop Citra', 'Belgian IPA', 9.5, 'Duvel re-hopped with Citra, grapefruit over yeast spice.', 380)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Duvel Moortgat';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Gueuze 100% Lambic Bio', 'Gueuze', 5.5, 'Blended lambic, sharp, funky and bone dry.', 1150),
    ('Kriek 100% Lambic Bio', 'Kriek', 5.5, 'Whole sour cherries macerated in young lambic.', 1290),
    ('Rosé de Gambrinus', 'Fruit Lambic', 5.0, 'Raspberry lambic, tart and floral.', 1350)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Brasserie Cantillon';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Bigfoot', 'Barleywine', 9.6, 'Resinous American barleywine, ages beautifully.', 590),
    ('Pale Ale', 'Pale Ale', 5.6, 'The 1980 original that defined American pale ale.', 350),
    ('Torpedo Extra IPA', 'IPA', 7.2, 'Whole-cone dry-hopped, pine and citrus.', 420)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Sierra Nevada Brewing Co.';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Pliny the Elder', 'Double IPA', 8.0, 'The benchmark West Coast double IPA.', 750),
    ('Blind Pig IPA', 'IPA', 6.3, 'Sharp, dry West Coast IPA with grapefruit pith.', 650),
    ('Supplication', 'American Wild Ale', 7.8, 'Sour brown aged in pinot barrels with cherries.', 1450)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Russian River Brewing Company';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('KBS', 'Imperial Stout', 12.0, 'Bourbon-barrel imperial stout, coffee and chocolate.', 1590),
    ('Breakfast Stout', 'Oatmeal Stout', 8.3, 'Double chocolate coffee oatmeal stout.', 690),
    ('All Day IPA', 'Session IPA', 4.7, 'Full-flavored session IPA, made for long days.', 320)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Founders Brewing Co.';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Two Hearted Ale', 'IPA', 7.0, 'All-Centennial IPA, pine needles and orange.', 480),
    ('Hopslam', 'Double IPA', 10.0, 'Honey-kissed double IPA, dangerously smooth.', 890),
    ('Expedition Stout', 'Imperial Stout', 10.5, 'Massive Russian imperial stout built for the cellar.', 790)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Bell''s Brewery';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Punk IPA', 'IPA', 5.4, 'The post-modern classic that launched a thousand IPAs.', 340),
    ('Elvis Juice', 'IPA', 6.5, 'Grapefruit-infused IPA, bitter and juicy.', 380),
    ('Jack Hammer', 'IPA', 7.2, 'Ruthless West Coast bitterness, pith and pine.', 420)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'BrewDog';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Export India Porter', 'Porter', 6.0, 'Historic London porter recipe, roast and hop bite.', 520),
    ('India Pale Ale Citra', 'IPA', 6.7, 'Single-hop Citra IPA, fresh from Bermondsey.', 560),
    ('Table Beer', 'Session Ale', 3.0, 'Tiny but characterful, hoppy table beer.', 420)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'The Kernel Brewery';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Beer Geek Breakfast', 'Oatmeal Stout', 7.5, 'Gourmet coffee oatmeal stout that started it all.', 650),
    ('1000 IBU', 'Double IPA', 9.6, 'Theoretical bitterness taken to the limit.', 790),
    ('Spontanale', 'Wild Ale', 5.5, 'Spontaneously fermented ale, cellar funk and lemon.', 990)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Mikkeller';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Fatamorgana', 'Double IPA', 8.0, 'Oat-heavy hazy double IPA, mango and pine.', 720),
    ('Zodiak', 'IPA', 6.2, 'Bright everyday IPA, tropical and soft.', 540)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Omnipollo';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Konrad''s Stout', 'Imperial Stout', 10.4, 'Thick Norwegian imperial stout, licorice and espresso.', 850),
    ('Lucky Jack', 'Pale Ale', 4.7, 'Citrusy everyday pale ale from Stavanger.', 390)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Lervig';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Öö', 'Imperial Stout', 10.5, '"Night" in Estonian — pitch-black imperial Baltic porter.', 780),
    ('Virmalised', 'IPA', 6.5, '"Northern lights" IPA, piney and bright.', 490),
    ('Kosmos', 'IPA', 5.5, 'Flagship Estonian IPA, balanced and aromatic.', 450)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Põhjala';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Amarillo IPA', 'IPA', 6.2, 'Finnish single-hop Amarillo IPA, orange marmalade.', 590),
    ('Savu Gose', 'Gose', 4.2, 'Lightly smoked salty-sour gose from Tuusula.', 550),
    ('Pimeä Imperial Stout', 'Imperial Stout', 9.0, 'Finnish winter warmer, roasted malt and dark syrup.', 750)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Maku Brewing';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Hefeweissbier', 'Hefeweizen', 5.4, 'The world''s oldest brewery''s banana-clove classic.', 320),
    ('Vitus', 'Weizenbock', 7.7, 'Pale weizenbock, warming banana and vanilla.', 380),
    ('Korbinian', 'Doppelbock', 7.4, 'Dark doppelbock, bread crust and dried plum.', 360)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Weihenstephan';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Celebrator', 'Doppelbock', 6.7, 'Benchmark doppelbock with the goat on the label.', 390),
    ('Bräuweisse', 'Hefeweizen', 5.1, 'Bright Bavarian wheat, lively carbonation.', 330),
    ('Altbairisch Dunkel', 'Dunkel', 5.0, 'Old-Bavarian dark lager, toasted bread and cocoa.', 340)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Ayinger Privatbrauerei';

INSERT INTO catalog.beer (brewery_id, name, style, abv, description, price_cents)
SELECT b.id, v.name, v.style, v.abv, v.description, v.price_cents
FROM (VALUES
    ('Aventinus', 'Weizenbock', 8.2, 'Wheat doppelbock since 1907, banana, clove and sherry.', 370),
    ('Original', 'Hefeweizen', 5.4, 'Amber Bavarian wheat brewed to the 1872 recipe.', 320)
) AS v(name, style, abv, description, price_cents)
JOIN catalog.brewery b ON b.name = 'Schneider Weisse';
