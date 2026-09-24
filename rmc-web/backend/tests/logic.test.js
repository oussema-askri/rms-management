// Unit tests for the pure logic the routes depend on. Run with `npm test`
// (node --test), no database or network required.

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);

const {
  monthStartUTC, monthEndUTC, monthLastDayISO, parseMonthParam,
  yearStartUTC, yearEndUTC, inclusiveDayCount,
} = require('../utils/dateRange');

const {
  canAssignRole, canModifyUser, validatePassword, generateTemporaryPassword,
} = require('../utils/roles');

const { withDuplicateRetry, withConflictRetry, isDuplicateKeyError } = require('../utils/retry');

test('month bounds are built in UTC, not server local time', () => {
  assert.equal(monthStartUTC(2026, 1).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(monthEndUTC(2026, 1).toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(monthEndUTC(2026, 12).toISOString(), '2027-01-01T00:00:00.000Z');

  // The first of the month must fall inside its own range. Local-time bounds
  // dropped it on any host west of UTC.
  const firstOfMonth = new Date('2026-01-01T00:00:00.000Z');
  assert.ok(firstOfMonth >= monthStartUTC(2026, 1));
  assert.ok(firstOfMonth < monthEndUTC(2026, 1));

  const lastOfPrevious = new Date('2025-12-31T00:00:00.000Z');
  assert.ok(lastOfPrevious < monthStartUTC(2026, 1));
});

test('month length handles leap years', () => {
  assert.equal(monthLastDayISO(2026, 2), '2026-02-28');
  assert.equal(monthLastDayISO(2028, 2), '2028-02-29');
  assert.equal(monthLastDayISO(2026, 12), '2026-12-31');
});

test('month parameter rejects nonsense and falls back to the current month', () => {
  assert.deepEqual(parseMonthParam('2026-03'), { year: 2026, month: 3 });
  assert.ok(parseMonthParam('2026-13').month <= 12);
  assert.equal(typeof parseMonthParam('rubbish').year, 'number');
  assert.equal(typeof parseMonthParam(undefined).month, 'number');
});

test('year bounds cover exactly one year', () => {
  assert.equal(yearStartUTC(2026).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(yearEndUTC(2026).toISOString(), '2027-01-01T00:00:00.000Z');
});

test('leave day count is inclusive and never negative', () => {
  assert.equal(inclusiveDayCount('2026-05-04', '2026-05-04'), 1);
  assert.equal(inclusiveDayCount('2026-05-05', '2026-05-09'), 5);
  // An end before the start used to produce a negative count that slipped past
  // the balance check.
  assert.equal(inclusiveDayCount('2026-05-09', '2026-05-05'), 0);
  assert.equal(inclusiveDayCount('nonsense', '2026-05-05'), 0);
  assert.equal(inclusiveDayCount('2026-05-05T08:30:00Z', '2026-05-06T17:00:00Z'), 2);
});

test('no role can hand out more than it holds', () => {
  assert.equal(canAssignRole('responsable', 'admin'), false);
  assert.equal(canAssignRole('responsable', 'rh'), false);
  assert.equal(canAssignRole('responsable', 'employer'), true);
  assert.equal(canAssignRole('rh', 'admin'), false);
  assert.equal(canAssignRole('rh', 'responsable'), true);
  assert.equal(canAssignRole('admin', 'admin'), true);
  assert.equal(canAssignRole('comptable', 'employer'), false);
  assert.equal(canAssignRole('employer', 'employer'), false);
});

test('only an administrator may modify an administrator', () => {
  assert.equal(canModifyUser('rh', 'admin'), false);
  assert.equal(canModifyUser('responsable', 'admin'), false);
  assert.equal(canModifyUser('admin', 'admin'), true);
  assert.equal(canModifyUser('rh', 'employer'), true);
});

test('password policy rejects the values that were previously in use', () => {
  assert.notEqual(validatePassword('123456'), null);
  assert.notEqual(validatePassword('Ab1'), null);
  assert.notEqual(validatePassword('abcdefghij'), null);
  assert.notEqual(validatePassword('1234567890'), null);
  assert.notEqual(validatePassword(''), null);
  assert.equal(validatePassword('Chantier2026'), null);
});

test('generated temporary passwords are unique and satisfy the policy', () => {
  const generated = Array.from({ length: 500 }, generateTemporaryPassword);
  assert.equal(new Set(generated).size, 500);
  for (const password of generated) {
    assert.equal(validatePassword(password), null);
    assert.equal(password.length, 12);
  }
});

test('duplicate-key retries recompute instead of repeating the same value', async () => {
  let attempts = 0;
  const result = await withDuplicateRetry(async () => {
    attempts += 1;
    if (attempts < 3) {
      const error = new Error('E11000 duplicate key');
      error.code = 11000;
      throw error;
    }
    return `assigned-on-attempt-${attempts}`;
  });
  assert.equal(result, 'assigned-on-attempt-3');
  assert.equal(attempts, 3);
});

test('a non-duplicate error is not retried', async () => {
  let attempts = 0;
  await assert.rejects(
    withDuplicateRetry(async () => {
      attempts += 1;
      throw new Error('connection lost');
    }),
    /connection lost/
  );
  assert.equal(attempts, 1);
});

test('conditional insert retries until the update matches', async () => {
  let attempts = 0;
  const result = await withConflictRetry(async () => {
    attempts += 1;
    return attempts === 2 ? { ok: true } : null;
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2);
});

test('conditional insert gives up rather than looping forever', async () => {
  const result = await withConflictRetry(async () => null, 3);
  assert.equal(result, null);
});

test('duplicate-key detection recognises both driver codes', () => {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ code: 11001 }), true);
  assert.equal(isDuplicateKeyError({ code: 121 }), false);
  assert.equal(isDuplicateKeyError(null), false);
});
