import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isoToDMY, normalizeBirthDate } from '../src/lib/dates';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('public signup offers a native calendar and preserves DD/MM/YYYY entry', () => {
  const form = source('src/components/Signup.tsx');
  assert.match(form, /id="offer-birth" type="text"[^>]*placeholder="25\/09\/1995"/);
  assert.match(form, /id="offer-birth-picker" type="date"[^>]*min="1900-01-01" max=\{tunisTodayISO\(\)\}/);
  assert.match(form, /birthDate: event\.target\.value \? isoToDMY\(event\.target\.value\) : ''/);
});

test('CRM client editor offers the same calendar without changing stored ISO dates', () => {
  const editor = source('src/components/ClientEditor.tsx');
  assert.match(editor, /id="edit-date" type="text"[^>]*placeholder="25\/09\/1995"/);
  assert.match(editor, /id="edit-date-picker" type="date"[^>]*min="1900-01-01" max=\{tunisTodayISO\(\)\}/);
  assert.match(editor, /setField\('birth_date', event\.target\.value \? isoToDMY\(event\.target\.value\) : ''\)/);
  const picked = isoToDMY('2000-02-29');
  assert.equal(picked, '29/02/2000');
  assert.equal(normalizeBirthDate(picked), '2000-02-29');
  assert.equal(normalizeBirthDate(''), null); // DOB remains optional.
});
