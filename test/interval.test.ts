import { MemoryBookingRepository } from '../src/memory-repository.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Booking, type BookingRequest, type BookResult, type BookingRepository, createInterval, createEpochMilliseconds, type EpochMilliseconds, type ValidatedInterval } from '../src/booking.js';

// @ts-expect-error Raw numbers must be validated before they are epoch milliseconds.
const rawEpochMilliseconds: EpochMilliseconds = 10;
// @ts-expect-error An interval must be created by the constructor.
const rawInterval: ValidatedInterval = { start: 10, end: 20 };
const validatedStart = createEpochMilliseconds(10)!;
const validatedEnd = createEpochMilliseconds(20)!;
// @ts-expect-error Even validated endpoints cannot bypass interval ordering.
const unorderedInterval: ValidatedInterval = { start: validatedEnd, end: validatedStart };
const validInterval = createInterval(validatedStart, validatedEnd)!;
// @ts-expect-error Copying an interval cannot preserve its validated identity.
const copiedInterval: ValidatedInterval = { ...validInterval, start: validatedEnd };
void rawEpochMilliseconds; void rawInterval;
void unorderedInterval; void copiedInterval;

test('epoch milliseconds accept safe integers and reject other numbers', () => {
  for (const value of [Number.MIN_SAFE_INTEGER, -1, 0, 1, 1_700_000_000_000, Number.MAX_SAFE_INTEGER]) {
    assert.equal(createEpochMilliseconds(value), value);
  }
  for (const value of [NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(createEpochMilliseconds(value), null);
  }
});

test('epoch milliseconds identify UTC instants on either side of the epoch', () => {
  assert.equal(new Date(createEpochMilliseconds(-1)!).toISOString(), '1969-12-31T23:59:59.999Z');
  assert.equal(new Date(createEpochMilliseconds(0)!).toISOString(), '1970-01-01T00:00:00.000Z');
  assert.equal(new Date(createEpochMilliseconds(1_700_000_000_000)!).toISOString(), '2023-11-14T22:13:20.000Z');
});

test('intervals require ordered epoch milliseconds and cannot be mutated', () => {
  const start = createEpochMilliseconds(10)!;
  const end = createEpochMilliseconds(20)!;
  const interval = createInterval(start, end);
  assert.equal(interval?.start, 10);
  assert.equal(interval?.end, 20);
  assert.ok(Object.isFrozen(interval));
  assert.equal(createInterval(start, start), null);
  assert.equal(createInterval(end, start), null);
  assert.equal(createInterval(NaN as EpochMilliseconds, end), null);
});

// Compile-only boundary checks; this function is deliberately never invoked.
function checkBookingBoundary(repository: BookingRepository, request: BookingRequest) {
  // @ts-expect-error Raw requests cannot be persisted as validated bookings.
  repository.save(request);
  // @ts-expect-error Safe endpoints alone do not establish interval ordering.
  repository.save({ id: 'a', interval: { start: validatedStart, end: validatedEnd } });
  // @ts-expect-error Successful results must also contain a validated booking.
  const invalidSuccess: BookResult = { status: 'booked', booking: request };
  const booking: Booking = { id: 'a', interval: validInterval };
  repository.save(booking);
  const success: BookResult = { status: 'booked', booking };
}

test('repository preserves validated interval identity and immutability', () => {
  const repository = new MemoryBookingRepository();
  repository.save({ id: 'a', interval: validInterval });
  const stored = repository.list()[0]!;
  assert.equal(stored.interval, validInterval);
  assert.ok(Object.isFrozen(stored.interval));
  assert.throws(() => Object.assign(stored.interval, { start: validatedEnd }), TypeError);
  assert.equal(repository.list()[0]!.interval.start, validatedStart);
});
