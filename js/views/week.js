// Week: the week's tips and prep pot, one row per day (tap to open its Payout), and the Monday /
// Friday prep shifts: who did them this week, their share of the pot, and Approve once the week
// has ended.

import { computeDay, computeWeekPrep } from '../split.js';
import { euro } from '../money.js';
import { addDays, isoWeek, niceDate, todayIso } from '../dates.js';
import * as store from '../store.js';
import { dayRules, prepPeople } from '../data.js';
import { ui } from '../ui-state.js';
import { ICON, esc, win } from '../ui.js';

// The week's days, tips and prep pot.
export function weekTotals(monday) {
  const byDate = {};
  store.daysBetween(monday, addDays(monday, 6)).forEach((d) => { byDate[d.date] = d; });
  let tips = 0;
  let pot = 0;
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = addDays(monday, i);
    const d = byDate[date];
    const r = d ? computeDay(d.logs, dayRules(d)) : null;
    if (r) { tips += r.total; pot += r.prep; }
    return { date, r, isPrepDay: i === 0 || i === 4 };
  });
  return { days, tips, pot };
}

export function viewWeek() {
  const mon = ui.weekMon;
  const sun = addDays(mon, 6);
  const today = todayIso();
  const { days, tips, pot } = weekTotals(mon);
  const { monId, friId, approvals } = prepPeople(mon);
  const shares = computeWeekPrep(pot, monId, friId);
  const ended = today > sun;

  const rows = days.map(({ date, r, isPrepDay }) => {
    const isToday = date === today;
    return `<button type="button" class="lrow cols-week${isToday ? ' is-today' : ''}" data-act="goto-day" data-date="${date}"${isToday ? ' aria-current="date"' : ''}>`
      + `<span${isToday ? ' class="b"' : ''}>${esc(niceDate(date))}${isPrepDay ? ' <span class="tag">PREP</span>' : ''}</span>`
      + `<span class="num right">${r ? euro(r.total) : '–'}</span>`
      + `<span class="num right">${r ? euro(r.prep) : '–'}</span></button>`;
  }).join('');

  const barStaff = store.roster().filter((p) => p.role === 'bar' && (p.active !== false || p.id === monId || p.id === friId));
  const select = (key, value) => `<select class="input" id="prep-${key}" data-act="week-prep" data-key="${key}" aria-label="${key === 'mon' ? 'Monday' : 'Friday'} prep">`
    + '<option value="">Nobody</option>'
    + barStaff.map((p) => `<option value="${esc(p.id)}"${p.id === value ? ' selected' : ''}>${esc(p.name)}</option>`).join('')
    + '</select>';

  const shiftRow = (key, label, date, id) => {
    const amount = id ? shares[id] || 0 : 0;
    const a = id && approvals[id];
    let status = '';
    if (id) {
      status = a && a.cents === amount
        ? `<span class="approved is-static"><span class="minick">${ICON.tick}</span>Approved</span>`
        : `<button type="button" class="btn approve sm" data-act="prep-approve" data-id="${esc(id)}"${ended ? '' : ' disabled'}>Approve</button>`;
    }
    return '<div class="prep-row">'
      + `<label class="lab"><span class="small"><b>${label}</b> · ${esc(niceDate(date))}</span>${select(key, id)}</label>`
      + `<span class="num b right prep-amount">${id ? euro(amount) : '–'}</span>`
      + (status ? `<div class="prep-status">${status}</div>` : '')
      + '</div>';
  };

  const body = '<div class="row">'
    + '<button type="button" class="btn sm" data-act="week" data-n="-7" aria-label="Previous week">‹</button>'
    + `<span class="grow b center">${esc(niceDate(mon))} – ${esc(niceDate(sun))}</span>`
    + '<button type="button" class="btn sm" data-act="week" data-n="7" aria-label="Next week">›</button></div>'
    + '<div class="grid2 gap-8">'
    + `<div class="lab"><span class="small">Week’s tips${ended ? '' : ' so far'}</span><div class="lcd sm">${euro(tips)} €</div></div>`
    + `<div class="lab"><span class="small">Prep pot</span><div class="lcd sm red">${euro(pot)} €</div></div></div>`
    + `<div class="sunken list small"><div class="lh cols-week"><span>Day</span><span class="right">Tips</span><span class="right">To prep</span></div>${rows}</div>`
    + '<fieldset class="group"><legend>Prep shifts this week</legend>'
    + shiftRow('mon', 'Monday', mon, monId)
    + shiftRow('fri', 'Friday', addDays(mon, 4), friId)
    + `<span class="xs muted block prep-note">The pot is shared equally between the prep shifts. ${ended ? 'The week is finished, so prep can be approved.' : 'Amounts so far. Approve after Sunday’s last log.'}</span></fieldset>`;
  return win(`Week ${isoWeek(mon)} — Prep pot`, body, { icon: ICON.cal });
}
