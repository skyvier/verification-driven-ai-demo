/** A half-open interval in whole minutes on a shared timeline. */
export interface Interval { readonly start: number; readonly end: number }

declare const minuteBrand: unique symbol;
/** A validated safe integer representing minutes on the shared timeline. */
export type Minute = number & { readonly [minuteBrand]: 'Minute' };

/** Validate a raw number before treating it as a minute. */
export function createMinute(value: number): Minute | null {
  return Number.isSafeInteger(value) ? value as Minute : null;
}

/** An immutable half-open interval whose endpoints are ordered minutes. */
export class ValidatedInterval implements Interval {
  declare private readonly validatedIntervalBrand: void;

  private constructor(readonly start: Minute, readonly end: Minute) {}

  /** Return an interval only when both endpoints are valid and ordered. */
  static create(start: Minute, end: Minute): ValidatedInterval | null {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end) return null;
    const interval = new ValidatedInterval(start, end);
    Object.freeze(interval);
    return interval;
  }
}

/** Construct an interval from validated minute values. */
export function createInterval(start: Minute, end: Minute): ValidatedInterval | null {
  return ValidatedInterval.create(start, end);
}
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
