/** A half-open interval in Unix epoch milliseconds. */
export interface Interval { readonly start: number; readonly end: number }

declare const epochMillisecondsBrand: unique symbol;
/** A validated safe integer representing Unix epoch milliseconds. */
export type EpochMilliseconds = number & { readonly [epochMillisecondsBrand]: 'EpochMilliseconds' };

/** Validate a raw number before treating it as Unix epoch milliseconds. */
export function createEpochMilliseconds(value: number): EpochMilliseconds | null {
  return Number.isSafeInteger(value) ? value as EpochMilliseconds : null;
}

/** An immutable half-open interval whose endpoints are ordered Unix epoch milliseconds. */
export class ValidatedInterval implements Interval {
  declare private readonly validatedIntervalBrand: void;

  private constructor(readonly start: EpochMilliseconds, readonly end: EpochMilliseconds) {}

  /** Return an interval only when both endpoints are valid and ordered. */
  static create(start: EpochMilliseconds, end: EpochMilliseconds): ValidatedInterval | null {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end) return null;
    const interval = new ValidatedInterval(start, end);
    Object.freeze(interval);
    return interval;
  }
}

/** Construct an interval from validated Unix epoch millisecond values. */
export function createInterval(start: EpochMilliseconds, end: EpochMilliseconds): ValidatedInterval | null {
  return ValidatedInterval.create(start, end);
}
/** Untrusted request: the service must validate it before storage. */
export interface BookingRequest extends Interval { readonly id: string }
/** A booking can only carry an interval produced by the validating constructor. */
export interface Booking {
  readonly id: string;
  readonly interval: ValidatedInterval;
}
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
  book(_booking: BookingRequest): BookResult {
    return { status: 'invalid' }; // Deliberately incomplete for the demo.
  }

  /** Cancel an existing booking, releasing its interval. */
  cancel(_id: string): CancelResult {
    return { status: 'not-found' }; // Deliberately incomplete for the demo.
  }
}
