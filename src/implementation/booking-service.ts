import type { BookingRepository, BookingRequest, BookResult, CancelResult } from '../booking.js';

/** Validate and reserve an available interval. */
export function book(_repository: BookingRepository, _booking: BookingRequest): BookResult {
  return { status: 'invalid' }; // Deliberately incomplete for the demo.
}

/** Cancel an existing booking, releasing its interval. */
export function cancel(_repository: BookingRepository, _id: string): CancelResult {
  return { status: 'not-found' }; // Deliberately incomplete for the demo.
}
