// The tip split (js/split.js), money and dates.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDay, computeWeekPrep, splitEven, sortLogs } from '../js/split.js';
import { euro, parseEuro } from '../js/money.js';
import { isoWeek, mondayOf, addDays } from '../js/dates.js';

const RULES = { glassesPct: 10, prepPct: 5 };
const log = (time, total, bar, glasses = null, id = time) => ({ id, time, total, bar, glasses });

test('splitEven: leftover cents go to the first ones', () => {
  assert.deepEqual(splitEven(100, ['a', 'b', 'c']), { a: 34, b: 33, c: 33 });
  assert.deepEqual(splitEven(0, ['a']), { a: 0 });
  assert.deepEqual(splitEven(5, []), {});
});

test('one log with a glasses runner: 10 % glasses, 5 % of the rest to prep, bar split evenly', () => {
  const r = computeDay([log('20:00', 10000, ['a', 'b'], 'g')], RULES);
  const iv = r.intervals[0];
  assert.deepEqual([iv.delta, iv.glassesC, iv.prepC, iv.barC], [10000, 1000, 450, 8550]);
  assert.deepEqual([r.byId.a.total, r.byId.b.total, r.byId.g.total], [4275, 4275, 1000]);
  assert.equal(r.prep, 450);
  assert.equal(r.total, 10000);
  assert.equal(r.paid + r.prep + r.unassigned, r.total, 'every cent goes somewhere');
});

test('later logs split only what was added since the previous one; cents add up', () => {
  const r = computeDay([log('22:00', 13001, ['a', 'b', 'c']), log('20:00', 10000, ['a', 'b'], 'g')], RULES);
  const iv = r.intervals[1];
  assert.equal(iv.from, '20:00');
  assert.deepEqual([iv.delta, iv.glassesC, iv.prepC, iv.barC], [3001, 0, 150, 2851]);
  assert.deepEqual(iv.shares, { a: 951, b: 950, c: 950 });
  assert.deepEqual([r.byId.a.total, r.byId.c.total], [4275 + 951, 950]);
  assert.equal(r.paid + r.prep + r.unassigned, 13001);
});

test('shift times: from the log before they first appear to their last log', () => {
  const r = computeDay([log('18:00', 5000, ['a']), log('20:00', 9000, ['a', 'b']), log('23:00', 12000, ['b'])], RULES);
  assert.deepEqual([r.byId.a.from, r.byId.a.to], [null, '20:00']);
  assert.deepEqual([r.byId.b.from, r.byId.b.to], ['18:00', '23:00']);
  assert.deepEqual(r.people.map((p) => p.id), ['a', 'b'], 'sorted by start ("start" first)');
});

test('a glasses runner ticked as bar too is only counted as glasses', () => {
  const r = computeDay([log('20:00', 10000, ['a', 'g'], 'g')], RULES);
  assert.equal(r.byId.g.bar, false);
  assert.equal(r.byId.g.total, 1000);
  assert.equal(r.byId.a.total, 8550);
});

test('nobody ticked: the bar share is unassigned', () => {
  const r = computeDay([log('20:00', 2000, [])], RULES);
  assert.equal(r.unassigned, 1900);
  assert.equal(r.prep, 100);
  assert.equal(r.people.length, 0);
});

test('a lower total is an error and nothing is split for it', () => {
  const r = computeDay([log('20:00', 5000, ['a']), log('21:00', 4000, ['a'])], RULES);
  assert.equal(r.intervals[1].error, 'lower');
  assert.equal(r.byId.a.total, 4750);
  assert.equal(r.total, 4000);
});

test('the day keeps its own rules', () => {
  const r = computeDay([log('20:00', 10000, ['a'], 'g')], { glassesPct: 20, prepPct: 0 });
  assert.deepEqual([r.byId.g.total, r.prep, r.byId.a.total], [2000, 0, 8000]);
});

test('editing a log in the middle changes the next interval too', () => {
  const logs = [log('18:00', 5000, ['a']), log('20:00', 9000, ['a', 'b']), log('22:00', 12000, ['b'])];
  const edited = logs.map((l) => (l.time === '20:00' ? { ...l, total: 10000 } : l));
  const r = computeDay(edited, RULES);
  assert.deepEqual(r.intervals.map((i) => i.delta), [5000, 5000, 2000]);
});

test('sortLogs orders by time and leaves the input alone', () => {
  const logs = [log('22:00', 3, []), log('09:00', 1, [])];
  assert.deepEqual(sortLogs(logs).map((l) => l.time), ['09:00', '22:00']);
  assert.equal(logs[0].time, '22:00');
});

test('week prep: the pot split between Monday and Friday; one person on both gets both', () => {
  assert.deepEqual(computeWeekPrep(101, 'a', 'b'), { a: 51, b: 50 });
  assert.deepEqual(computeWeekPrep(101, 'a', 'a'), { a: 101 });
  assert.deepEqual(computeWeekPrep(101, 'a', null), { a: 101 });
  assert.deepEqual(computeWeekPrep(101, null, null), {});
});

test('money: German format and typed amounts', () => {
  assert.equal(euro(123456), '1.234,56');
  assert.equal(euro(5), '0,05');
  assert.equal(parseEuro('42,45'), 4245);
  assert.equal(parseEuro('42.45'), 4245);
  assert.equal(parseEuro('1.234,56'), 123456);
  assert.equal(parseEuro('€ 12'), 1200);
  assert.ok(Number.isNaN(parseEuro('12,345')));
  assert.ok(Number.isNaN(parseEuro('abc')));
  assert.ok(Number.isNaN(parseEuro('')));
});

test('dates: Monday of the week, ISO week numbers', () => {
  assert.equal(mondayOf('2026-11-01'), '2026-10-26');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(isoWeek('2026-10-26'), 44);
  assert.equal(isoWeek('2027-01-01'), 53);
  assert.equal(isoWeek('2026-01-01'), 1);
});
