import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { BookingService } from '../../src/booking.js';
import { MemoryBookingRepository } from '../../src/memory-repository.js';

let service: BookingService;
let result: string;
Before(() => { service = new BookingService(new MemoryBookingRepository()); result = ''; });
Given('booking {string} from {int} to {int} exists', (id: string, start: number, end: number) => {
  assert.equal(service.book({ id, start, end }).status, 'booked');
});
When('I book {string} from {int} to {int}', (id: string, start: number, end: number) => {
  result = service.book({ id, start, end }).status;
});
When('I cancel {string}', (id: string) => { result = service.cancel(id).status; });
Then('the result is {string}', (expected: string) => { assert.equal(result, expected); });
