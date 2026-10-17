import type { Department, StaffMember, User } from '../../types/models';

// Δοκιμαστικός κατάλογος· στο real mode τον αντικαθιστά το endpoint `/units`.
// Κάθε `shiftTypes` ανήκει στο δικό του τμήμα· το UI δεν υποθέτει κοινά ωράρια ή πλήθος βαρδιών.
export const departments: Department[] = [
  { id: 'd4', name: 'Δ4', kind: 'department', shiftTypes: [{ id: 'morning', label: 'Πρωινή' }, { id: 'afternoon', label: 'Απογευματινή' }, { id: 'night', label: 'Βραδινή' }] },
  { id: 'd5', name: 'Δ5', kind: 'department', shiftTypes: [{ id: 'morning', label: 'Πρωινή' }, { id: 'afternoon', label: 'Απογευματινή' }, { id: 'night', label: 'Βραδινή' }] },
  { id: 'emk', name: 'ΕΜΚ', kind: 'department', shiftTypes: [{ id: 'morning', label: 'Πρωινή' }, { id: 'afternoon', label: 'Απογευματινή' }, { id: 'night', label: 'Βραδινή' }] },
  { id: '24h', name: '24ωρη Υπηρεσία — ΑΚΠ / ΑΥΜ', kind: 'service', shiftTypes: [{ id: 'duty', label: '24ωρη υπηρεσία' }] },
];

// Δοκιμαστικές λίστες προσωπικού μόνο για ανάγνωση· αντικαθίστανται από το `/units/{id}/staff`.
// Το `departmentId` είναι σταθερή ένταξη· το `availableForUnitIds` ορίζει διαθέσιμες αναθέσεις.
export const staff: StaffMember[] = [
  { id: 'd4-1', fullName: 'Νίκος Παπαδόπουλος', departmentId: 'd4', availableForUnitIds: ['d4'] },
  { id: 'd4-2', fullName: 'Μαρία Γεωργίου', departmentId: 'd4', availableForUnitIds: ['d4'] },
  { id: 'd4-3', fullName: 'Αλέξης Κωνσταντίνου', departmentId: 'd4', availableForUnitIds: ['d4'] },
  { id: 'd4-4', fullName: 'Ελένη Λαμπροπούλου', departmentId: 'd4', availableForUnitIds: ['d4'] },
  { id: 'd5-1', fullName: 'Γιώργος Δημητρίου', departmentId: 'd5', availableForUnitIds: ['d5'] },
  { id: 'd5-2', fullName: 'Σοφία Αντωνίου', departmentId: 'd5', availableForUnitIds: ['d5'] },
  { id: 'd5-3', fullName: 'Κώστας Νικολάου', departmentId: 'd5', availableForUnitIds: ['d5'] },
  { id: 'd5-4', fullName: 'Άννα Μιχαηλίδου', departmentId: 'd5', availableForUnitIds: ['d5'] },
  { id: 'emk-1', fullName: 'Πέτρος Ιωάννου', departmentId: 'emk', availableForUnitIds: ['emk'] },
  { id: 'emk-2', fullName: 'Δήμητρα Σταυροπούλου', departmentId: 'emk', availableForUnitIds: ['emk'] },
  { id: 'emk-3', fullName: 'Χρήστος Χριστοδούλου', departmentId: 'emk', availableForUnitIds: ['emk'] },
  { id: 'emk-4', fullName: 'Ειρήνη Θεοδώρου', departmentId: 'emk', availableForUnitIds: ['emk'] },
  { id: 'duty-1', fullName: 'Ανδρέας Καρράς', departmentId: '24h', availableForUnitIds: ['24h'] },
  { id: 'duty-2', fullName: 'Αριάδνη Υφαντή', departmentId: '24h', availableForUnitIds: ['24h'] },
  { id: 'duty-3', fullName: 'Μιχάλης Ράπτης', departmentId: '24h', availableForUnitIds: ['24h'] },
];

// Δοκιμαστικοί χρήστες και δικαιώματα· το backend τα παράγει από έμπιστα στοιχεία λογαριασμού.
// Οι διαχειριστές αλλάζουν όλα τα τμήματα, αλλά κανένας ρόλος δεν διαχειρίζεται προσωπικό εδώ.
export const users: User[] = [
  { id: 'u-d4', username: 'd4', displayName: 'Δ4', role: 'user', departmentId: 'd4', editableUnitIds: ['d4'] },
  { id: 'u-d5', username: 'd5', displayName: 'Δ5', role: 'user', departmentId: 'd5', editableUnitIds: ['d5'] },
  { id: 'u-emk', username: 'emk', displayName: 'ΕΜΚ', role: 'user', departmentId: 'emk', editableUnitIds: ['emk'] },
  { id: 'u-akp', username: 'akp', displayName: 'ΑΚΠ', role: 'admin', departmentId: null, editableUnitIds: ['d4', 'd5', 'emk', '24h'] },
  { id: 'u-aym', username: 'aym', displayName: 'ΑΥΜ', role: 'admin', departmentId: null, editableUnitIds: ['d4', 'd5', 'emk', '24h'] },
];

// Κωδικός μόνο για ανάπτυξη· δεν πρέπει να υπάρχει στον πραγματικό adapter πιστοποίησης.
export const demoPassword = 'demo123';
