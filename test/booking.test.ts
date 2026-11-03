import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { BookingService, ValidatedInterval, type BookResult } from '../src/booking.js';
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

test('request validation takes precedence over duplicate IDs and conflicts', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  assert.equal(service.book({ id: 'active', start: 10, end: 20 }).status, 'booked');

  assert.equal(service.book({ id: 'active', start: 15, end: 25 }).status, 'duplicate-id');
  assert.equal(service.book({ id: 'active', start: 20, end: 20 }).status, 'invalid');
  assert.equal(service.book({ id: '', start: 15, end: 25 }).status, 'invalid');
  assert.equal(repository.list().length, 1);
});

test('unsafe integer endpoints are invalid and leave the repository unchanged', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  const before = repository.list();

  for (const booking of [
    { id: 'too-large-start', start: Number.MAX_SAFE_INTEGER + 1, end: Number.MAX_SAFE_INTEGER + 2 },
    { id: 'too-large-end', start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
    { id: 'too-small-start', start: Number.MIN_SAFE_INTEGER - 1, end: 0 },
    { id: 'too-small-end', start: Number.MIN_SAFE_INTEGER, end: Number.MIN_SAFE_INTEGER - 1 },
  ]) assert.equal(service.book(booking).status, 'invalid');

  assert.deepEqual(repository.list(), before);
});

test('full safe-integer range and negative timestamps are accepted', () => {
  const service = new BookingService(new MemoryBookingRepository());

  assert.equal(service.book({ id: 'before-epoch', start: Number.MIN_SAFE_INTEGER, end: Number.MIN_SAFE_INTEGER + 1 }).status, 'booked');
  assert.equal(service.book({ id: 'before-zero', start: -1, end: 0 }).status, 'booked');
  assert.equal(service.book({ id: 'after-zero', start: 0, end: 1 }).status, 'booked');
  assert.equal(service.book({ id: 'upper-bound', start: Number.MAX_SAFE_INTEGER - 1, end: Number.MAX_SAFE_INTEGER }).status, 'booked');
});

test('overlap checks every active booking and allows adjacency at each boundary', () => {
  const service = new BookingService(new MemoryBookingRepository());
  assert.equal(service.book({ id: 'first', start: 10, end: 20 }).status, 'booked');
  assert.equal(service.book({ id: 'second', start: 30, end: 40 }).status, 'booked');

  assert.equal(service.book({ id: 'inside-second', start: 35, end: 36 }).status, 'conflict');
  assert.equal(service.book({ id: 'left-adjacent', start: 5, end: 10 }).status, 'booked');
  assert.equal(service.book({ id: 'between', start: 20, end: 30 }).status, 'booked');
  assert.equal(service.book({ id: 'right-adjacent', start: 40, end: 45 }).status, 'booked');
});

test('cancellation releases both the interval and its identifier', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  assert.equal(service.book({ id: 'reuse', start: 10, end: 20 }).status, 'booked');

  assert.equal(service.cancel('reuse').status, 'cancelled');
  assert.equal(service.book({ id: 'reuse', start: 10, end: 20 }).status, 'booked');
});

test('successful results contain immutable validated intervals and repositories stay isolated', () => {
  const firstRepository = new MemoryBookingRepository();
  const firstService = new BookingService(firstRepository);
  const secondRepository = new MemoryBookingRepository();
  const secondService = new BookingService(secondRepository);
  const result = firstService.book({ id: 'validated', start: -5, end: 0 });

  assert.equal(result.status, 'booked');
  if (result.status !== 'booked') return;
  assert.ok(result.booking.interval instanceof ValidatedInterval);
  assert.equal(result.booking.interval.start, -5);
  assert.equal(result.booking.interval.end, 0);
  assert.equal(Object.isFrozen(result.booking.interval), true);
  assert.equal(firstRepository.list().length, 1);
  assert.deepEqual(secondRepository.list(), []);
  assert.equal(secondService.book({ id: 'validated', start: -5, end: 0 }).status, 'booked');
});
