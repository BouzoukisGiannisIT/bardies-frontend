import type { DailyRoster, Department, RegisterRequest, SaveUnitAssignmentsRequest, StaffMember, User } from '../types/models';

/** Λειτουργίες πιστοποίησης που χρησιμοποιεί το UI σε κάθε API mode. */
export interface AuthService {
  /** Ελέγχει τα στοιχεία σύνδεσης και επιστρέφει τον χρήστη με τα δικαιώματά του. */
  login(username: string, password: string): Promise<User>;
  /** Επαναφέρει την τρέχουσα συνεδρία· null σημαίνει αποσυνδεδεμένο χρήστη. */
  currentUser(): Promise<User | null>;
  /** Τερματίζει τη συνεδρία πριν καθαριστεί ο χρήστης από το React state. */
  logout(): Promise<void>;
  /** Υποβάλλει αίτημα πρόσβασης χωρίς αυτόματη χορήγηση δικαιωμάτων. */
  register(request: RegisterRequest): Promise<void>;
}

/** Αναγνώσεις καταλόγου για την εγγραφή, τις λίστες επιλογής και την εξαγωγή. */
export interface StaffService {
  /** Τμήματα και βάρδιές τους· δημόσια διαθέσιμα για τη φόρμα εγγραφής. */
  getDepartments(): Promise<Department[]>;
  /** Διαθέσιμο προσωπικό ενός τμήματος, μαζί με την 24ωρη υπηρεσία. */
  getStaff(unitId: string): Promise<StaffMember[]>;
}

/** Ανάγνωση και αποθήκευση ημερήσιου προγράμματος· χωρίς αλλαγές σε προσωπικό ή τμήματα. */
export interface ShiftService {
  /** Ανακτά τις αναθέσεις όλων των τμημάτων για την ημέρα. */
  getDailyRoster(date: string): Promise<DailyRoster>;
  /** Αντικαθιστά τις αναθέσεις ενός τμήματος και επιστρέφει το αποθηκευμένο πρόγραμμα. */
  saveUnitAssignments(request: SaveUnitAssignmentsRequest): Promise<DailyRoster>;
}

/** Το ίδιο συμβόλαιο υλοποιούν τόσο το mock όσο και ο HTTP adapter. */
export interface Services {
  /** Υπηρεσία συνεδρίας και εγγραφής. */
  auth: AuthService;
  /** Υπηρεσία καταλόγου τμημάτων και προσωπικού. */
  staff: StaffService;
  /** Υπηρεσία ημερήσιου προγράμματος. */
  shifts: ShiftService;
}
