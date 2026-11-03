import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { BookingService, type BookResult } from '../src/booking.js';
import { MemoryBookingRepository } from '../src/memory-repository.js';

// Compile-time checks: these invalid values must remain rejected by TypeScript.
// @ts-expect-error start must be numeric
const invalidBooking: import('../src/booking.js').BookingRequest = { id: 'x', start: '60', end: 120 };
// @ts-expect-error only documented result statuses are allowed
const invalidResult: BookResult = { status: 'maybe' };

const epochMilliseconds = fc.integer({ min: 1_700_000_000_000, max: 1_700_000_010_000 });
const duration = fc.integer({ min: 1, max: 1000 });

test('every positive interval can be booked and an overlap is rejected', () => {
  fc.assert(fc.property(epochMilliseconds, duration, (start, length) => {
    const repository = new MemoryBookingRepository();
    const service = new BookingService(repository);
    assert.equal(service.book({ id: 'a', start, end: start + length }).status, 'booked');
    assert.equal(service.book({ id: 'b', start, end: start + length }).status, 'conflict');
    assert.equal(repository.list().length, 1);
  }), { seed: 42 });
});

test('a second interval is accepted exactly when it does not overlap', () => {
  fc.assert(fc.property(epochMilliseconds, duration, epochMilliseconds, duration, (firstStart, firstLength, secondStart, secondLength) => {
    const service = new BookingService(new MemoryBookingRepository());
    const firstEnd = firstStart + firstLength;
    const secondEnd = secondStart + secondLength;
    assert.equal(service.book({ id: 'a', start: firstStart, end: firstEnd }).status, 'booked');
    const overlaps = firstStart < secondEnd && secondStart < firstEnd;
    assert.equal(service.book({ id: 'b', start: secondStart, end: secondEnd }).status, overlaps ? 'conflict' : 'booked');
  }), { seed: 44, numRuns: 1000 });
});

test('adjacent bookings never overlap', () => {
  fc.assert(fc.property(epochMilliseconds, duration, duration, (start, firstLength, secondLength) => {
    const service = new BookingService(new MemoryBookingRepository());
    const boundary = start + firstLength;
    assert.equal(service.book({ id: 'a', start, end: boundary }).status, 'booked');
    assert.equal(service.book({ id: 'b', start: boundary, end: boundary + secondLength }).status, 'booked');
  }), { seed: 43 });
});

test('invalid input and failed operations leave real repository unchanged', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
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

test('validation takes precedence over duplicate IDs and overlap', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  assert.equal(service.book({ id: 'taken', start: 10, end: 20 }).status, 'booked');
  assert.equal(service.book({ id: 'taken', start: 15, end: 15 }).status, 'invalid');
  assert.equal(service.book({ id: 'other', start: 15, end: 25 }).status, 'conflict');
  assert.equal(service.book({ id: 'taken', start: 15, end: 25 }).status, 'duplicate-id');
  assert.equal(service.book({ id: '', start: 20, end: 30 }).status, 'invalid');
  assert.equal(repository.list().length, 1);
});

test('invalid IDs and endpoints return invalid without changing bookings', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  assert.equal(service.book({ id: 'existing', start: 10, end: 20 }).status, 'booked');
  assert.equal(service.book({ id: '   ', start: 20, end: 30 }).status, 'booked');
  const invalidBookings = [
    { id: '', start: 20, end: 30 },
    { id: 'fraction-start', start: 1.5, end: 3 },
    { id: 'fraction-end', start: 1, end: 3.5 },
    { id: 'nan-start', start: NaN, end: 3 },
    { id: 'nan-end', start: 1, end: NaN },
    { id: 'infinite-start', start: -Infinity, end: 3 },
    { id: 'infinite-end', start: 1, end: Infinity },
    { id: 'unsafe-start', start: Number.MIN_SAFE_INTEGER - 1, end: 0 },
    { id: 'unsafe-end', start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
    { id: 'zero-length', start: 1, end: 1 },
    { id: 'reversed', start: 2, end: 1 },
  ];
  const before = repository.list();
  for (const booking of invalidBookings) {
    assert.equal(service.book(booking).status, 'invalid', booking.id);
    assert.deepEqual(repository.list(), before, booking.id);
  }
});

test('overlap shapes conflict while either direction of adjacency is allowed', () => {
  const service = new BookingService(new MemoryBookingRepository());
  assert.equal(service.book({ id: 'base', start: 10, end: 20 }).status, 'booked');
  for (const [id, start, end] of [
    ['same', 10, 20],
    ['contains', 5, 25],
    ['inside', 12, 18],
    ['overlaps-left', 5, 11],
    ['overlaps-right', 19, 25],
  ] as const) assert.equal(service.book({ id, start, end }).status, 'conflict', id);
  assert.equal(service.book({ id: 'ends-at-start', start: 5, end: 10 }).status, 'booked');
  assert.equal(service.book({ id: 'starts-at-end', start: 20, end: 25 }).status, 'booked');
});

test('cancellation frees both the interval and its ID for reuse', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  const result = service.book({ id: 'reusable', start: -10, end: 0 });
  assert.equal(result.status, 'booked');
  if (result.status !== 'booked') return;
  assert.deepEqual(result.booking, repository.list()[0]);
  assert.equal(service.book({ id: 'keep', start: 10, end: 20 }).status, 'booked');
  assert.equal(service.cancel('reusable').status, 'cancelled');
  assert.equal(service.cancel('reusable').status, 'not-found');
  assert.equal(service.book({ id: 'new-id', start: -10, end: 0 }).status, 'booked');
  assert.equal(service.book({ id: 'reusable', start: 20, end: 30 }).status, 'booked');
  assert.deepEqual(repository.list().map(booking => booking.id), ['keep', 'new-id', 'reusable']);
});

test('full safe-integer endpoint range and negative timestamps are accepted', () => {
  const service = new BookingService(new MemoryBookingRepository());
  const result = service.book({ id: 'full-range', start: Number.MIN_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER });
  assert.equal(result.status, 'booked');
  if (result.status === 'booked') {
    assert.equal(result.booking.interval.start, Number.MIN_SAFE_INTEGER);
    assert.equal(result.booking.interval.end, Number.MAX_SAFE_INTEGER);
  }
});
