Implement the meeting-room booking feature described in README.md. This is the delegated implementation stage of a verification-first demo.

Start by running the documented build and tests and report the starting failures. Implement the feature using the existing public contracts and the real in-memory repository. Keep changes focused and preserve the sequential, single-room scope. Run the complete checks, use their feedback to correct your implementation, and report the commands and results. You may add supplementary tests.

The README intent, src/booking.ts public types and signatures, test/features/, test/steps/, test/booking.test.ts, package scripts and compiler settings are the agreed baseline. Do not weaken, delete, skip, modify or replace these checks, contracts, or requirements to make the tests pass. You may modify the method bodies and imports of src/booking.ts, and add implementation files. If you believe a baseline requirement or check is wrong, stop and flag it for explicit human review rather than changing it. The operator will independently compare the final diff with the checkpoint and rerun the checks.

Describe any remaining risks and the limits of the evidence. Do not claim concurrency or persistence guarantees that were not established.
