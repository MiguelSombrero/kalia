#!/usr/bin/env node
// Fixture-driven self-test for check-no-raster-images.mjs. The real tree holds
// no raster image, so the check never fires there and would stay green even if
// it stopped looking (the reason check-glossary.test.mjs exists). Each fixture
// is a throwaway git repository, because the check reads what git tracks.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkRasterImages } from "./check-no-raster-images.mjs";

// A hook exports GIT_DIR and friends; a fixture git call that inherits them
// acts on the real repository instead of the temp one.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

function fixture({ tracked = [], untracked = [] }) {
  const root = mkdtempSync(resolve(tmpdir(), "raster-check-"));
  execFileSync("git", ["init", "-q"], { cwd: root, env: cleanEnv });
  const write = (rel) => {
    mkdirSync(resolve(root, dirname(rel)), { recursive: true });
    writeFileSync(resolve(root, rel), "x");
  };
  for (const rel of tracked) write(rel);
  for (const rel of untracked) write(rel);
  if (tracked.length > 0) execFileSync("git", ["add", ...tracked], { cwd: root, env: cleanEnv });
  return root;
}

function check(options, allowedDirs, assertions) {
  const root = fixture(options);
  try {
    assertions(checkRasterImages(root, allowedDirs));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("passes a repository with only text and vector files", () => {
  check({ tracked: ["README.md", "logo.svg", "src/app.ts"] }, [], (failures) =>
    assert.deepEqual(failures, []),
  );
});

test("fails a tracked png and names the file", () => {
  check({ tracked: ["README.md", "docs/home.png"] }, [], (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /docs\/home\.png/);
  });
});

test("counts a file that is staged but not yet committed", () => {
  check({ tracked: ["Screenshot 2026-09-30.png"] }, [], (failures) => {
    assert.equal(failures.length, 1);
  });
});

test("matches every raster extension, in any case", () => {
  const files = ["a.PNG", "b.jpg", "c.JPEG", "d.gif", "e.webp", "f.heic", "g.avif", "h.bmp", "i.tiff"];
  check({ tracked: files }, [], (failures) => assert.equal(failures.length, files.length));
});

test("ignores an image git does not track", () => {
  check({ tracked: ["README.md"], untracked: ["scratch/shot.png"] }, [], (failures) =>
    assert.deepEqual(failures, []),
  );
});

test("allows an image under an allowed directory and still fails one beside it", () => {
  check(
    { tracked: ["frontend/public/brand/mark.png", "frontend/e2e/shot.png"] },
    ["frontend/public/brand"],
    (failures) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /frontend\/e2e\/shot\.png/);
    },
  );
});

test("reads the repository it is given even when a hook has exported GIT_DIR", () => {
  // A decoy stands in for the real repository a pre-push hook points GIT_DIR at,
  // so this test can never touch the real one whatever the checker does.
  const decoy = mkdtempSync(resolve(tmpdir(), "raster-decoy-"));
  execFileSync("git", ["init", "-q"], { cwd: decoy, env: cleanEnv });
  const root = fixture({ tracked: ["docs/home.png"] });
  process.env.GIT_DIR = resolve(decoy, ".git");
  try {
    const failures = checkRasterImages(root, []);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /docs\/home\.png/);
  } finally {
    delete process.env.GIT_DIR;
    rmSync(root, { recursive: true, force: true });
    rmSync(decoy, { recursive: true, force: true });
  }
});

test("an allowed directory does not match a directory that merely shares its prefix", () => {
  check({ tracked: ["frontend/public/brand-old/mark.png"] }, ["frontend/public/brand"], (failures) =>
    assert.equal(failures.length, 1),
  );
});
