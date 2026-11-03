import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookingService, type BookResult } from '../src/booking.js';
import { MemoryBookingRepository } from '../src/memory-repository.js';

// Compile-time checks: these invalid values must remain rejected by TypeScript.
// @ts-expect-error start must be numeric
const invalidBooking: import('../src/booking.js').BookingRequest = { id: 'x', start: '60', end: 120 };
// @ts-expect-error only documented result statuses are allowed
const invalidResult: BookResult = { status: 'maybe' };

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
