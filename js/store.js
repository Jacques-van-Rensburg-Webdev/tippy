// Everything saved on this device (localStorage), under paths like the reference's database:
//   'settings/main'   { company: { name, street, postcode, city }, glassesPct, prepPct, prepMon, prepFri }
//   'settings/staff'  { list: [{ id, name, role: 'bar' | 'glasses', active }] }
//   'days/<date>'     { date, logs: [...], approvals: { id: { at, cents } }, rules: { glassesPct, prepPct } }
//   'weeks/<monday>'  { mon, fri, approvals }
// Screens read through the getters and write with set().

const KEY = 'tippy';

export const DEFAULT_SETTINGS = { company: { name: '', street: '', postcode: '', city: '' }, glassesPct: 10, prepPct: 5, prepMon: null, prepFri: null };

let data = null;
const clone = (o) => JSON.parse(JSON.stringify(o));

function load() {
  if (data) return data;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    data = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    data = {};
  }
  return data;
}

export function get(path) {
  const value = load()[path];
  return value ? clone(value) : null;
}

export function set(path, value) {
  load()[path] = clone(value);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the change lasts for this visit only.
  }
}

// Days from..to (inclusive), as saved.
export function daysBetween(from, to) {
  return Object.keys(load())
    .filter((k) => k.startsWith('days/'))
    .map((k) => data[k])
    .filter((d) => d.date >= from && d.date <= to)
    .map(clone);
}

export function settings() {
  const s = get('settings/main') || {};
  return { ...clone(DEFAULT_SETTINGS), ...s, company: { ...DEFAULT_SETTINGS.company, ...(s.company || {}) } };
}

export const roster = () => (get('settings/staff') || {}).list || [];
