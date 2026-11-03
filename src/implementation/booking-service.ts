import { createEpochMilliseconds, createInterval, type BookingRepository, type BookingRequest, type BookResult, type CancelResult } from '../booking.js';

/** Validate and reserve an available interval. */
export function book(repository: BookingRepository, booking: BookingRequest): BookResult {
  if (typeof booking.id !== 'string' || booking.id.length === 0) return { status: 'invalid' };

  const start = createEpochMilliseconds(booking.start);
  const end = createEpochMilliseconds(booking.end);
  if (start === null || end === null) return { status: 'invalid' };

  const interval = createInterval(start, end);
  if (interval === null) return { status: 'invalid' };

  const activeBookings = repository.list();
  if (activeBookings.some(activeBooking => activeBooking.id === booking.id)) {
    return { status: 'duplicate-id' };
  }

  const overlapsActiveBooking = activeBookings.some(activeBooking =>
    interval.start < activeBooking.interval.end && activeBooking.interval.start < interval.end,
  );
  if (overlapsActiveBooking) return { status: 'conflict' };

  const createdBooking = { id: booking.id, interval };
  repository.save(createdBooking);
  return { status: 'booked', booking: createdBooking };
}

/** Cancel an existing booking, releasing its interval. */
export function cancel(repository: BookingRepository, id: string): CancelResult {
  if (!repository.list().some(booking => booking.id === id)) return { status: 'not-found' };

  repository.remove(id);
  return { status: 'cancelled' };
}
