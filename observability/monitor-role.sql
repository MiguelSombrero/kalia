-- The role the Postgres exporter connects as, created by the observability
-- profile's postgres-monitor-role service and by nothing in the deployable stack
-- (ADR-0100). pg_monitor lets it read the statistics views and nothing in a
-- table. Safe to run again: the role is created once and its password is
-- set to the one the exporter is given each time.
\getenv monitor_password KALIA_MONITOR_PASSWORD

SELECT 'CREATE ROLE kalia_monitor LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kalia_monitor')
\gexec

SELECT format('ALTER ROLE kalia_monitor PASSWORD %L', :'monitor_password')
\gexec

GRANT pg_monitor TO kalia_monitor;
GRANT CONNECT ON DATABASE kalia TO kalia_monitor;
