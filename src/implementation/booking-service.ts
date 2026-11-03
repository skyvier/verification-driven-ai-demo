import { createEpochMilliseconds, createInterval } from '../booking.js';
import type { Booking, BookingRepository, BookingRequest, BookResult, CancelResult } from '../booking.js';

/** Validate and reserve an available interval. */
export function book(repository: BookingRepository, booking: BookingRequest): BookResult {
  const { id, start, end } = booking;
  if (typeof id !== 'string' || id.length === 0) return { status: 'invalid' };

  const validatedStart = createEpochMilliseconds(start);
  const validatedEnd = createEpochMilliseconds(end);
  if (validatedStart === null || validatedEnd === null) return { status: 'invalid' };

  const interval = createInterval(validatedStart, validatedEnd);
  if (interval === null) return { status: 'invalid' };

  const existingBookings = repository.list();
  if (existingBookings.some(existing => existing.id === id)) return { status: 'duplicate-id' };

  // Strict comparisons allow intervals that touch at either boundary.
  if (existingBookings.some(existing =>
    interval.start < existing.interval.end && existing.interval.start < interval.end
  )) return { status: 'conflict' };

  const validatedBooking: Booking = { id, interval };
  repository.save(validatedBooking);
  return { status: 'booked', booking: validatedBooking };
}

/** Cancel an existing booking, releasing its interval. */
export function cancel(repository: BookingRepository, id: string): CancelResult {
  if (!repository.list().some(booking => booking.id === id)) return { status: 'not-found' };

  repository.remove(id);
  return { status: 'cancelled' };
}
