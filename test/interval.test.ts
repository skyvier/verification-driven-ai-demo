import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInterval, createMinute, type Minute, type ValidatedInterval } from '../src/booking.js';

// @ts-expect-error Raw numbers must be validated before they are minutes.
const rawMinute: Minute = 10;
// @ts-expect-error An interval must be created by the constructor.
const rawInterval: ValidatedInterval = { start: 10, end: 20 };
const validatedStart = createMinute(10)!;
const validatedEnd = createMinute(20)!;
// @ts-expect-error Even validated endpoints cannot bypass interval ordering.
const unorderedInterval: ValidatedInterval = { start: validatedEnd, end: validatedStart };
const validInterval = createInterval(validatedStart, validatedEnd)!;
// @ts-expect-error Copying an interval cannot preserve its validated identity.
const copiedInterval: ValidatedInterval = { ...validInterval, start: validatedEnd };
void rawMinute; void rawInterval;
void unorderedInterval; void copiedInterval;

test('minutes accept safe integers and reject other numbers', () => {
  for (const value of [Number.MIN_SAFE_INTEGER, -1, 0, 1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(createMinute(value), value);
  }
  for (const value of [NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(createMinute(value), null);
  }
});

test('intervals require ordered minutes and cannot be mutated', () => {
  const start = createMinute(10)!;
  const end = createMinute(20)!;
  const interval = createInterval(start, end);
  assert.equal(interval?.start, 10);
  assert.equal(interval?.end, 20);
  assert.ok(Object.isFrozen(interval));
  assert.equal(createInterval(start, start), null);
  assert.equal(createInterval(end, start), null);
  assert.equal(createInterval(NaN as Minute, end), null);
});
