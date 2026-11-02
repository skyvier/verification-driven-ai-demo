import type { Booking, BookingRepository } from './booking.js';

/** Simple real storage for a single in-process calendar. */
export class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>();
  list(): readonly Booking[] { return [...this.bookings.values()].map(booking => ({ ...booking })); }
  save(booking: Booking): void { this.bookings.set(booking.id, { ...booking }); }
  remove(id: string): void { this.bookings.delete(id); }
}
