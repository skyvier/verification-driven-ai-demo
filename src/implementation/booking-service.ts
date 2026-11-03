import {
  createEpochMilliseconds,
  createInterval,
  type BookingRepository,
  type BookingRequest,
  type BookResult,
  type CancelResult,
} from '../booking.js';

/** Validate and reserve an available interval. */
export function book(repository: BookingRepository, booking: BookingRequest): BookResult {
  if (typeof booking !== 'object' || booking === null || typeof booking.id !== 'string' || booking.id.length === 0) {
    return { status: 'invalid' };
  }

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
    activeBooking.interval.start < interval.end && interval.start < activeBooking.interval.end,
  );
  if (overlapsExistingBooking) return { status: 'conflict' };

  const validatedBooking = { id: booking.id, interval };
  repository.save(validatedBooking);
  return { status: 'booked', booking: validatedBooking };
}

/** Cancel an existing booking, releasing its interval. */
export function cancel(repository: BookingRepository, id: string): CancelResult {
  const bookingExists = repository.list().some(booking => booking.id === id);
  if (!bookingExists) return { status: 'not-found' };

  repository.remove(id);
  return { status: 'cancelled' };
}
