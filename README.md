# Verification before delegation: room booking

A small, single-room booking library for the talk **“Ohjelmistokehitys autonomisten agenttien aikakaudella — Miten annamme tekoälylle enemmän autonomiaa menettämättä kontrollia?”** Its purpose is to make expectations executable before asking an agent to implement them.

## Intent

Clients book and cancel reservations through `BookingService`, using a caller-supplied ID and integer Unix epoch milliseconds (milliseconds since 1970-01-01T00:00:00Z). Each interval is half-open `[start, end)`: it includes its start and excludes its end. Adjacent bookings are allowed, but overlapping bookings are rejected. IDs must be nonempty and unique among active bookings. Start and end must be finite safe integers and start must be less than end. Invalid requests, duplicate IDs, conflicts and cancellation of a missing ID do not change the calendar. Validate input first, then check duplicate ID, then overlap. Cancellation removes the active booking and frees both the interval and the ID.

Negative timestamps represent instants before the Unix epoch. The numeric contract permits the full safe-integer range, which is wider than JavaScript's `Date` range; converting a timestamp to a `Date` requires a separate range check.

The calendar is initially empty; it represents one room. Calls are sequential in one process. Time zones, recurring bookings, authorization, persistence across restarts, and concurrent requests are outside this demo. The repository is not an atomic transaction boundary; this design does **not** guarantee safety under concurrency.

## Why this example

A task queue could demonstrate uniqueness and state transitions, but overlap and adjacency make meeting-room examples easier to see. A database-backed booking service would demonstrate stronger integration guarantees, at the cost of setup and concurrency complexity. This in-memory version keeps feedback fast while still exercising a real storage component.

- **Types and contracts:** the TypeScript interface and result union constrain callers and implementations at compile time. TypeScript types are erased; numeric validity and business rules require runtime checks. `@ts-expect-error` examples are checked by the compiler, not runtime tests.
- **Validated values:** `createEpochMilliseconds` accepts only safe integer Unix epoch milliseconds, and `createInterval` produces an immutable `ValidatedInterval` only when its start precedes its end. `BookingService.book` accepts a raw `BookingRequest` so it can report invalid requests. Stored `Booking` values and successful results require a `ValidatedInterval` in their `interval` field: the implementation must validate the endpoints and their ordering before constructing a booking. `BookingRepository.save` rejects raw requests and structural lookalikes at compile time. The repository preserves the immutable interval when copying bookings. These types establish interval validity; uniqueness and non-overlap still require behavioral checks. Type assertions and untyped callers can bypass TypeScript checks.
- **Gherkin:** concrete booking, conflict, adjacency, cancellation, invalid-input and duplicate-ID examples run through Cucumber and the service.
- **Properties:** fast-check generates intervals to check that equal intervals conflict and touching intervals coexist. Fixed seeds aid reproduction; these properties cover generated cases, not all possible behavior.
- **Integration:** the tests use the actual in-memory repository with the service to inspect changes and verify failed operations leave state intact. They do not test a database or concurrency.
- **Regression:** after the live implementation, a later real bug can be reproduced in a test before repair. No agent failure has been seeded or observed here.

## Run

Requires Node.js 22 or newer and npm.

Alternatively, with Nix installed, run `nix develop` to enter a shell with Node.js, npm, Git, and GitHub CLI. Then install the project dependencies with `npm ci`.

Install exact dependencies with `npm ci`, then:

```sh
npm run build             # compile-time contracts, including negative type checks
npm test                  # build, acceptance scenarios, and property/integration tests
```

At this checkpoint `npm run build` must succeed, while behavioral tests intentionally fail because `BookingService` is a stub. Some individual checks can pass already. The Cucumber report may mark later steps as skipped after an earlier assertion fails. Run `npm run test:acceptance` or `npm run test:properties` after building to inspect each suite separately. Both suites must pass after implementation.

## Demo sequence

1. **Intent:** review the rules and the scenarios with the audience. Identify missing product decisions.
2. **Verification ready:** run `npm ci`, `npm run build`, and `npm test`. Show the behavioral failures and the deliberate service stub. This repository checkpoint is the starting state; record its commit with `git rev-parse HEAD` before delegation. To reproduce in a separate directory, use `git worktree add ../booking-demo-start <checkpoint-commit>` and run `npm ci` there.
3. **Delegated implementation:** run `sh scripts/run-demo.sh` from a clean committed checkpoint. The script creates a temporary baseline from `HEAD`, installs its locked dependencies, and launches Codex against a separate copy. It prints the checkpoint and the temporary directory so the run can be inspected.
4. **Review:** the script copies only the candidate service into a fresh copy of the baseline and runs `npm test`. It reports success only if Codex exits successfully and the trusted checks pass. Inspect the candidate in the printed workspace, and discuss what the tests actually prove, missing cases, storage and concurrency limits, and whether the requirements express what users need.

The service stub is isolated in `src/implementation/booking-service.ts`; contracts and validating constructors remain in `src/booking.ts`, and tests remain under `test/`. The Codex permission profile grants write access only to `src/implementation/` and `dist/`, with approval requests disabled. Only `booking-service.ts` is copied to the verifier; additional implementation files are not included. The baseline and verification workspace are outside the agent's writable paths. The script uses the committed `HEAD`, not uncommitted changes; it leaves the temporary run directory for inspection and does not automatically retry a failed verification.

This is a local demo, not a hardened sandbox for hostile code. The trusted checks run with only their build output writable and network disabled, but execute candidate code in the same process as the tests. Candidate code could interfere with the result, for example by terminating a test process early or modifying generated tests in `dist/`. The public `BookingService` signatures remain in the protected contract. Passing tests demonstrate only encoded properties, not complete correctness or production readiness.

Run the verifier tests with `node --test test-harness/verify.test.mjs`. On macOS, run `sh test-harness/sandbox-boundary.sh` outside any enclosing sandbox to exercise the real Codex filesystem profile. The launcher requires a recent Codex CLI with named permission profiles, a working login, Node.js, npm, Git, and permission to create its platform sandbox.
