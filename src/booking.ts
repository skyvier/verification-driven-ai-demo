/** A reservation for a half-open interval of epoch milliseconds. */
export interface Booking {
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

/** Storage operations required by the single-room booking service. */
export interface BookingRepository {
  list(): Booking[];
  save(booking: Booking): void;
  remove(id: string): void;
}

/** Result of attempting to reserve a room interval. */
export type BookingResult =
  | { readonly status: 'booked' }
  | { readonly status: 'invalid' }
  | { readonly status: 'duplicate-id' }
  | { readonly status: 'conflict' };

/** Result of attempting to cancel a room reservation. */
export type CancellationResult =
  | { readonly status: 'cancelled' }
  | { readonly status: 'not-found' };

export { BookingService } from './implementation/booking-service.js';
