import test from 'node:test';
import assert from 'node:assert/strict';
import { approximateSunSign } from '../src/lib/types';
import { signupSchema, clientSchema, settingsSchema } from '../src/lib/validation';

const lead = {
  name: 'Nour', phone: '+216 22 481 622', preferredLanguage: 'tn',
  privacyConsent: true, dailyConsent: true, adultConsent: true,
};

test('lead signup requires explicit, separate storage, daily, and 18+ consent', () => {
  assert.equal(signupSchema.safeParse(lead).success, true);
  assert.equal(signupSchema.safeParse({ ...lead, dailyConsent: false }).success, false);
  assert.equal(signupSchema.safeParse({ ...lead, privacyConsent: false }).success, false);
  assert.equal(signupSchema.safeParse({ ...lead, adultConsent: false }).success, false);
  assert.equal(signupSchema.safeParse({ ...lead, phone: '22114455' }).success, false);
  assert.equal(signupSchema.parse(lead).phone, '+21622481622');
});

test('invalid dates and younger visitors are not admitted', () => {
  assert.equal(signupSchema.safeParse({ ...lead, birthDate: '2020-01-01' }).success, false);
  assert.equal(signupSchema.safeParse({ ...lead, birthDate: '1990-02-30' }).success, false);
  assert.equal(approximateSunSign('1994-10-28'), 'Scorpio');
});

test('admin input defaults to opted-out and rejects unsafe settings URL', () => {
  assert.equal(clientSchema.safeParse({ name: 'Sara', phone: '+216 22 481 622', preferred_language: 'en', status: 'lead', total_spent_tnd: 0, notes: '', daily_opt_in: false }).success, true);
  assert.equal(settingsSchema.safeParse({ booking_url: 'javascript:alert(1)' }).success, false);
  assert.equal(settingsSchema.safeParse({ booking_url: 'https://tarot-tn.vercel.app/booking.html' }).success, true);
});
