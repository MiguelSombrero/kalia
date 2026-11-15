#!/usr/bin/env node
// The Prometheus inside the observability profile scrapes the web's counters
// with a bearer token that docker-compose.dev.env also sets for the web, so a
// token changed in one and not the other leaves the counters unscraped without
// an error anyone reads (ADR-0114). Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFileSync(join(ROOT, path), "utf8");

test("the web's scrape job carries the dev METRICS_TOKEN the web is given", () => {
  const token = /^METRICS_TOKEN=(.+)$/m.exec(read("docker-compose.dev.env"))?.[1];
  assert.ok(token, "docker-compose.dev.env sets no METRICS_TOKEN");
  const job = /- job_name: web\n([\s\S]*?)(?=\n  - job_name:|\n\S|\s*$)/.exec(read("observability/prometheus.yaml"))?.[1];
  assert.ok(job, "observability/prometheus.yaml has no web job");
  assert.match(job, /metrics_path: \/api\/metrics/);
  assert.equal(/credentials: (\S+)/.exec(job)?.[1], token);
});

test("the profile mounts the scrape file over the image's own", () => {
  assert.match(
    read("docker-compose.override.yml"),
    /\.\/observability\/prometheus\.yaml:\/otel-lgtm\/prometheus\.yaml:ro/,
  );
});
