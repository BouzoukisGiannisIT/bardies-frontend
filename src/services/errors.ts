/** Κατηγορίες σφαλμάτων για σαφή και συνεπή μηνύματα στις σελίδες. */
export type ServiceErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'not-found' | 'network' | 'server';

/** Και οι δύο adapters επιστρέφουν αυτό το σφάλμα, ώστε οι σελίδες να μην αναλύουν HTTP απαντήσεις. */
export class ServiceError extends Error {
  /** Το `fieldErrors` μπορεί αργότερα να εμφανίζει σφάλματα ανά πεδίο από το backend. */
  constructor(public kind: ServiceErrorKind, message: string, public fieldErrors?: Record<string, string>) {
    // Διατηρούμε το μήνυμα backend/mock ως κανονικό μήνυμα Error.
    super(message);
    // Το σταθερό όνομα βοηθά στον εντοπισμό αυτών των σφαλμάτων κατά το debugging.
    this.name = 'ServiceError';
  }
}

/** Μετατρέπει απρόσμενα σφάλματα σε ασφαλές μήνυμα χωρίς εσωτερικές λεπτομέρειες. */
export function errorMessage(error: unknown): string {
  // Τα γνωστά σφάλματα υπηρεσίας έχουν ήδη ελληνικό μήνυμα για τον χρήστη.
  if (error instanceof ServiceError) return error.message;
  // Τα άγνωστα σφάλματα παίρνουν γενικό μήνυμα και δεν παρουσιάζονται ως επιτυχία.
  return 'Η ενέργεια απέτυχε. Δοκιμάστε ξανά.';
}
