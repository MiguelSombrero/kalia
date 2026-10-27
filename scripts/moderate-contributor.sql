-- Run through `make moderate` (backend/README.md, ADR-0091), which supplies
--   -v action=approve|reject|remove  -v who=<username or id>
-- Never DELETE a catalog row here: hidden is a status.
\set ON_ERROR_STOP on

BEGIN;

SELECT set_config('moderation.action', :'action', true) AS action_set,
       set_config('moderation.who', :'who', true) AS who_set \gset

DO $moderate$
DECLARE
    contributor uuid;
    who         text := current_setting('moderation.who');
    action      text := current_setting('moderation.action');
    changed_to  text;
    changed_from text[];
    beers       bigint;
    breweries   bigint;
BEGIN
    CASE action
        WHEN 'approve' THEN changed_to := 'APPROVED'; changed_from := ARRAY['PENDING'];
        WHEN 'reject'  THEN changed_to := 'REJECTED'; changed_from := ARRAY['PENDING'];
        WHEN 'remove'  THEN changed_to := 'REMOVED';  changed_from := ARRAY['PENDING', 'APPROVED'];
        ELSE RAISE EXCEPTION 'action must be approve, reject or remove, not %', action;
    END CASE;

    SELECT id INTO contributor FROM profile.profile WHERE lower(username) = lower(who);
    IF contributor IS NULL AND who ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        contributor := who::uuid;
    END IF;
    IF contributor IS NULL THEN
        RAISE EXCEPTION 'no user named %, and it is not an id', who;
    END IF;

    UPDATE catalog.brewery SET moderation_status = changed_to
        WHERE contributor_id = contributor AND moderation_status = ANY (changed_from);
    GET DIAGNOSTICS breweries = ROW_COUNT;
    UPDATE catalog.beer SET moderation_status = changed_to
        WHERE contributor_id = contributor AND moderation_status = ANY (changed_from);
    GET DIAGNOSTICS beers = ROW_COUNT;

    RAISE NOTICE '% % (%): % beers and % breweries now %', action, who, contributor, beers, breweries, changed_to;
END
$moderate$;

COMMIT;
