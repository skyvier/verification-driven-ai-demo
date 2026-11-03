import { createEpochMilliseconds, createInterval } from '../booking.js';
import type { BookingRepository, BookingRequest, BookResult, CancelResult } from '../booking.js';

/** Validate input, enforce ID uniqueness and reserve a non-overlapping interval. */
export function book(repository: BookingRepository, booking: BookingRequest): BookResult {
  if (!booking || typeof booking.id !== 'string' || booking.id.length === 0) return { status: 'invalid' };

  const start = createEpochMilliseconds(booking.start);
  const end = createEpochMilliseconds(booking.end);
  if (start === null || end === null) return { status: 'invalid' };

  const interval = createInterval(start, end);
  if (interval === null) return { status: 'invalid' };

  const activeBookings = repository.list();
  if (activeBookings.some(activeBooking => activeBooking.id === booking.id)) {
    return { status: 'duplicate-id' };
  }

  const overlapsExistingBooking = activeBookings.some(activeBooking =>
    interval.start < activeBooking.interval.end && activeBooking.interval.start < interval.end
  );
  if (overlapsExistingBooking) return { status: 'conflict' };

  const savedBooking = { id: booking.id, interval };
  repository.save(savedBooking);
  return { status: 'booked', booking: savedBooking };
}

/** Remove an active booking so its ID and interval become available again. */
export function cancel(repository: BookingRepository, id: string): CancelResult {
  if (typeof id !== 'string' || !repository.list().some(booking => booking.id === id)) {
    return { status: 'not-found' };
  }

  repository.remove(id);
  return { status: 'cancelled' };
}
