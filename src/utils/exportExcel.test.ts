import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildRosterWorkbook } from './exportExcel';
import { departments, staff } from '../services/mock/data';

describe('Excel export', () => {
  it('creates a readable xlsx with the selected date, all units and live assignments', async () => {
    const roster = { date: '2026-10-17', assignments: [{ id: 'x', date: '2026-10-17', unitId: 'd4', shiftTypeId: 'morning', staffIds: ['d4-4'] }] };
    const buffer = await (await buildRosterWorkbook(roster, departments, staff)).xlsx.writeBuffer();
    expect(new Uint8Array(buffer).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    const loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(buffer);
    const values = loaded.worksheets[0].getRows(1, loaded.worksheets[0].rowCount)!.flatMap((row) => row.values as (string | undefined)[]).filter(Boolean).join(' ');
    expect(values).toContain('17 Οκτωβρίου 2026');
    for (const unit of departments) expect(values).toContain(unit.name);
    expect(values).toContain('Ελένη Λαμπροπούλου');
    expect(values).not.toContain('Νίκος Παπαδόπουλος');
    expect(loaded.worksheets[0].pageSetup.paperSize).toBe(9);
  }, 20000);
});
