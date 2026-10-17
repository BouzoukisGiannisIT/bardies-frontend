import type { Workbook } from 'exceljs';
import type { DailyRoster, Department, StaffMember } from '../types/models';
import { formatGreekDate } from './date';

/** Φτιάχνει εκτυπώσιμο φύλλο από δεδομένα που έχουν ήδη φορτωθεί μέσω υπηρεσιών. */
export async function buildRosterWorkbook(roster: DailyRoster, units: Department[], staff: StaffMember[]): Promise<Workbook> {
  // Το ExcelJS φορτώνεται μόνο στην εξαγωγή, ώστε το συνηθισμένο Dashboard να μένει ελαφρύ.
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  // Στο Excel το paperSize 9 είναι Α4· οι τρεις στήλες χωρούν στο πλάτος μίας σελίδας.
  const sheet = workbook.addWorksheet('Ημερήσιο πρόγραμμα', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });
  // Οι τρεις στήλες περιέχουν τμήμα, βάρδια και ονόματα επιλεγμένου προσωπικού.
  sheet.columns = [{ width: 29 }, { width: 25 }, { width: 56 }];
  // Ενώνουμε την πρώτη γραμμή ώστε ο τίτλος να καλύπτει όλο το πλάτος πίνακα.
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'ΗΜΕΡΗΣΙΟ ΠΡΟΓΡΑΜΜΑ ΥΠΗΡΕΣΙΑΣ';
  sheet.getCell('A1').font = { name: 'Arial', size: 15, bold: true, color: { argb: '18345B' } };
  sheet.getRow(1).height = 30;
  // Η ημερομηνία ακολουθεί στο ίδιο πλάτος κάτω από τον τίτλο.
  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `Ημερομηνία: ${formatGreekDate(roster.date)}`;
  sheet.getCell('A2').font = { name: 'Arial', size: 11, color: { argb: '475569' } };
  sheet.getRow(2).height = 25;
  // Αφήνουμε μία κενή γραμμή και φτιάχνουμε μορφοποιημένη κεφαλίδα πίνακα.
  sheet.addRow([]);
  const header = sheet.addRow(['Τμήμα', 'Βάρδια', 'Ονοματεπώνυμο προσωπικού']);
  header.height = 26;
  header.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF0F7' } }; cell.font = { name: 'Arial', bold: true, color: { argb: '18345B' } }; cell.alignment = { vertical: 'middle' }; });
  // Αντιστοιχίζουμε τα σταθερά ID προσωπικού του API στα ονόματα του αρχείου.
  const names = new Map(staff.map((member) => [member.id, member.fullName]));
  // Διατρέχουμε τις ρυθμισμένες βάρδιες, χωρίς υπόθεση ότι κάθε τμήμα έχει τρεις.
  for (const unit of units) {
    for (const shift of unit.shiftTypes) {
      // Αν λείπει ανάθεση, δεν έχει δηλωθεί άτομο σε αυτό το τμήμα και τη βάρδια.
      const assignment = roster.assignments.find((item) => item.unitId === unit.id && item.shiftTypeId === shift.id);
      const selectedNames = assignment?.staffIds.map((id) => names.get(id) ?? 'Άγνωστο προσωπικό') ?? [];
      const row = sheet.addRow([unit.name, shift.label, selectedNames.length ? selectedNames.join(', ') : 'Δεν έχει δηλωθεί προσωπικό']);
      // Αυξάνουμε το ύψος γραμμών με πολλά ονόματα ώστε να φαίνεται όλο το κείμενο.
      row.height = Math.max(27, 17 * Math.ceil((selectedNames.join(', ').length || 24) / 47));
      row.eachCell((cell) => { cell.font = { name: 'Arial', size: 10, color: { argb: '26354A' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    }
  }
  // Προσθέτουμε διακριτικά διαχωριστικά στις γραμμές κεφαλίδας και δεδομένων.
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= 3; column++) {
      row.getCell(column).border = { bottom: { style: 'hair', color: { argb: 'D8E0EA' } } };
    }
  }
  // Επαναλαμβάνουμε τίτλο και κεφαλίδα στις επόμενες εκτυπωμένες σελίδες.
  sheet.pageSetup.printTitlesRow = '1:4';
  sheet.headerFooter.oddFooter = 'Σελίδα &P από &N';
  return workbook;
}

/** Μετατρέπει το βιβλίο σε αρχείο XLSX και ξεκινά τη λήψη στον browser. */
export async function downloadRosterExcel(roster: DailyRoster, units: Department[], staff: StaffMember[]): Promise<void> {
  const workbook = await buildRosterWorkbook(roster, units, staff);
  // Το ExcelJS γράφει bytes στη μνήμη· το Blob τα κάνει διαθέσιμα για λήψη.
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  // Ένας προσωρινός σύνδεσμος ξεκινά τη λήψη χωρίς endpoint στο backend.
  const link = document.createElement('a');
  link.href = url;
  link.download = `Vardies_${roster.date}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  // Αφήνουμε χρόνο στον browser να ξεκινήσει τη λήψη πριν ελευθερωθεί το object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
