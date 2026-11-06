-- What an admin changed when approving a suggestion with edits (ADR-0102): the values as the
-- contributor suggested them, kept on the decision's record. A row with suggested_name set is
-- an edited approval; the beer and brewery rows themselves hold the values as decided.
-- suggested_brewery_id is the brewery the beer pointed at when it was suggested, which an
-- edit may have replaced. The brewery's name, country and city are kept only when the
-- brewery was new (still pending), the only kind an edit can change.
ALTER TABLE catalog.review
    ADD COLUMN suggested_name                 text,
    ADD COLUMN suggested_style                text,
    ADD COLUMN suggested_abv                  numeric(4, 1),
    ADD COLUMN suggested_brewery_id           uuid REFERENCES catalog.brewery (id),
    ADD COLUMN suggested_brewery_name         text,
    ADD COLUMN suggested_brewery_country_code text,
    ADD COLUMN suggested_brewery_city         text,
    ADD CONSTRAINT review_suggested_values_check CHECK (
        (suggested_name IS NULL) = (suggested_style IS NULL)
        AND (suggested_name IS NULL) = (suggested_abv IS NULL)
        AND (suggested_name IS NULL) = (suggested_brewery_id IS NULL)
        AND (suggested_brewery_name IS NULL) = (suggested_brewery_country_code IS NULL)
        AND (suggested_brewery_name IS NULL OR suggested_name IS NOT NULL)
        AND (suggested_name IS NULL OR outcome = 'APPROVED'));
