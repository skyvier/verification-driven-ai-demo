import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { BookingService, type BookResult } from '../src/booking.js';
import { MemoryBookingRepository } from '../src/memory-repository.js';

// Compile-time checks: these invalid values must remain rejected by TypeScript.
// @ts-expect-error start must be numeric
const invalidBooking: import('../src/booking.js').Booking = { id: 'x', start: '60', end: 120 };
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
