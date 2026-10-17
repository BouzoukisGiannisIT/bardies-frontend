/** Επιστρέφει την ημερομηνία Ελλάδας, ακόμη κι αν ο browser έχει άλλη ζώνη ώρας. */
export function todayInAthens(now = new Date()): string {
  // Το Intl χειρίζεται τη θερινή ώρα Ελλάδας· η αποκοπή UTC ημερομηνίας όχι.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  // Μετατρέπουμε τα μέρη ημερομηνίας σε αντικείμενο με κλειδιά όπως year/month/day.
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  // Τα API routes και τα πεδία ημερομηνίας χρησιμοποιούν αυτή την τιμή YYYY-MM-DD.
  return `${value.year}-${value.month}-${value.day}`;
}

/** Μετατρέπει ημερομηνία API σε αναγνώσιμη ελληνική μορφή για UI και Excel. */
export function formatGreekDate(date: string): string {
  // Το μεσημέρι UTC μένει στην ίδια ημερολογιακή ημέρα Αθήνας και σε αλλαγές θερινής ώρας.
  const value = new Date(`${date}T12:00:00Z`);
  // Χρησιμοποιούμε ζώνη Αθήνας και για την ημέρα εβδομάδας και για την πλήρη ημερομηνία.
  const weekday = new Intl.DateTimeFormat('el-GR', { timeZone: 'Europe/Athens', weekday: 'long' }).format(value);
  const calendarDate = new Intl.DateTimeFormat('el-GR', { timeZone: 'Europe/Athens', day: 'numeric', month: 'long', year: 'numeric' }).format(value);
  return `${weekday}, ${calendarDate}`;
}

/** Απορρίπτει λανθασμένες ή ανύπαρκτες ημερομηνίες πριν από αίτημα API. */
export function isDateKey(value: string): boolean {
  // Το API contract δέχεται μόνο ημερομηνίες, όχι timestamps.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  // Το Date.UTC διορθώνει αυτόματα ανύπαρκτες ημέρες· η σύγκριση εντοπίζει αυτή τη διόρθωση.
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
