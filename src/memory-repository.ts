import type { Booking, BookingRepository } from './booking.js';

/** Simple real storage for a single in-process calendar. */
export class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>();

  /** Return copies so callers cannot mutate stored reservations by alias. */
  list(): Booking[] {
    return [...this.bookings.values()].map(booking => ({ ...booking }));
  }

  /** Store a copy of a validated reservation. */
  save(booking: Booking): void {
    this.bookings.set(booking.id, { ...booking });
  }

  /** Remove a reservation by its identifier. */
  remove(id: string): void {
    this.bookings.delete(id);
  }
}
