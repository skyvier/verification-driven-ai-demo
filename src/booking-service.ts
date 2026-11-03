import type { BookingRepository, BookingRequest, BookResult, CancelResult } from './booking.js';

/** The feature under delegation. */
export class BookingService {
  constructor(private readonly repository: BookingRepository) {}

  /** Validate and reserve an available interval. */
  book(_booking: BookingRequest): BookResult {
    return { status: 'invalid' }; // Deliberately incomplete for the demo.
  }

  /** Cancel an existing booking, releasing its interval. */
  cancel(_id: string): CancelResult {
    return { status: 'not-found' }; // Deliberately incomplete for the demo.
  }
}
