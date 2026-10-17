import type { AuthService, Services, ShiftService, StaffService } from '../contracts';
import { ServiceError } from '../errors';
import type { DailyRoster, Department, RegisterRequest, SaveUnitAssignmentsRequest, ShiftAssignment, StaffMember, User } from '../../types/models';
import { canEditUnit } from '../../utils/permissions';
import { isDateKey, todayInAthens } from '../../utils/date';
import { demoPassword, departments, staff, users } from './data';

// Τα κλειδιά αποθήκευσης αφορούν μόνο το mock mode και έχουν έκδοση για αλλαγές demo δεδομένων.
const rosterKey = 'bardies.mock.rosters.v1';
const sessionKey = 'bardies.mock.session.v1';
// Μικρή καθυστέρηση προσομοιώνει τις ασύγχρονες κλήσεις HTTP.
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 90));

// Επιστρέφουμε αντίγραφα για να μην αλλάζει component τον κατάλογο ή το πρόγραμμα μέσω αναφοράς.
function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Διαβάζει τον δοκιμαστικό χρήστη από το sessionStorage· δεν αποθηκεύεται κωδικός. */
function getUser(): User | null {
  // Μόνο το ID διατηρείται για την τρέχουσα συνεδρία browser.
  const id = sessionStorage.getItem(sessionKey);
  // Άγνωστο ή αφαιρεμένο ID σημαίνει αποσυνδεδεμένο χρήστη.
  return users.find((user) => user.id === id) ?? null;
}

/** Προστατεύει τις mock λειτουργίες που απαιτούν συνδεδεμένο χρήστη. */
function requireUser(): User {
  const user = getUser();
  // Χρησιμοποιούμε την ίδια κατηγορία μη εξουσιοδότησης με τον πραγματικό adapter.
  if (!user) throw new ServiceError('unauthorized', 'Η συνεδρία έληξε. Συνδεθείτε ξανά.');
  return user;
}

/** Δίνει ενδεικτικές αναθέσεις μόνο στο πρώτο, μη αποθηκευμένο πρόγραμμα της σημερινής ημέρας. */
function seedFor(date: string): ShiftAssignment[] {
  // Οι άλλες ημέρες ξεκινούν κενές· το UI εμφανίζει πάντως τις ρυθμισμένες βάρδιες.
  if (date !== todayInAthens()) return [];
  // Τα κλειδιά συνδυάζουν ID τμήματος και βάρδιας· οι τιμές έχουν ID προσωπικού, όχι ονόματα.
  const values: Record<string, string[]> = {
    'd4:morning': ['d4-1'], 'd4:afternoon': ['d4-2'], 'd4:night': ['d4-3'],
    'd5:morning': ['d5-1'], 'd5:afternoon': ['d5-2'], 'd5:night': ['d5-3'],
    'emk:morning': ['emk-1'], 'emk:afternoon': ['emk-2'], 'emk:night': ['emk-3'],
    '24h:duty': ['duty-1'],
  };
  // Φτιάχνουμε αναθέσεις από τον κατάλογο ώστε αλλαγές στη ρύθμιση βαρδιών να ακολουθούνται.
  return departments.flatMap((unit) => unit.shiftTypes.map((shift) => ({
    // Το προβλέψιμο ID επιτρέπει ενημέρωση της ίδιας ανάθεσης σε επόμενη αποθήκευση.
    id: `${date}:${unit.id}:${shift.id}`, date, unitId: unit.id, shiftTypeId: shift.id,
    // Βάρδια χωρίς αρχική επιλογή παραμένει ρητά κενή.
    staffIds: values[`${unit.id}:${shift.id}`] ?? [],
  })));
}

/** Διαβάζει την τοπική demo αποθήκευση· δεν καλείται απευθείας από React component. */
function readStore(): Record<string, ShiftAssignment[]> {
  try {
    // Κάθε ημερομηνία έχει δικές της αναθέσεις ώστε οι ημέρες να μην αλληλοκαλύπτονται.
    const raw = localStorage.getItem(rosterKey);
    // Χωρίς αποθηκευμένα δεδομένα ξεκινά νέο demo store.
    if (!raw) return {};
    // Τα δεδομένα browser δεν είναι έμπιστα· ο χρήστης μπορεί να τα τροποποιήσει.
    const parsed: unknown = JSON.parse(raw);
    // Απορρίπτουμε πίνακες και απλές τιμές πριν θεωρήσουμε το αποτέλεσμα χάρτη ημερομηνιών.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, ShiftAssignment[]>;
  } catch { /* Χαλασμένη demo cache δεν πρέπει να καταρρεύσει το UI. */ }
  // Μη έγκυρα τοπικά δεδομένα επαναφέρουν την αρχική demo προβολή.
  return {};
}

/** Διαβάζει μία ημερομηνία· ήδη αποθηκευμένη κενή ημέρα παραμένει κενή. */
function readDate(date: string): ShiftAssignment[] {
  const store = readStore();
  // Μόνο το πρώτο σημερινό πρόγραμμα αρχικοποιείται· οι ρητά κενές εγγραφές διατηρούνται.
  return Array.isArray(store[date]) ? store[date] : seedFor(date);
}

/** Εφαρμόζει τους βασικούς ελέγχους ακεραιότητας που αναμένονται και από το backend. */
function validateRequest(request: SaveUnitAssignmentsRequest): Department {
  // Απορρίπτουμε κακοσχηματισμένες ή ανύπαρκτες ημερομηνίες Αθήνας.
  if (!isDateKey(request.date)) throw new ServiceError('validation', 'Μη έγκυρη ημερομηνία.');
  // Η αποθήκευση αφορά μόνο τμήμα που υπάρχει στον κατάλογο.
  const unit = departments.find((item) => item.id === request.unitId);
  if (!unit) throw new ServiceError('not-found', 'Το τμήμα δεν βρέθηκε.');
  // Συγκρίνουμε τα ID βαρδιών του αιτήματος με τη ρύθμιση του συγκεκριμένου τμήματος.
  const actualIds = request.assignments.map((item) => item.shiftTypeId);
  const configuredIds = unit.shiftTypes.map((shift) => shift.id);
  // Απαιτούμε κάθε ρυθμισμένη βάρδια ακριβώς μία φορά για να μην υπάρξουν ελλείψεις ή διπλές εγγραφές.
  if (actualIds.length !== configuredIds.length || new Set(actualIds).size !== actualIds.length || configuredIds.some((id) => !actualIds.includes(id))) {
    throw new ServiceError('validation', 'Οι βάρδιες δεν συμφωνούν με τη ρύθμιση του τμήματος.');
  }
  // Ελέγχουμε όλες τις αναθέσεις πριν γραφτεί οτιδήποτε.
  for (const item of request.assignments) {
    // Το ίδιο άτομο δεν μπορεί να δηλωθεί δύο φορές στην ίδια βάρδια.
    if (new Set(item.staffIds).size !== item.staffIds.length) throw new ServiceError('validation', 'Το ίδιο πρόσωπο επιλέχθηκε δύο φορές στην ίδια βάρδια.');
    // Το ίδιο άτομο μπορεί να έχει άλλες βάρδιες, εκτός αν το backend ορίσει νέο κανόνα.
    for (const id of item.staffIds) {
      // Το ID πρέπει να υπάρχει στον κατάλογο προσωπικού μόνο για ανάγνωση.
      const member = staff.find((person) => person.id === id);
      // Τα τμήματα απαιτούν οργανική ένταξη· η 24ωρη υπηρεσία χρησιμοποιεί τη λίστα διαθεσιμότητας.
      if (!member || !member.availableForUnitIds.includes(unit.id) || (unit.kind === 'department' && member.departmentId !== unit.id)) {
        throw new ServiceError('validation', 'Επιλέχθηκε προσωπικό που δεν ανήκει στη διαθέσιμη λίστα.');
      }
    }
  }
  // Επιστρέφουμε το ελεγμένο τμήμα για τυχόν μελλοντικούς mock κανόνες.
  return unit;
}

/** Δημιουργεί την πλήρη mock υλοποίηση των κοινών συμβολαίων υπηρεσιών. */
export function createMockServices(): Services {
  // Η πιστοποίηση εδώ είναι προσομοίωση ανάπτυξης, όχι μηχανισμός ασφάλειας.
  const auth: AuthService = {
    async login(username, password) {
      await pause();
      // Αναζητούμε demo λογαριασμό με κανονικοποιημένο όνομα χρήστη.
      const user = users.find((item) => item.username === username.trim().toLowerCase());
      // Λάθος στοιχεία δίνουν ίδια κατηγορία σφάλματος με τον HTTP adapter.
      if (!user || password !== demoPassword) throw new ServiceError('unauthorized', 'Μη έγκυρο όνομα χρήστη ή κωδικός.');
      // Στο sessionStorage μένει μόνο το ID demo χρήστη, ποτέ ο κωδικός.
      sessionStorage.setItem(sessionKey, user.id);
      // Επιστρέφουμε αντίγραφο ώστε το React state να μην αλλάξει τη demo εγγραφή.
      return clone(user);
    },
    async currentUser() {
      await pause();
      const user = getUser();
      // Το React το καλεί σε ανανέωση για επαναφορά της demo συνεδρίας.
      return user ? clone(user) : null;
    },
    async logout() {
      await pause();
      // Καθαρίζουμε μόνο τη συνεδρία· το πρόγραμμα μένει για τον επόμενο demo χρήστη.
      sessionStorage.removeItem(sessionKey);
    },
    async register(request: RegisterRequest) {
      await pause();
      // Ελέγχουμε μόνο τα απαραίτητα πεδία ενός δοκιμαστικού αιτήματος.
      if (!request.fullName.trim() || !request.username.trim() || !request.password || !departments.some((unit) => unit.id === request.departmentId && unit.kind === 'department')) {
        throw new ServiceError('validation', 'Συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      }
      // Η demo εγγραφή προσομοιώνει αίτημα· δεν δημιουργεί λογαριασμό ή δικαιώματα.
    },
  };
  // Ο κατάλογος είναι μόνο για ανάγνωση· δεν υπάρχουν λειτουργίες αλλαγής προσωπικού.
  const staffService: StaffService = {
    async getDepartments() {
      await pause();
      // Η εγγραφή χρειάζεται ονόματα τμημάτων πριν το login, άρα ο κατάλογος είναι δημόσιος.
      return clone(departments);
    },
    async getStaff(unitId): Promise<StaffMember[]> {
      await pause();
      // Οι λίστες προσωπικού είναι ορατές μόνο μετά το login.
      requireUser();
      // Άγνωστο τμήμα δίνει σφάλμα, όχι σιωπηρά κενή λίστα.
      if (!departments.some((unit) => unit.id === unitId)) throw new ServiceError('not-found', 'Το τμήμα δεν βρέθηκε.');
      // Η 24ωρη υπηρεσία φιλτράρεται βάσει διαθεσιμότητας, όχι οργανικού τμήματος.
      return clone(staff.filter((person) => person.availableForUnitIds.includes(unitId)));
    },
  };
  // Μόνο τα δεδομένα βαρδιών μπορούν να αλλάξουν από αυτή την εφαρμογή.
  const shifts: ShiftService = {
    async getDailyRoster(date): Promise<DailyRoster> {
      await pause();
      requireUser();
      // Κάθε ανάγνωση αφορά μία ελεγμένη ημερολογιακή ημέρα.
      if (!isDateKey(date)) throw new ServiceError('validation', 'Μη έγκυρη ημερομηνία.');
      // Το Dashboard μετατρέπει τα ID σε ονομασίες με τις υπηρεσίες καταλόγου.
      return clone({ date, assignments: readDate(date) });
    },
    async saveUnitAssignments(request): Promise<DailyRoster> {
      await pause();
      // Η ταυτότητα και τα δικαιώματα ελέγχονται και στην υπηρεσία, όχι μόνο στα κουμπιά.
      const user = requireUser();
      if (!canEditUnit(user, request.unitId)) throw new ServiceError('forbidden', 'Δεν έχετε δικαίωμα αλλαγής σε αυτό το τμήμα.');
      // Απορρίπτουμε μη έγκυρο προσωπικό ή βάρδιες πριν γραφτούν δεδομένα.
      validateRequest(request);
      // Διαβάζουμε την πιο πρόσφατη τοπική κατάσταση ώστε να μη χαθεί άλλη mock αλλαγή.
      const store = readStore();
      // Διατηρούμε όλα τα άλλα τμήματα της ημέρας, μαζί με αρχικές δοκιμαστικές τιμές.
      const otherUnits = readDate(request.date).filter((item) => item.unitId !== request.unitId);
      // Καταγράφουμε τον χρόνο αποθήκευσης κάθε αλλαγμένης βάρδιας.
      const updatedAt = new Date().toISOString();
      // Ξαναχρησιμοποιούμε προβλέψιμα ID ώστε νέες αποθηκεύσεις να ενημερώνουν τις ίδιες εγγραφές.
      const saved = request.assignments.map((item) => ({
        id: `${request.date}:${request.unitId}:${item.shiftTypeId}`,
        date: request.date, unitId: request.unitId, shiftTypeId: item.shiftTypeId,
        staffIds: [...item.staffIds], updatedAt,
      }));
      // Αντικαθιστούμε μόνο τις αναθέσεις αυτού του τμήματος για την ημέρα.
      store[request.date] = [...otherUnits, ...saved];
      // Αυτή είναι αποθήκευση μόνο του mock· ο πραγματικός adapter γράφει στο backend.
      localStorage.setItem(rosterKey, JSON.stringify(store));
      // Μετά την επιτυχία η φόρμα ξαναχτίζεται από την αποθηκευμένη απάντηση.
      return clone({ date: request.date, assignments: store[request.date] });
    },
  };
  // Και οι δύο adapters παρέχουν το ίδιο ακριβώς interface στην εφαρμογή.
  return { auth, staff: staffService, shifts };
}
