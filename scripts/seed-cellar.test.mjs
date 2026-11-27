#!/usr/bin/env node
// Self-test for seed-cellar.mjs. Runs in `make check`.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { findBeerId, SEEDED_CELLAR, SEEDED_TOTALS } from "./seed-cellar.mjs";

test("the beer a name picks out is the one whose name is exactly it, not one that contains it", () => {
  const page = { content: [{ id: "a", name: "Lapin Kulta Premium Export" }, { id: "b", name: "Lapin Kulta" }] };
  assert.equal(findBeerId(page, "Lapin Kulta"), "b");
});

test("a name the catalog lacks, or holds twice, is refused rather than guessed", () => {
  assert.throws(() => findBeerId({ content: [{ id: "a", name: "Karhu III" }] }, "Karhu"), /holds 0 beers named Karhu/);
  assert.throws(() => findBeerId({ content: [{ id: "a", name: "Karhu" }, { id: "b", name: "Karhu" }] }, "Karhu"), /holds 2 beers named Karhu/);
});

test("the totals a flow reads are the seeded entries' sum, with every quantity within the API's 1 to 24", () => {
  assert.equal(SEEDED_TOTALS.beers, SEEDED_CELLAR.length);
  assert.equal(SEEDED_TOTALS.bottles, SEEDED_CELLAR.reduce((sum, item) => sum + item.quantity, 0));
  for (const { quantity } of SEEDED_CELLAR) assert.ok(quantity >= 1 && quantity <= 24);
});

test("the cellar flow reads the totals this script seeds, in both languages", () => {
  const flow = readFileSync(new URL("../mobile/.maestro/cellar-lists-bottles.yaml", import.meta.url), "utf8");
  const { beers, bottles } = SEEDED_TOTALS;
  assert.ok(flow.includes(`"${beers} beers · ${bottles} bottles|${beers} olutta · ${bottles} pulloa"`));
});
