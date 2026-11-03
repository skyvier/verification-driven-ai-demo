# Repository Guidelines

## Project Structure

This TypeScript project models a single-room booking service. `src/booking.ts` defines public contracts, `src/implementation/booking-service.ts` implements booking rules, and `src/memory-repository.ts` provides in-memory storage. `test/features/` contains Gherkin scenarios, `test/steps/` their Cucumber steps, and `test/*.test.ts` the property and integration checks. `scripts/` and `test-harness/` contain the demo launcher and its checks. Compiled output goes to `dist/`.

## Build and Test

Use Node.js 22 or newer. Run `npm ci` to install locked dependencies; alternatively, enter `nix develop` first for the project tools.

- `npm run build` compiles source and tests.
- `npm test` builds and runs the acceptance and property/integration suites.
- After building, run `npm run test:acceptance` or `npm run test:properties` for an individual suite.
- `node --test test-harness/verify.test.mjs` checks candidate transfer; `sh test-harness/sandbox-boundary.sh` checks sandbox permissions outside an enclosing sandbox on macOS.

The service is implemented; run the full suite after behavior changes.

## Coding and Testing

Follow the existing TypeScript style: two-space indentation, single quotes, descriptive camelCase names, and PascalCase types and classes. Use strict types and `.js` import specifiers for local modules. Keep functions focused and document important contracts and assumptions. No formatter or linter is configured.

Use Cucumber for acceptance scenarios, Node's test runner for integration tests, and fast-check for properties. Add tests under `test/` using `*.test.ts` or `test/features/*.feature` as appropriate. Preserve fixed seeds where reproducibility matters. Run the full suite for behavior changes; report known baseline failures explicitly. No coverage threshold is configured.

## Contracts and Delegation

Read `README.md` for booking invariants and scope. For the implementation demo, follow `IMPLEMENTATION_AGENT_PROMPT.md`: preserve the agreed tests, contracts, constructors, repository, scripts, and compiler settings. Flag disputed requirements rather than weakening checks. The local sandbox protects the baseline files, but candidate code runs in the test processes, so review its limitations in the README.

## Commits and Pull Requests

Recent commits use concise, imperative subjects, such as `Add Nix development shell`. Keep changes focused. Describe the problem, solution, checks run, and any expected failures in pull requests; link relevant issues when applicable. Screenshots are unnecessary for this library unless they clarify a change.
