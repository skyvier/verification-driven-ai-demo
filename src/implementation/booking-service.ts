import type {
  Booking,
  BookingRepository,
  BookingResult,
  CancellationResult,
} from '../booking.js';

/** Validates untrusted booking input before it reaches the calendar. */
function parseBooking(value: unknown): Booking | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if (!('id' in value) || !('start' in value) || !('end' in value)) return undefined;

  const { id, start, end } = value;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  if (typeof start !== 'number' || typeof end !== 'number') return undefined;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end) return undefined;
  return { id, start, end };
}

/** Applies booking rules to a repository representing one room. */
export class BookingService {
  constructor(private readonly repository: BookingRepository) {}

  /** Reserve an available half-open interval without mutating on failure. */
  book(value: unknown): BookingResult {
    const booking = parseBooking(value);
    if (booking === undefined) return { status: 'invalid' };

    const existingBookings = this.repository.list();
    if (existingBookings.some(existing => existing.id === booking.id)) {
      return { status: 'duplicate-id' };
    }
    if (existingBookings.some(existing => existing.start < booking.end && booking.start < existing.end)) {
      return { status: 'conflict' };
    }

    this.repository.save(booking);
    return { status: 'booked' };
  }

  /** Cancel an active booking, freeing its identifier and interval. */
  cancel(id: string): CancellationResult {
    if (!this.repository.list().some(booking => booking.id === id)) {
      return { status: 'not-found' };
    }
    this.repository.remove(id);
    return { status: 'cancelled' };
  }
}
