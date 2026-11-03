import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookingService, ValidatedInterval, type BookResult, type BookingRequest } from '../src/booking.js';
import { MemoryBookingRepository } from '../src/memory-repository.js';

/** Create a service backed by the real in-memory calendar. */
function createService() {
  const repository = new MemoryBookingRepository();
  return { repository, service: new BookingService(repository) };
}

// Compile-time checks: these invalid values must remain rejected by TypeScript.
// @ts-expect-error start must be numeric
const invalidBooking: import('../src/booking.js').BookingRequest = { id: 'x', start: '60', end: 120 };
// @ts-expect-error only documented result statuses are allowed
const invalidResult: BookResult = { status: 'maybe' };

test('invalid input and failed operations leave real repository unchanged', () => {
  const { repository, service } = createService();
  assert.equal(service.book({ id: 'a', start: 10, end: 20 }).status, 'booked');
  const before = repository.list();
  for (const booking of [
    { id: '', start: 20, end: 30 }, { id: 'b', start: 20, end: 20 },
    { id: 'b', start: 21, end: 20 }, { id: 'b', start: NaN, end: 30 },
    { id: 'b', start: 20.5, end: 30 }, { id: 'b', start: 20, end: Infinity },
    { id: 'a', start: 30, end: 40 }, { id: 'b', start: 15, end: 25 },
  ]) assert.notEqual(service.book(booking).status, 'booked');
  assert.equal(service.cancel('missing').status, 'not-found');
  assert.deepEqual(repository.list(), before);
  assert.equal(service.cancel('a').status, 'cancelled');
  assert.deepEqual(repository.list(), []);
});

test('rejects overlapping intervals in either direction, including containment and equality', () => {
  const overlaps = [
    [9, 11], [19, 21], [12, 18], [5, 25], [10, 20],
  ] as const;

  for (const [start, end] of overlaps) {
    const { service, repository } = createService();
    assert.equal(service.book({ id: 'existing', start: 10, end: 20 }).status, 'booked');
    const before = repository.list();

    assert.deepEqual(service.book({ id: 'new', start, end }), { status: 'conflict' });
    assert.deepEqual(repository.list(), before);
  }
});

test('allows adjacent bookings on either side', () => {
  const { service, repository } = createService();
  assert.equal(service.book({ id: 'middle', start: 0, end: 10 }).status, 'booked');

  assert.equal(service.book({ id: 'before', start: -5, end: 0 }).status, 'booked');
  assert.equal(service.book({ id: 'after', start: 10, end: 15 }).status, 'booked');
  assert.deepEqual(repository.list().map(({ id }) => id), ['middle', 'before', 'after']);
});

test('validates safe integer endpoints and nonempty string IDs before checking duplicates or conflicts', () => {
  const { service, repository } = createService();
  assert.equal(service.book({ id: 'taken', start: 10, end: 20 }).status, 'booked');

  const invalidRequests: unknown[] = [
    { id: 'taken', start: 10, end: 20.5 },
    { id: 'taken', start: Number.MAX_SAFE_INTEGER + 1, end: Number.MAX_SAFE_INTEGER + 2 },
    { id: 'taken', start: 20, end: 10 },
    { id: '', start: 0, end: 1 },
    { id: 7, start: 0, end: 1 },
    null,
    undefined,
    'not a booking object',
  ];
  for (const request of invalidRequests) {
    assert.deepEqual(service.book(request as BookingRequest), { status: 'invalid' });
  }
  assert.deepEqual(service.book({ id: 'taken', start: 15, end: 25 }), { status: 'duplicate-id' });
  assert.deepEqual(service.book({ id: 'other', start: 15, end: 25 }), { status: 'conflict' });
  assert.deepEqual(repository.list().map(({ id }) => id), ['taken']);
});

test('accepts safe integer extremes and returns a booking with an immutable validated interval', () => {
  const { service, repository } = createService();
  const result = service.book({
    id: 'whole-range', start: Number.MIN_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER,
  });

  assert.equal(result.status, 'booked');
  if (result.status !== 'booked') return;
  assert.equal(result.booking.id, 'whole-range');
  assert.equal(result.booking.interval.start, Number.MIN_SAFE_INTEGER);
  assert.equal(result.booking.interval.end, Number.MAX_SAFE_INTEGER);
  assert.ok(result.booking.interval instanceof ValidatedInterval);
  assert.equal(Object.isFrozen(result.booking.interval), true);
  assert.deepEqual(repository.list(), [result.booking]);
});

test('cancellation frees the interval and ID while preserving other bookings', () => {
  const { service, repository } = createService();
  assert.equal(service.book({ id: 'cancelled', start: 0, end: 10 }).status, 'booked');
  assert.equal(service.book({ id: 'keep', start: 10, end: 15 }).status, 'booked');
  const keep = repository.list()[1];

  assert.deepEqual(service.cancel('missing'), { status: 'not-found' });
  assert.deepEqual(service.cancel('cancelled'), { status: 'cancelled' });
  assert.deepEqual(repository.list(), [keep]);
  assert.equal(service.book({ id: 'cancelled', start: 0, end: 10 }).status, 'booked');
});
