#!/usr/bin/env node
// Self-test for the pure parts of scan-images.mjs; the rendering itself is
// exercised by check-compose.mjs, which needs the docker CLI.

import test from "node:test";
import assert from "node:assert/strict";

import { imagesFromOutput, matrixFor } from "./scan-images.mjs";

const config = {
  name: "kalia",
  services: {
    backend: { build: { context: "backend" } },
    pinned: { build: { context: "pinned" }, image: "registry.example/pinned:1" },
    postgres: { image: "postgres:18.6" },
  },
};

test("imagesFromOutput drops blank lines and repeats", () => {
  assert.deepEqual(imagesFromOutput("a:1\n\n  b:2  \na:1\n"), ["a:1", "b:2"]);
});

test("matrixFor names the service that builds an image and leaves a pulled one empty", () => {
  const images = ["kalia-backend", "registry.example/pinned:1", "postgres:18.6"];
  assert.deepEqual(matrixFor({ images, config }), [
    { image: "kalia-backend", service: "backend" },
    { image: "registry.example/pinned:1", service: "pinned" },
    { image: "postgres:18.6", service: "" },
  ]);
});

test("matrixFor scans an image added to the base file, with no list to edit", () => {
  const added = { ...config, services: { ...config.services, cache: { image: "valkey/valkey:9" } } };
  const images = ["kalia-backend", "postgres:18.6", "valkey/valkey:9"];
  const scanned = matrixFor({ images, config: added }).map((entry) => entry.image);
  assert.ok(scanned.includes("valkey/valkey:9"));
  assert.equal(scanned.length, images.length);
});
