/** Simple real storage for a single in-process calendar. */
export class MemoryBookingRepository {
  private readonly bookings = new Map<string, { readonly id: string }>();
  list() { return [...this.bookings.values()].map(booking => ({ ...booking })); }
  save(booking: { readonly id: string }) { this.bookings.set(booking.id, { ...booking }); }
  remove(id: string) { this.bookings.delete(id); }
}
