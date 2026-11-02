/** A half-open interval in whole minutes on a shared timeline. */
export interface Interval { readonly start: number; readonly end: number }
/** A confirmed booking and its caller-provided unique identifier. */
export interface Booking extends Interval { readonly id: string }
/** Expected outcomes are explicit; invalid input does not change the calendar. */
export type BookResult =
  | { readonly status: 'booked'; readonly booking: Booking }
  | { readonly status: 'invalid' | 'conflict' | 'duplicate-id' };
export type CancelResult = { readonly status: 'cancelled' | 'not-found' };

/** Storage boundary for one calendar; operations are sequential, not atomic. */
export interface BookingRepository {
  list(): readonly Booking[];
  save(booking: Booking): void;
  remove(id: string): void;
}

/** The feature under delegation. */
export class BookingService {
  constructor(private readonly repository: BookingRepository) {}

  /** Validate and reserve an available interval. */
  book(_booking: Booking): BookResult {
    return { status: 'invalid' }; // Deliberately incomplete for the demo.
  }

  /** Cancel an existing booking, releasing its interval. */
  cancel(_id: string): CancelResult {
    return { status: 'not-found' }; // Deliberately incomplete for the demo.
  }
}
