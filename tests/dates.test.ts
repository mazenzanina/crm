import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdultBirthDate, isoToDMY, normalizeBirthDate, tunisTodayISO } from '../src/lib/dates';

const now = new Date('2026-09-28T12:00:00Z');

test('Tunisia-local today changes at midnight in Tunis, not midnight UTC', () => {
  assert.equal(tunisTodayISO(new Date('2026-09-27T22:59:59Z')), '2026-09-27');
  assert.equal(tunisTodayISO(new Date('2026-09-27T23:00:00Z')), '2026-09-28');
});

test('DD/MM/YYYY entry and display round-trip through ISO database format', () => {
  assert.equal(normalizeBirthDate('29/02/2000', now), '2000-02-29');
  assert.equal(normalizeBirthDate('2000-02-29', now), '2000-02-29');
  assert.equal(isoToDMY('2000-02-29'), '29/02/2000');
  assert.equal(isoToDMY(null), '');
});

test('invalid calendar dates, ambiguous date strings and future dates are rejected', () => {
  for (const input of ['31/02/2000', '29/02/2001', '1/2/2000', '2000/02/01', '01-02-2000', '01/01/1899', '29/09/2026', '']) {
    assert.equal(normalizeBirthDate(input, now), null, input);
  }
  assert.equal(normalizeBirthDate('28/09/2026', now), '2026-09-28');
});

test('age gate uses the Tunis calendar date', () => {
  assert.equal(isAdultBirthDate('2008-09-28', now), true);
  assert.equal(isAdultBirthDate('2008-09-29', now), false);
});
