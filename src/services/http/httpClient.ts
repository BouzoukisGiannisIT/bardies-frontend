import { ServiceError, type ServiceErrorKind } from '../errors';

// Μετατρέπουμε HTTP status στις κοινές κατηγορίες σφαλμάτων των σελίδων.
const statusKinds: Record<number, ServiceErrorKind> = { 400: 'validation', 401: 'unauthorized', 403: 'forbidden', 404: 'not-found', 422: 'validation' };
// Το μήνυμα backend υπερισχύει· αυτά είναι εναλλακτικά για κενές απαντήσεις.
const defaultMessages: Record<ServiceErrorKind, string> = {
  validation: 'Ελέγξτε τα στοιχεία που καταχωρίσατε.', unauthorized: 'Η συνεδρία έληξε. Συνδεθείτε ξανά.',
  forbidden: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.', 'not-found': 'Τα δεδομένα δεν βρέθηκαν.',
  network: 'Αδυναμία σύνδεσης με την υπηρεσία.', server: 'Προέκυψε σφάλμα υπηρεσίας. Δοκιμάστε ξανά.',
};

/** Προτεινόμενο JSON σφάλματος· η ακριβής μορφή συμφωνείται με το backend. */
interface ErrorPayload { message?: string; fieldErrors?: Record<string, string> }

/** Η μοναδική κλάση που κάνει πραγματικές κλήσεις `fetch` στην εφαρμογή. */
export class HttpClient {
  // Το base URL έρχεται από το VITE_API_BASE_URL στο `services/index.ts`.
  constructor(private baseUrl: string) {}

  /** Στέλνει τυποποιημένο JSON αίτημα και ενοποιεί σφάλματα δικτύου και API. */
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    // Η απάντηση μένει έξω από το try ώστε τα HTTP status να ελεγχθούν παρακάτω.
    let response: Response;
    try {
      // Αφαιρούμε την τελική κάθετο του base URL πριν προσθέσουμε το endpoint path.
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        // Ο καλών δίνει method/body· προεπιλογή του browser είναι GET.
        ...init,
        // Στέλνουμε το cookie συνεδρίας· ο server πρέπει να παρέχει και προστασία CSRF.
        credentials: 'include',
        // Τα προτεινόμενα endpoints χρησιμοποιούν JSON· μπορούν να προστεθούν headers.
        headers: { 'Content-Type': 'application/json', ...init.headers },
      });
    } catch {
      // Το `fetch` απορρίπτει αστοχία σύνδεσης, όχι συνηθισμένες απαντήσεις 4xx/5xx.
      throw new ServiceError('network', defaultMessages.network);
    }
    // Μετατρέπουμε κάθε αποτυχημένο HTTP status σε προβλέψιμο ServiceError.
    if (!response.ok) {
      // Τα γνωστά status έχουν ειδική κατηγορία· τα υπόλοιπα είναι σφάλματα server.
      const kind = statusKinds[response.status] ?? 'server';
      // Ορισμένα endpoints μπορεί να μην επιστρέψουν JSON σώμα σφάλματος.
      let body: ErrorPayload = {};
      try {
        // Η ανάγνωση ως `unknown` αποτρέπει την άκριτη εμπιστοσύνη στα δεδομένα server.
        const parsed: unknown = await response.json();
        // Μόνο JSON αντικείμενα μπορούν να δώσουν μήνυμα ή σφάλματα πεδίων.
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as ErrorPayload;
      } catch { /* Το σώμα σφάλματος μπορεί να είναι κενό. */ }
      // Η αποτυχημένη αποθήκευση προκαλεί σφάλμα, άρα το UI δεν δείχνει ψευδή επιτυχία.
      throw new ServiceError(kind, body.message ?? defaultMessages[kind], body.fieldErrors);
    }
    // Η απάντηση 204 δεν έχει JSON, όπως αναμένεται σε logout/εγγραφή.
    if (response.status === 204) return undefined as T;
    // Ο γενικός τύπος T δηλώνει το συμφωνημένο contract, όχι έλεγχο κατά την εκτέλεση.
    try { return await response.json() as T; }
    // Μη έγκυρη επιτυχής απάντηση δεν μπορεί να χρησιμοποιηθεί ως πρόγραμμα ή χρήστης.
    catch { throw new ServiceError('server', 'Μη έγκυρη απάντηση της υπηρεσίας.'); }
  }
}
