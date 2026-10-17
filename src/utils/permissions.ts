import type { User } from '../types/models';

/** Ορίζει ποια χειριστήρια επεξεργασίας φαίνονται· το backend επιβάλλει ξανά τον κανόνα. */
export function canEditUnit(user: User | null, unitId: string): boolean {
  // Τα editableUnitIds από τον server είναι ο πρώτος έλεγχος για κάθε ρόλο.
  if (!user || !user.editableUnitIds.includes(unitId)) return false;
  // Οι διαχειριστές αλλάζουν επιτρεπόμενα τμήματα· οι απλοί χρήστες μόνο το δικό τους.
  return user.role === 'admin' || (user.role === 'user' && user.departmentId === unitId);
}
