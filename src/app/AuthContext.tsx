import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types/models';
import { services } from '../services';
import { errorMessage } from '../services/errors';

/** Τιμές και ενέργειες διαθέσιμες σε κάθε route χωρίς ξεχωριστή βιβλιοθήκη state. */
interface AuthState {
  /** Τρέχων χρήστης από την υπηρεσία πιστοποίησης ή null μετά την αποσύνδεση. */
  user: User | null;
  /** True όσο εκκρεμεί η αρχική επαναφορά της συνεδρίας. */
  loading: boolean;
  /** Σφάλμα ανάκτησης συνεδρίας που εμφανίζει το προστατευμένο route. */
  error: string | null;
  /** Συνδέεται και κρατά τον επιστρεφόμενο User στο React state. */
  login(username: string, password: string): Promise<void>;
  /** Τερματίζει τη συνεδρία υπηρεσίας και μετά καθαρίζει τον User από το React. */
  logout(): Promise<void>;
}

// Το null μετατρέπει την απουσία provider σε σαφές σφάλμα προγραμματισμού.
const AuthContext = createContext<AuthState | null>(null);

/** Διατηρεί την κατάσταση συνδεδεμένου χρήστη για όλες τις οθόνες. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Κανένα UI component δεν διαβάζει απευθείας sessionStorage ή cookies.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Στην εκκίνηση ή ανανέωση ζητάμε από την υπηρεσία τον συνδεδεμένο χρήστη.
  useEffect(() => {
    // Αγνοούμε καθυστερημένη απάντηση αν αφαιρεθεί ο provider κατά την πλοήγηση ή δοκιμή.
    let active = true;
    // Στο real mode καλεί GET /auth/me· στο mock διαβάζει το demo ID.
    services.auth.currentUser().then((value) => { if (active) setUser(value); })
      // Εμφανίζουμε σφάλμα δικτύου/server αντί να θεωρήσουμε σιωπηρά τον χρήστη επισκέπτη.
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)); })
      // Τα προστατευμένα routes αποδίδονται μόλις ολοκληρωθεί το αίτημα.
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  /** Η σελίδα login δίνει στοιχεία σύνδεσης· η υπηρεσία τα ελέγχει. */
  async function login(username: string, password: string) {
    // Κρατάμε μόνο τον χρήστη που επιστράφηκε, ποτέ τον κωδικό.
    const value = await services.auth.login(username, password);
    setUser(value);
    // Η επιτυχής επανάληψη καθαρίζει προηγούμενο σφάλμα φόρτωσης συνεδρίας.
    setError(null);
  }

  /** Η κεφαλίδα το καλεί πριν την επιστροφή στη σελίδα login. */
  async function logout() {
    // Αν αποτύχει το logout, κρατάμε τον χρήστη και εμφανίζουμε το σφάλμα.
    await services.auth.logout();
    setUser(null);
  }

  // Τα παιδιά διαβάζουν αυτό το state μέσω useAuth(), ανεξάρτητα από τον adapter.
  return <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
}

/** Διαβάζει το κοινό state πιστοποίησης από σελίδα ή layout component. */
export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('AuthProvider is missing');
  return state;
}
