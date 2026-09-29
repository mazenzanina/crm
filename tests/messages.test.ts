import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSky } from '../src/lib/sky';
import { joinMessage, makeDailyMessage, whatsappLink } from '../src/lib/messages';

const person = { id: 'test-user', name: 'Amel B.', sun_sign: 'Scorpio' as const, preferred_language: 'en' as const };
const url = 'https://wa.me/21622481622?text=Book%20a%20reading';

test('daily drafts use the real Tunis sky, include all requested sections and retain booking + STOP', () => {
  const sky = computeSky(new Date('2026-09-26T12:00:00Z'));
  const today = makeDailyMessage(person, sky, url);
  const tomorrow = makeDailyMessage(person, computeSky(new Date('2026-09-27T12:00:00Z')), url);
  assert.notEqual(today.body, tomorrow.body);
  assert.match(today.body, new RegExp(`Moon in ${sky.planets.find((planet) => planet.name === 'Moon')?.sign}`));
  assert.match(today.body, new RegExp(`Sun in ${sky.planets.find((planet) => planet.name === 'Sun')?.sign}`));
  assert.match(today.body, /Scorpio Sun-sign lens/);
  assert.match(today.body, /Mercury in/);
  assert.match(today.body, /DIGITAL CARD.*\nSelected digitally for today, not a physical draw/);
  assert.match(today.body, /COSMIC SUMMARY/);
  assert.match(today.body, /LOVE & CONNECTION/);
  assert.match(today.body, /WORK & DIRECTION/);
  assert.match(today.body, /REFLECTION NUMBER · [1-9]/);
  assert.match(today.body, /SMALL RITUAL/);
  assert.doesNotMatch(today.body, /\b\d+%/);
  assert.ok(joinMessage(today).includes(url));
  assert.match(joinMessage(today), /reply STOP\./);
  assert.ok(joinMessage(today).length < 4000);
});

test('symbolic card and reflective number are repeatable for the same client and Tunis date', () => {
  const sky = computeSky(new Date('2026-09-26T12:00:00Z'));
  const message = makeDailyMessage(person, sky, url);
  assert.deepEqual(message, makeDailyMessage(person, sky, url));
  assert.equal((message.body.match(/SYMBOLIC DIGITAL CARD/g) || []).length, 1);
});

test('French and Tunisian drafts localize each section without a natal-chart claim', () => {
  const sky = computeSky(new Date('2026-09-26T12:00:00Z'));
  const french = makeDailyMessage({ ...person, preferred_language: 'fr' }, sky, url);
  const tunisian = makeDailyMessage({ ...person, preferred_language: 'tn' }, sky, url);
  assert.match(french.body, /Lune/);
  assert.match(french.body, /CARTE SYMBOLIQUE NUMÉRIQUE/);
  assert.match(french.body, /AMOUR & LIENS/);
  assert.match(french.body, /TRAVAIL & DIRECTION/);
  assert.match(french.body, /CHIFFRE DE RÉFLEXION/);
  assert.match(french.body, /PETIT RITUEL/);
  assert.match(tunisian.body, /القمر/);
  assert.match(tunisian.body, /كارت رمزية رقمية/);
  assert.match(tunisian.body, /الحبّ والعلاقات/);
  assert.match(tunisian.body, /الخدمة والطريق/);
  assert.match(tunisian.body, /رقم للتأمّل/);
  assert.match(tunisian.body, /خطوة صغيرة/);
  for (const message of [french, tunisian]) {
    assert.ok(joinMessage(message).includes(url));
    assert.ok(joinMessage(message).includes('STOP'));
    assert.ok(!message.body.includes('95%'));
    assert.ok(joinMessage(message).length < 4000);
  }
});

test('generated drafts for all languages fit the editable composer limits', () => {
  const sky = computeSky(new Date('2026-09-26T12:00:00Z'));
  for (let index = 0; index < 100; index++) {
    for (const language of ['en', 'fr', 'tn'] as const) {
      const parts = makeDailyMessage({ ...person, id: `test-${index}`, preferred_language: language }, sky, url);
      assert.ok(parts.body.length <= 3200, `${language} body ${index}`);
      assert.ok(parts.invitation.length <= 800, `${language} invitation ${index}`);
    }
  }
});

test('WhatsApp link URL-encodes the draft and normalizes international phone digits', () => {
  const link = whatsappLink('+216 22 481 622', 'مرحبا 👋\nBook here: https://example.com/?x=1&y=2');
  assert.ok(link.startsWith('https://wa.me/21622481622?text='));
  assert.equal(new URL(link).searchParams.get('text'), 'مرحبا 👋\nBook here: https://example.com/?x=1&y=2');
});
