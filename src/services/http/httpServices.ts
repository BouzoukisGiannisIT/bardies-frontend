import type { Services } from '../contracts';
import type { DailyRoster, Department, RegisterRequest, SaveUnitAssignmentsRequest, StaffMember, User } from '../../types/models';
import { HttpClient } from './httpClient';
import { canEditUnit } from '../../utils/permissions';
import { ServiceError } from '../errors';

/** Συνδέει τα προτεινόμενα backend endpoints με τα σταθερά interfaces του frontend. */
export function createHttpServices(baseUrl: string): Services {
  // Ο κοινός client χειρίζεται cookies, ανάγνωση JSON και μετατροπή σφαλμάτων.
  const client = new HttpClient(baseUrl);
  // Τα paths και payloads είναι προτάσεις· προσαρμόστε τα μετά τη συμφωνία για το API.
  return {
    auth: {
      // Στέλνει τα στοιχεία με POST· η απάντηση πρέπει να έχει role και editableUnitIds.
      login: (username: string, password: string) => client.request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
      // Σε ανανέωση διαβάζει τη συνεδρία από τον server, όχι από αποθήκευση browser.
      currentUser: async () => {
        // Η ενεργή συνεδρία επιστρέφει το ίδιο User contract με το login.
        try { return await client.request<User>('/auth/me'); }
        // Το 401 σημαίνει αποσύνδεση· τα υπόλοιπα σφάλματα φτάνουν στο UI.
        catch (error) { if (error instanceof ServiceError && error.kind === 'unauthorized') return null; throw error; }
      },
      // Τερματίζει τη συνεδρία στον server πριν καθαριστεί ο χρήστης από το React.
      logout: () => client.request<void>('/auth/logout', { method: 'POST' }),
      // Τα αιτήματα εγγραφής απαιτούν έλεγχο από το backend· το frontend δεν ορίζει ρόλο.
      register: (request: RegisterRequest) => client.request<void>('/auth/registration-requests', { method: 'POST', body: JSON.stringify(request) }),
    },
    staff: {
      // Ο κατάλογος τμημάτων τροφοδοτεί πίνακες και φόρμες με τύπους βάρδιας.
      getDepartments: () => client.request<Department[]>('/units'),
      // Το διαθέσιμο προσωπικό συμπληρώνει τις επιλογές μόνο του ζητούμενου τμήματος.
      getStaff: (unitId: string) => client.request<StaffMember[]>(`/units/${encodeURIComponent(unitId)}/staff`),
    },
    shifts: {
      // Η απάντηση προγράμματος καλύπτει όλα τα τμήματα για Dashboard και Excel.
      getDailyRoster: (date: string) => client.request<DailyRoster>(`/rosters/${encodeURIComponent(date)}`),
      // Το PUT αντικαθιστά τις βάρδιες ενός τμήματος· ο server κρατά τα υπόλοιπα.
      async saveUnitAssignments(request: SaveUnitAssignmentsRequest) {
        // Ξαναδιαβάζουμε τον χρήστη, γιατί τα δικαιώματα ίσως άλλαξαν μετά τη φόρτωση.
        const user = await client.request<User>('/auth/me');
        // Ο έλεγχος δίνει άμεσο μήνυμα· ο server ΠΡΕΠΕΙ να τον επαναλάβει.
        if (!canEditUnit(user, request.unitId)) throw new ServiceError('forbidden', 'Δεν έχετε δικαίωμα αλλαγής σε αυτό το τμήμα.');
        // Ο server ΠΡΕΠΕΙ επίσης να ελέγξει ID βαρδιών, διαθεσιμότητα και διπλοεγγραφές.
        return client.request<DailyRoster>(`/rosters/${encodeURIComponent(request.date)}/units/${encodeURIComponent(request.unitId)}`, {
          // Στέλνουμε μόνο τις αναθέσεις του επιλεγμένου τμήματος, όχι όλης της ημέρας.
          method: 'PUT', body: JSON.stringify({ assignments: request.assignments }),
        });
      },
    },
  };
}
