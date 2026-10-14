import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistance, calculateBearing, isAhead } from '../src/utils/geoUtils.js';

test('calculateDistance - valid coordinates', () => {
  // Identical coordinates
  assert.equal(calculateDistance([28.6139, 77.2090], [28.6139, 77.2090]), 0);

  // Connaught Place to India Gate (~2.3 km)
  const dist = calculateDistance([28.6315, 77.2167], [28.6129, 77.2295]);
  assert.ok(dist !== null);
  assert.ok(dist > 2200 && dist < 2500, `Expected ~2.3km, got ${dist}`);
});

test('calculateDistance - rejects invalid coordinates', () => {
  assert.equal(calculateDistance(null, [0, 0]), null);
  assert.equal(calculateDistance([0, 0], undefined), null);
  assert.equal(calculateDistance([0, 0], [95, 0]), null); // lat > 90
  assert.equal(calculateDistance([-95, 0], [0, 0]), null); // lat < -90
  assert.equal(calculateDistance([0, 185], [0, 0]), null); // lon > 180
  assert.equal(calculateDistance([0, 0], [0, -185]), null); // lon < -180
  assert.equal(calculateDistance([0, 0], [NaN, 0]), null);
  assert.equal(calculateDistance([Infinity, 0], [0, 0]), null);
  assert.equal(calculateDistance([0], [0, 0]), null); // length < 2
  assert.equal(calculateDistance('invalid', [0, 0]), null);
});

test('calculateBearing - cardinal bearings', () => {
  // Due North
  const north = calculateBearing([0, 0], [1, 0]);
  assert.ok(north !== null);
  assert.ok(Math.abs(north - 0) < 0.01 || Math.abs(north - 360) < 0.01);

  // Due East
  const east = calculateBearing([0, 0], [0, 1]);
  assert.ok(east !== null);
  assert.ok(Math.abs(east - 90) < 0.01);

  // Due South
  const south = calculateBearing([1, 0], [0, 0]);
  assert.ok(south !== null);
  assert.ok(Math.abs(south - 180) < 0.01);

  // Due West
  const west = calculateBearing([0, 1], [0, 0]);
  assert.ok(west !== null);
  assert.ok(Math.abs(west - 270) < 0.01);
});

test('calculateBearing - rejects identical or invalid coordinates', () => {
  // Identical points return null
  assert.equal(calculateBearing([23.25, 77.41], [23.25, 77.41]), null);
  assert.equal(calculateBearing(null, [23.25, 77.41]), null);
  assert.equal(calculateBearing([23.25, 77.41], null), null);
  assert.equal(calculateBearing([100, 0], [0, 0]), null);
});

test('isAhead - angular forward cone filtering', () => {
  // Direct match
  assert.equal(isAhead(0, 0, 45), true);
  assert.equal(isAhead(90, 90, 45), true);

  // Within cone
  assert.equal(isAhead(0, 30, 45), true);
  assert.equal(isAhead(0, 330, 45), true);

  // Outside cone
  assert.equal(isAhead(0, 50, 45), false);
  assert.equal(isAhead(0, 180, 45), false); // Opposite direction
  assert.equal(isAhead(90, 0, 45), false); // 90 vs 0 (diff 90 > 45)
});

test('isAhead - 0/360 degree wrap-around boundary', () => {
  // 5 deg heading vs 355 deg target (diff = 10 deg)
  assert.equal(isAhead(5, 355, 45), true);

  // 355 deg heading vs 5 deg target (diff = 10 deg)
  assert.equal(isAhead(355, 5, 45), true);

  // 350 deg heading vs 40 deg target (diff = 50 deg > 45 deg)
  assert.equal(isAhead(350, 40, 45), false);
});

test('isAhead - rejects invalid inputs', () => {
  assert.equal(isAhead(null, 10), false);
  assert.equal(isAhead(0, undefined), false);
  assert.equal(isAhead(NaN, 10), false);
  assert.equal(isAhead(0, Infinity), false);
  assert.equal(isAhead(0, 10, -5), false); // Negative cone angle
  assert.equal(isAhead(0, 10, NaN), false);
});
