/** The feature under delegation. */
export class BookingService {
  constructor(_repository: object) {}

  /** Reserve an available interval. */
  book(_booking: unknown) {
    return { status: 'invalid' }; // Deliberately incomplete for the demo.
  }

  /** Cancel an existing booking. */
  cancel(_id: string) {
    return { status: 'not-found' }; // Deliberately incomplete for the demo.
  }
}
