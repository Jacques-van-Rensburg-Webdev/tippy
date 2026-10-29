// Reading and saving the bar's data, on top of store.js: the shown day, staff names, the rules a
// day uses, and saving a day, the staff list, settings and a week. No HTML here.

import * as store from './store.js';
import { sortLogs } from './split.js';

export const day = (date) => store.get(`days/${date}`);
export const logsOf = (d) => sortLogs(d && d.logs);

export function nameOf(id) {
  const p = store.roster().find((r) => r.id === id);
  return p ? p.name : '(removed)';
}
export const activeOf = (role) => store.roster().filter((r) => r.active !== false && r.role === role);
export const hasActiveStaff = () => store.roster().some((p) => p.active !== false);

// A day keeps the rules it started with; a day without logs uses the current settings.
export function dayRules(d) {
  if (d && d.rules) return d.rules;
  const s = store.settings();
  return { glassesPct: s.glassesPct, prepPct: s.prepPct };
}

// mutate(cur) changes a copy of the day, which is then saved.
export function saveDay(date, mutate) {
  const cur = day(date) || { date, logs: [], approvals: {} };
  cur.date = date;
  cur.logs = cur.logs || [];
  cur.approvals = cur.approvals || {};
  if (!cur.rules) {
    const s = store.settings();
    cur.rules = { glassesPct: Number(s.glassesPct) || 0, prepPct: Number(s.prepPct) || 0 };
  }
  mutate(cur);
  store.set(`days/${date}`, cur);
}

export const saveRoster = (list) => store.set('settings/staff', { list });
export const saveSettings = (patch) => store.set('settings/main', { ...store.settings(), ...patch });

export const week = (monday) => store.get(`weeks/${monday}`);
export function saveWeek(monday, patch) {
  store.set(`weeks/${monday}`, { approvals: {}, ...(week(monday) || {}), ...patch });
}

// The week's prep people: this week's choice, else the usual ones from Staff.
export function prepPeople(monday) {
  const wd = week(monday) || {};
  const s = store.settings();
  return {
    monId: wd.mon !== undefined ? wd.mon : s.prepMon,
    friId: wd.fri !== undefined ? wd.fri : s.prepFri,
    approvals: wd.approvals || {},
  };
}

export const genId = () => Math.random().toString(36).slice(2, 10);
