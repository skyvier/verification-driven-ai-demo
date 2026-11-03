import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { BookingService } from '../src/booking.js';
import { MemoryBookingRepository } from '../src/memory-repository.js';

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

test('validates unknown input and supports the full safe-integer range', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  for (const input of [null, undefined, 1, 'booking', {}, { id: 'x', start: 0 },
    { id: '', start: 0, end: 1 }, { id: 'x', start: Number.MIN_SAFE_INTEGER - 1, end: 0 },
    { id: 'x', start: 0, end: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.deepEqual(service.book(input), { status: 'invalid' });
  }
  assert.deepEqual(service.book({ id: 'before-epoch', start: Number.MIN_SAFE_INTEGER, end: -1 }), { status: 'booked' });
  assert.deepEqual(service.book({ id: 'after-date-range', start: 0, end: Number.MAX_SAFE_INTEGER }), { status: 'booked' });
  assert.equal(repository.list().length, 2);
});

test('reports invalid before duplicate and duplicate before overlap', () => {
  const service = new BookingService(new MemoryBookingRepository());
  assert.equal(service.book({ id: 'taken', start: 10, end: 20 }).status, 'booked');
  assert.equal(service.book({ id: 'taken', start: 15, end: 25 }).status, 'duplicate-id');
  assert.equal(service.book({ id: 'other', start: 15, end: 25 }).status, 'conflict');
  assert.equal(service.book({ id: 'taken', start: 20, end: 20 }).status, 'invalid');
  assert.equal(service.book({ id: ' ', start: 20, end: 21 }).status, 'booked');
});

test('repository copies prevent alias mutation and cancellation frees the ID', () => {
  const repository = new MemoryBookingRepository();
  const service = new BookingService(repository);
  const input = { id: 'a', start: 10, end: 20 };
  assert.equal(service.book(input).status, 'booked');
  input.start = -100;
  const listed = repository.list();
  assert.notEqual(listed[0], repository.list()[0]);
  listed[0] = { id: 'changed', start: -100, end: -50 };
  assert.deepEqual(repository.list(), [{ id: 'a', start: 10, end: 20 }]);
  assert.equal(service.cancel('a').status, 'cancelled');
  assert.equal(service.book({ id: 'a', start: 10, end: 20 }).status, 'booked');
});
