import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAP_OPTIONS, DEFAULT_SETTINGS, normalizeSettings, startStopwatch, pauseStopwatch, resumeStopwatch,
  isRunning, elapsedMs, isCapped, formatElapsed, formatTotal,
} from '../stopwatch.js';

test('cap options are 5, 10, 15, 20', () => {
  assert.deepEqual(CAP_OPTIONS, [5, 10, 15, 20]);
});

test('settings default to off with a 20s cap, timer shown, and reject bad values', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, { stopwatch: false, stopwatchCap: 20, showTimer: true });
  assert.deepEqual(
    normalizeSettings({ stopwatch: true, stopwatchCap: 10, showTimer: false }),
    { stopwatch: true, stopwatchCap: 10, showTimer: false },
  );
  assert.deepEqual(normalizeSettings({ stopwatch: true, stopwatchCap: 10 }), { stopwatch: true, stopwatchCap: 10, showTimer: true });
  assert.deepEqual(normalizeSettings({ stopwatch: 'yes', stopwatchCap: 25, showTimer: 0 }), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ stopwatchCap: '5' }), DEFAULT_SETTINGS);
});

test('counts up from zero while running', () => {
  const sw = startStopwatch(1000);
  assert.ok(isRunning(sw));
  assert.equal(elapsedMs(sw, 1000, 20), 0);
  assert.equal(elapsedMs(sw, 4500, 20), 3500);
});

test('pausing freezes the value', () => {
  const sw = pauseStopwatch(startStopwatch(0), 7300);
  assert.ok(!isRunning(sw));
  assert.equal(elapsedMs(sw, 60000, 20), 7300);
  assert.equal(pauseStopwatch(sw, 90000), sw);
});

test('resume continues from the paused value', () => {
  let sw = pauseStopwatch(startStopwatch(0), 2000);
  sw = resumeStopwatch(sw, 10000);
  assert.equal(elapsedMs(sw, 11500, 20), 3500);
});

test('stops at the cap and stays there', () => {
  const sw = startStopwatch(0);
  assert.equal(elapsedMs(sw, 25000, 20), 20000);
  assert.equal(elapsedMs(sw, 999999, 20), 20000);
  assert.ok(isCapped(sw, 20000, 20));
  assert.ok(!isCapped(sw, 19999, 20));
  assert.equal(elapsedMs(sw, 8000, 5), 5000);
});

test('formats tenths and shows the cap as a whole number', () => {
  assert.equal(formatElapsed(0, 20), '0.0s');
  assert.equal(formatElapsed(7390, 20), '7.3s');
  assert.equal(formatElapsed(19999, 20), '19.9s');
  assert.equal(formatElapsed(20000, 20), '20s');
  assert.equal(formatElapsed(5000, 5), '5s');
});

test('total time shows minutes, seconds and the per-card average', () => {
  assert.equal(formatTotal(0, 0), 'Total time: 0s (0s/card)');
  assert.equal(formatTotal(34900, 4), 'Total time: 34s (9s/card)');
  assert.equal(formatTotal(1234000, 150), 'Total time: 20m 34s (8s/card)');
  assert.equal(formatTotal(65000, 13), 'Total time: 1m 05s (5s/card)');
});
