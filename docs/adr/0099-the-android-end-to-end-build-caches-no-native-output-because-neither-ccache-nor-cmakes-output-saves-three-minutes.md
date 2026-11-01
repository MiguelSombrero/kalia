# ADR-0099: The Android end-to-end build caches no native output, because neither ccache nor CMake's output saves three minutes

- **Status:** accepted
- **Date:** 2026-11-01

## Context

The build step of the required `Mobile E2E (Maestro, Android)` job compiles
React Native's native libraries with CMake on every run: screens, worklets,
reanimated, gesture-handler, expo-modules-core, then the app's own library.
Gradle's dependency cache, which the job already restores, does not cover those
tasks, and a reading of one build log put them at about six of the step's 8–12
minutes. The job is slow enough that the product owner wants its run time down
(iteration 10 task 23, from quality backlog COULD-106).

Any cache of compiled native code carries one risk that matters more than its
speed: a hit that returns a library compiled from older sources makes a green
run meaningless, and nothing in the job would show it. So the product owner set
the bar before anything was measured: a cache is kept only if it cuts the build
step's median by at least three minutes over at least five warm runs on the CI
runner. Kalia adds no cost, so the candidates are limited to what the free
runner and `actions/cache` can do.

## Decision

The Android end-to-end job keeps no cache of native build output: the build
step compiles React Native's native libraries from source on every run, as it
did before.

The job's Gradle and Maestro caches stay as they are. This records a negative
result, not a ban: the next proposal for a native cache starts from the
measurements below and is held to the same three-minute bar, and the ccache
configuration that was measured is the one to re-measure first (Revisit
trigger). Neither candidate's tooling, ccache included, is added to the
repository.

## Alternatives considered

**ccache, keyed on the native sources and the toolchain.** Installed from
Ubuntu's archive (4.9.1), put in front of every CMake compile through
`CMAKE_C_COMPILER_LAUNCHER` and `CMAKE_CXX_COMPILER_LAUNCHER`, with the
compiler identified by the NDK version string and the sloppiness reanimated's
precompiled header needs. It worked as designed: every warm run hit all 326
cacheable compiles. Correctness was its strength: ccache keys each object on
the preprocessed content of its sources and on its compiler, so a stale
library would need a bug in ccache rather than a gap in the job's cache key.
Not chosen because it saves a median of 1:45 per warm build, short of the three
minutes. With every compile a hit, the rest of the step is Gradle's JVM-side
work, so the native compile on the critical path was about two minutes, not
six: the six-minute figure was read from task lines in the log, and in Gradle's
parallel build the CMake tasks overlap Kotlin and Java compilation. Its cold
run was also slower (12:52 against 10:06, one sample each).

**Caching the CMake output (`.cxx` and `build/intermediates/cxx` of every
native module) with Gradle's task history (`android/.gradle`).** Saved after a
build and restored into the freshly generated project before the next. Not
chosen on two counts. It was slower than not caching: a median of 8:58 against
7:12. Gradle re-ran every `configureCMake` and `buildCMake` task against the
restored output instead of reporting any up to date, and Ninja, which decides
what to rebuild on file times, sees every source as newer than its restored
object, because `npm ci` writes each package's files at install time; the
restored objects are consistent with being rebuilt, not reused. Making them
reusable means back-dating the sources, and that is the unsafe part: a library
whose source changed in a lockfile bump would then look no newer than its old
object, and the cache key would be the only guard against a stale library.

**Caching the NDK and CMake that the build downloads.** The runner image ships
NDK 27.3 but React Native asks for 27.1, so the build downloads it (and CMake
3.22.1) on every run. Measured, not tried as a cache: the download takes 17–21
seconds for the NDK and 4 for CMake, too little to be worth a cache of 2 GB.

## Consequences

- Neutral, because the job is unchanged: its build step stays at about seven
  minutes warm and ten cold, and the job's total at task 07's 15–18 minutes.
- Bad, because the 1:45 that ccache would save on every warm run is left on
  the table, on every run of a required check.
- Good, because no tool, cache or key is added whose staleness could make a
  green run meaningless, and the repository's ten-gigabyte cache budget, which
  the Gradle cache alone takes 1.4 GB of, carries no new entry.
- Neutral, because the remaining build time is now known to be mostly the
  JVM side of the build (Gradle and its plugins, Kotlin and Java compilation,
  R8, the JavaScript bundle), so the next attempt at a faster step looks there
  and not at native code.
- **Revisit trigger:** a change that grows the native compile — a new native
  library, or a React Native upgrade that moves more code into per-module CMake
  builds — or a measured build step whose native share has visibly grown;
  re-measure the ccache candidate against the three-minute bar. Also if the
  product owner lowers the bar: ccache is the candidate that cleared the
  correctness concern.

## Evidence

Measured on 2026-11-01 on GitHub's `ubuntu-latest` runner (image
20261026.354.1, NDK 27.3 preinstalled), Expo SDK 58, React Native 0.88.1, NDK
27.1.12297006, CMake 3.22.1, in a throwaway workflow (run 41331224581) whose
jobs ran only the job's own build step, `node scripts/mobile-e2e.mjs build
--platform android --abi x86_64`, after `npm ci`. The cold jobs restored
nothing; the warm ones restored `dev`'s Gradle cache (a hit in all 15) and the
candidate's cache saved by its cold job. Times are the build step's duration
from the jobs API; for the CMake candidate they include its one-second
separate `expo prebuild`, needed because prebuild skips its template when
`android/` already exists.

| Candidate | Cold | Warm (five runs) | Warm median | Against the unchanged job |
|---|---|---|---|---|
| Unchanged job | 10:06 | 7:00, 7:09, 7:12, 7:28, 8:10 | 7:12 | — |
| ccache | 12:52 | 3:42, 4:24, 5:27, 5:48, 5:50 | 5:27 | −1:45 |
| CMake output and task history | 12:08 | 8:51, 8:56, 8:58, 9:06, 9:14 | 8:58 | +1:46 |

- ccache's configuration, as environment variables for the build:
  `CMAKE_C_COMPILER_LAUNCHER=ccache`, `CMAKE_CXX_COMPILER_LAUNCHER=ccache`,
  `CCACHE_COMPILERCHECK=string:27.1.12297006`,
  `CCACHE_SLOPPINESS=pch_defines,time_macros,include_file_mtime,include_file_ctime`,
  `CCACHE_BASEDIR` set to the workspace, `CCACHE_MAXSIZE=2G`.
- ccache: 326 cacheable compile calls and 4 links; 0 hits cold, 326 of 326
  warm in every run read. Cache 132 MB on disk; installing it from apt took 6–9
  s and restoring it 1–3 s, both outside the build step.
- CMake output: 172 MB compressed; every `configureCMake` and `buildCMake`
  task ran in the warm runs, none was reported up to date. That npm
  stamps package files with the install time was checked with `stat` on the
  native sources of a local install, not on the runner.
- The NDK and CMake download, timed alone with `sdkmanager` on three fresh
  runners (run 41334134995): 17, 20 and 21 s for the NDK (2.0 GB installed),
  4 s each for CMake.
- Baseline log read for the six-minute estimate: run 41328315335, the
  `Mobile E2E` job on `dev`.
