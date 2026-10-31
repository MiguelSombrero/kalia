-- Run through `make app-config` (backend/README.md, ADR-0093), which supplies
--   -v ios=<build>  -v android=<build>  -v maintenance=on|off
-- Each may be empty, which leaves that setting as it is. A value that is not
-- a build number or a boolean fails and changes nothing.
\set ON_ERROR_STOP on

BEGIN;

UPDATE appconfig.app_config
SET minimum_build_ios     = COALESCE(NULLIF(:'ios', '')::integer, minimum_build_ios),
    minimum_build_android = COALESCE(NULLIF(:'android', '')::integer, minimum_build_android),
    maintenance           = COALESCE(NULLIF(:'maintenance', '')::boolean, maintenance);

SELECT minimum_build_ios, minimum_build_android, maintenance FROM appconfig.app_config;

COMMIT;
