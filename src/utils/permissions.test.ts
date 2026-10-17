import { expect, it } from 'vitest';
import { canEditUnit } from './permissions';
import type { User } from '../types/models';

it('requires the department and editable scope for standard users', () => {
  const user: User = { id: 'x', username: 'x', displayName: 'Δ4', role: 'user', departmentId: 'd4', editableUnitIds: ['d4', 'd5'] };
  expect(canEditUnit(user, 'd4')).toBe(true);
  expect(canEditUnit(user, 'd5')).toBe(false);
  expect(canEditUnit({ ...user, editableUnitIds: [] }, 'd4')).toBe(false);
  expect(canEditUnit(null, 'd4')).toBe(false);
});
