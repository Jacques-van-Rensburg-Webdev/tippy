// The tip split (ported exactly from the reference). No HTML here. Amounts are in cents.
//
// A day is a list of logs, each the LS Pay running total at a time: { id, time, total, bar: [ids],
// glasses: id | null }. For each log, what was added since the previous log is split:
//   1. glasses: glassesPct % to the glasses runner (if one is set)
//   2. prep:    prepPct % of the rest to the prep pot
//   3. bar:     the remainder, split evenly in cents between the ticked bar staff
//               (the glasses runner is never counted as bar staff in the same log)
// A total lower than the one before is an error and that interval is skipped.
// Bar money with nobody ticked is "unassigned".
// Each person also gets beforePrep (their share before the prep cut; the glasses runner's money
// has no prep taken from it) and prepCut (beforePrep - total). The prep cuts add up to the prep pot.

// Splits `cents` evenly; the first ones get the leftover cents.
export function splitEven(cents, ids) {
  const out = {};
  const n = ids.length;
  if (!n) return out;
  const base = Math.floor(cents / n);
  const rem = cents - base * n;
  ids.forEach((id, i) => { out[id] = base + (i < rem ? 1 : 0); });
  return out;
}

export function sortLogs(logs) {
  return [...(logs || [])].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

// -> { intervals, people (sorted by when they started, each with total, beforePrep and prepCut),
//      byId, prep, unassigned, glassesTotal,
//      total (the last log's total), paid (sum of everyone's share) }
export function computeDay(logs, rules) {
  const gp = Number(rules.glassesPct) || 0;
  const pp = Number(rules.prepPct) || 0;
  const sorted = sortLogs(logs);
  const people = {};
  const intervals = [];
  let prev = 0;
  let prevTime = null;
  let prep = 0;
  let unassigned = 0;
  let glassesTotal = 0;
  const person = (id) => (people[id] = people[id] || { id, total: 0, beforePrep: 0, parts: [], from: undefined, to: null, glasses: false, bar: false });

  for (const log of sorted) {
    const delta = log.total - prev;
    const iv = { log, from: prevTime, to: log.time, delta, glassesC: 0, prepC: 0, barC: 0, shares: {}, error: null };
    if (delta < 0) {
      iv.error = 'lower';
    } else {
      const g = log.glasses ? Math.round((delta * gp) / 100) : 0;
      const rest = delta - g;
      const p = Math.round((rest * pp) / 100);
      const bar = rest - p;
      iv.glassesC = g;
      iv.prepC = p;
      iv.barC = bar;
      prep += p;
      glassesTotal += g;
      const barIds = (log.bar || []).filter((id) => id !== log.glasses);
      if (barIds.length) {
        iv.shares = splitEven(bar, barIds);
        const before = splitEven(rest, barIds);
        for (const id of barIds) {
          const pr = person(id);
          pr.bar = true;
          pr.total += iv.shares[id];
          pr.beforePrep += before[id];
          pr.parts.push({ cents: iv.shares[id], kind: 'bar' });
          if (pr.from === undefined) pr.from = prevTime;
          pr.to = log.time;
        }
      } else {
        unassigned += bar;
      }
      if (log.glasses) {
        const pr = person(log.glasses);
        pr.glasses = true;
        pr.total += g;
        pr.beforePrep += g;
        pr.parts.push({ cents: g, kind: 'glasses', of: delta, pct: gp });
        if (pr.from === undefined) pr.from = prevTime;
        pr.to = log.time;
      }
    }
    intervals.push(iv);
    prev = log.total;
    prevTime = log.time;
  }

  Object.values(people).forEach((pr) => { pr.prepCut = pr.beforePrep - pr.total; });
  const list = Object.values(people).sort((a, b) => {
    const fa = a.from || '';
    const fb = b.from || '';
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
  return { intervals, people: list, byId: people, prep, unassigned, glassesTotal, total: prev, paid: list.reduce((s, p) => s + p.total, 0) };
}

// The week's prep pot, split evenly between the Monday and Friday prep people.
// The same person on both days gets both halves.
export function computeWeekPrep(pot, monId, friId) {
  const shifts = [monId, friId].filter(Boolean);
  const out = {};
  const share = splitEven(pot, shifts.map((_, i) => `s${i}`));
  shifts.forEach((id, i) => { out[id] = (out[id] || 0) + share[`s${i}`]; });
  return out;
}
