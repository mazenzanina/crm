import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSky, phaseForAngle, signForLongitude, tunisDateKey } from '../src/lib/sky';

const first = new Date('2026-09-26T23:00:00.000Z');

test('a new Tunis date starts at local midnight, not UTC midnight', () => {
  assert.equal(tunisDateKey(new Date('2026-09-26T22:59:59Z')), '2026-09-26');
  assert.equal(tunisDateKey(first), '2026-09-27');
});

test('computes the positions of ten geocentric tropical bodies for Tunis noon', () => {
  const sky = computeSky(new Date('2026-09-26T09:00:00Z'));
  assert.equal(sky.dateKey, '2026-09-26');
  assert.equal(sky.calculatedAt, '2026-09-26T11:00:00.000Z');
  assert.equal(sky.planets.length, 10);
  assert.equal(new Set(sky.planets.map((p) => p.name)).size, 10);
  assert.equal(sky.planets.find((p) => p.name === 'Sun')?.sign, 'Libra');
  for (const planet of sky.planets) {
    assert.ok(planet.longitude >= 0 && planet.longitude < 360, planet.name);
    assert.equal(signForLongitude(planet.longitude), planet.sign);
    assert.ok(planet.degree >= 0 && planet.degree < 30);
  }
  assert.ok(sky.moon.illumination >= 0 && sky.moon.illumination <= 100);
  assert.ok((sky.planets.find((p) => p.name === 'Venus')?.illuminatedPercent || 0) > 0);
  assert.ok((sky.planets.find((p) => p.name === 'Mercury')?.illuminatedPercent || 0) <= 100);
});

test('the snapshot and Moon placement move when the Tunis date changes', () => {
  const today = computeSky(new Date('2026-09-26T20:00:00Z'));
  const tomorrow = computeSky(new Date('2026-09-26T23:01:00Z'));
  assert.notEqual(today.dateKey, tomorrow.dateKey);
  const moonToday = today.planets.find((p) => p.name === 'Moon')!;
  const moonTomorrow = tomorrow.planets.find((p) => p.name === 'Moon')!;
  assert.ok(Math.abs(moonToday.longitude - moonTomorrow.longitude) > 5);
});

test('handles phase thresholds and the Aries/Pisces longitude boundary', () => {
  assert.equal(phaseForAngle(0).phase, 'New Moon');
  assert.equal(phaseForAngle(180).phase, 'Full Moon');
  assert.equal(phaseForAngle(275).phase, 'Last Quarter');
  assert.equal(signForLongitude(0), 'Aries');
  assert.equal(signForLongitude(-1), 'Pisces');
  assert.equal(signForLongitude(359.9), 'Pisces');
});
