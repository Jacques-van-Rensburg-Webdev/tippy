// Dates as 'YYYY-MM-DD' keys in local time; times as 'HH:MM'. No HTML here.

const pad = (n) => String(n).padStart(2, '0');

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const mondayOf = (s) => addDays(s, -((fromIso(s).getDay() + 6) % 7));
export const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// The bar's day starts at 06:00: earlier times are after midnight, on the night before.
export const DAY_START = '06:00';
export const afterMidnight = (time) => Boolean(time) && time < DAY_START;
// Order of a time within the bar's day: 06:00 … 23:59, then 00:00 … 05:59.
export const timeOrder = (time) => (afterMidnight(time) ? `1${time}` : `0${time}`);
// The bar's day at a moment: before 06:00 it's still the day before.
export function barDay(d) {
  const day = new Date(d);
  if (afterMidnight(`${pad(day.getHours())}:${pad(day.getMinutes())}`)) day.setDate(day.getDate() - 1);
  return iso(day);
}
export const todayIso = () => barDay(new Date());

// "Thu 29 Oct"
export const niceDate = (s) => fromIso(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
// "29.10.2026"
export const deDate = (s) => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
// "HH:MM" of an ISO timestamp, in local time.
export const timeOf = (stamp) => { const d = new Date(stamp); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// ISO 8601 week number.
export function isoWeek(s) {
  const d = fromIso(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
