-- One schema per Spring Modulith module (docs/architecture.md §3):
-- module boundaries stay visible in the data layer and a future service
-- extraction has clean seams. Cross-module references are by id only.
CREATE SCHEMA IF NOT EXISTS catalog;
