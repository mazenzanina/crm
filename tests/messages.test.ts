import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSky } from '../src/lib/sky';
import { joinMessage, makeDailyMessage, whatsappLink } from '../src/lib/messages';

const person = { id: 'test-user', name: 'Amel B.', sun_sign: 'Scorpio' as const, preferred_language: 'en' as const };
const url = 'https://wa.me/21622481622?text=Book%20a%20reading';

test('daily messages vary with the true daily snapshot and carry a booking invitation', () => {
  const today = makeDailyMessage(person, computeSky(new Date('2026-09-26T12:00:00Z')), url);
  const tomorrow = makeDailyMessage(person, computeSky(new Date('2026-09-27T12:00:00Z')), url);
  assert.notEqual(today.body, tomorrow.body);
  assert.match(today.body, /Moon is in/);
  assert.match(today.body, /Scorpio Sun/);
  assert.match(today.body, /Mercury is in/);
  assert.ok(joinMessage(today).trim().endsWith(url));
  assert.ok(joinMessage(today).includes('STOP'));
});

test('language preferences change the client-facing text', () => {
  const sky = computeSky(new Date('2026-09-26T12:00:00Z'));
  assert.match(makeDailyMessage({ ...person, preferred_language: 'fr' }, sky, url).body, /Lune/);
  assert.match(makeDailyMessage({ ...person, preferred_language: 'tn' }, sky, url).body, /القمر/);
});

test('WhatsApp link URL-encodes the draft and normalizes international phone digits', () => {
  const link = whatsappLink('+216 22 481 622', 'مرحبا 👋\nBook here: https://example.com/?x=1&y=2');
  assert.ok(link.startsWith('https://wa.me/21622481622?text='));
  assert.equal(new URL(link).searchParams.get('text'), 'مرحبا 👋\nBook here: https://example.com/?x=1&y=2');
});
