import { describe, expect, it } from 'vitest';
import { createMockServices } from './mockServices';
import { departments, staff } from './data';
import { todayInAthens } from '../../utils/date';

const date = '2026-10-17';
const payload = (unitId: string, staffId: string) => ({
  date, unitId,
  assignments: departments.find((unit) => unit.id === unitId)!.shiftTypes.map((shift) => ({ shiftTypeId: shift.id, staffIds: shift.id === departments.find((unit) => unit.id === unitId)!.shiftTypes[0].id ? [staffId] : [] })),
});

describe('mock authentication and permissions', () => {
  it('accepts the five demo accounts and rejects invalid credentials', async () => {
    const api = createMockServices();
    for (const username of ['d4', 'd5', 'emk', 'akp', 'aym']) expect((await api.auth.login(username, 'demo123')).username).toBe(username);
    await expect(api.auth.login('d4', 'wrong')).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('protects data and signs out', async () => {
    const api = createMockServices();
    await expect(api.shifts.getDailyRoster(date)).rejects.toMatchObject({ kind: 'unauthorized' });
    await api.auth.login('d4', 'demo123');
    expect(await api.auth.currentUser()).toMatchObject({ username: 'd4' });
    await api.auth.logout();
    expect(await api.auth.currentUser()).toBeNull();
  });

  it.each([['d4', 'd4', 'd5'], ['d5', 'd5', 'emk'], ['emk', 'emk', '24h']])('%s can save only its own unit', async (username, allowed, denied) => {
    const api = createMockServices(); await api.auth.login(username, 'demo123');
    const allowedStaff = staff.find((person) => person.departmentId === allowed)!;
    await expect(api.shifts.saveUnitAssignments(payload(allowed, allowedStaff.id))).resolves.toMatchObject({ date });
    await expect(api.shifts.saveUnitAssignments(payload(denied, staff.find((person) => person.departmentId === denied)!.id))).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it.each(['akp', 'aym'])('%s can save all departments and 24h duty', async (username) => {
    const api = createMockServices(); await api.auth.login(username, 'demo123');
    for (const unit of departments) {
      const member = staff.find((person) => person.departmentId === unit.id)!;
      await expect(api.shifts.saveUnitAssignments(payload(unit.id, member.id))).resolves.toBeDefined();
    }
  });
});

describe('mock roster integrity', () => {
  it('rejects wrong-unit, unknown and repeated staff IDs', async () => {
    const api = createMockServices(); await api.auth.login('akp', 'demo123');
    await expect(api.shifts.saveUnitAssignments(payload('d5', 'd4-1'))).rejects.toMatchObject({ kind: 'validation' });
    await expect(api.shifts.saveUnitAssignments(payload('d4', 'unknown'))).rejects.toMatchObject({ kind: 'validation' });
    const repeated = payload('d4', 'd4-1'); repeated.assignments[0].staffIds = ['d4-1', 'd4-1'];
    await expect(api.shifts.saveUnitAssignments(repeated)).rejects.toMatchObject({ kind: 'validation' });
  });

  it('upserts one unit, preserves others, dates and immutable staff', async () => {
    const api = createMockServices(); await api.auth.login('aym', 'demo123');
    const originalStaff = await api.staff.getStaff('d4');
    await api.shifts.saveUnitAssignments(payload('d4', 'd4-1'));
    await api.shifts.saveUnitAssignments(payload('d5', 'd5-1'));
    await api.shifts.saveUnitAssignments(payload('d4', 'd4-2'));
    const roster = await api.shifts.getDailyRoster(date);
    expect(roster.assignments.filter((item) => item.unitId === 'd4')).toHaveLength(3);
    expect(roster.assignments.find((item) => item.unitId === 'd4' && item.shiftTypeId === 'morning')?.staffIds).toEqual(['d4-2']);
    expect(roster.assignments.find((item) => item.unitId === 'd5' && item.shiftTypeId === 'morning')?.staffIds).toEqual(['d5-1']);
    expect(await api.staff.getStaff('d4')).toEqual(originalStaff);
    await api.shifts.saveUnitAssignments({ ...payload('d4', 'd4-3'), date: '2026-10-18' });
    expect((await api.shifts.getDailyRoster(date)).assignments.find((item) => item.unitId === 'd4' && item.shiftTypeId === 'morning')?.staffIds).toEqual(['d4-2']);
    expect((await createMockServices().shifts.getDailyRoster(date)).assignments).toEqual(roster.assignments);
  });

  it('shows empty shifts for an unrecorded date and seeds today only', async () => {
    const api = createMockServices(); await api.auth.login('d4', 'demo123');
    expect((await api.shifts.getDailyRoster('2020-01-01')).assignments).toEqual([]);
    expect((await api.shifts.getDailyRoster(todayInAthens())).assignments.length).toBeGreaterThan(0);
  });

  it('has no staff management methods', () => {
    const api = createMockServices();
    expect(Object.keys(api.staff).sort()).toEqual(['getDepartments', 'getStaff']);
  });
});
