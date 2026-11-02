-- Runs once, against an empty data directory, as the bootstrap superuser
-- (ADR-0100). Three roles of their own, so the superuser is held by neither
-- service: one owns the `kalia` schema and is used by Flyway alone, one
-- reads and writes its rows and cannot change its structure, and one owns
-- the `keycloak` database and reaches nothing else. Each password is read
-- from the container's environment rather than written here.
\getenv owner_password DATABASE_OWNER_PASSWORD
\getenv app_password DATABASE_PASSWORD
\getenv keycloak_password KEYCLOAK_DB_PASSWORD

CREATE ROLE kalia_owner LOGIN PASSWORD :'owner_password';
CREATE ROLE kalia_app LOGIN PASSWORD :'app_password';
CREATE ROLE keycloak LOGIN PASSWORD :'keycloak_password';

ALTER DATABASE kalia OWNER TO kalia_owner;
CREATE DATABASE keycloak OWNER keycloak;

-- A database admits PUBLIC by default, which would let any role in; admit
-- each database's own roles only.
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE kalia FROM PUBLIC;
REVOKE CONNECT ON DATABASE keycloak FROM PUBLIC;
GRANT CONNECT ON DATABASE kalia TO kalia_app;

-- Flyway creates the schemas and tables as kalia_owner, so what the runtime
-- role may do with them is granted on whatever that role creates later.
\connect kalia
ALTER DEFAULT PRIVILEGES FOR ROLE kalia_owner GRANT USAGE ON SCHEMAS TO kalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kalia_owner GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kalia_owner GRANT USAGE, SELECT ON SEQUENCES TO kalia_app;
