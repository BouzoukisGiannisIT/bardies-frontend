import { expect, it } from 'vitest';
import { formatGreekDate, isDateKey, todayInAthens } from './date';

it('uses Athens calendar dates without UTC day shifts', () => {
  expect(todayInAthens(new Date('2026-10-16T22:30:00Z'))).toBe('2026-10-17');
  expect(formatGreekDate('2026-10-17')).toContain('17 Οκτωβρίου 2026');
  expect(isDateKey('2026-02-30')).toBe(false);
  expect(isDateKey('2026-10-17')).toBe(true);
});
