// Today: the LS Pay total so far, who's working since the last log, Log tips…, and the logs
// (newest first; tap one to edit it).

import { computeDay } from '../split.js';
import { euro } from '../money.js';
import { niceDate } from '../dates.js';
import * as store from '../store.js';
import { day, dayRules, hasActiveStaff, logsOf, nameOf } from '../data.js';
import { ui } from '../ui-state.js';
import { ICON, dateNav, esc, syncLine, win } from '../ui.js';

const companyName = () => store.settings().company.name || 'Your company';

function onShift(last) {
  if (!last) return '<span class="small muted">Nobody logged yet. The first log says who started.</span>';
  const bar = (last.bar || []).filter((id) => id !== last.glasses);
  const people = bar.length
    ? bar.map((id) => `<span class="row">${ICON.staff}<span>${esc(nameOf(id))}</span></span>`).join('')
    : '<span class="muted small">No bar staff ticked</span>';
  const glasses = last.glasses
    ? `<div class="row on-shift-glasses">${esc(nameOf(last.glasses))} <span class="tag blue">Glasses</span><span class="xs muted">since ${esc(last.time)}</span></div>`
    : '';
  return `<div class="grid2 on-shift">${people}</div>${glasses}`;
}

function logRows(r) {
  return '<div class="sunken list"><div class="lh cols-logs"><span>Time</span><span>Added</span><span>Shared by</span></div>'
    + r.intervals.slice().reverse().map((iv) => {
      const who = (iv.log.bar || []).filter((id) => id !== iv.log.glasses).map(nameOf).join(', ');
      const glasses = iv.log.glasses ? ` + <span class="tag blue">${esc(nameOf(iv.log.glasses))}</span>` : '';
      return `<button type="button" class="lrow cols-logs" data-act="log-edit" data-id="${esc(iv.log.id)}" aria-label="Edit log at ${esc(iv.log.time)}">`
        + `<span class="b">${esc(iv.log.time)}</span>`
        + `<span class="num">${iv.error ? '<span class="lower">lower!</span>' : `+${euro(iv.delta)}`}</span>`
        + `<span>${esc(who) || '<span class="muted">nobody</span>'}${glasses}</span></button>`;
    }).join('')
    + '</div>';
}

export function viewToday() {
  const d = day(ui.date);
  const logs = logsOf(d);
  const r = computeDay(logs, dayRules(d));
  const last = logs[logs.length - 1];
  const noStaff = !hasActiveStaff();

  const top = win(`Tips — ${niceDate(ui.date)}`,
    dateNav(ui.date)
    + `<div class="row between"><span class="small">${esc(companyName())}</span>${syncLine()}</div>`
    + '<span>Card tips so far (LS Pay):</span>'
    + `<div class="lcd">${euro(r.total)} €</div>`
    + `<span class="small muted">${last ? `Last log ${esc(last.time)} · ${logs.length} ${logs.length === 1 ? 'log' : 'logs'}` : 'No logs for this day yet'}</span>`
    + `<fieldset class="group"><legend>${last ? 'Working since last log' : 'On shift'}</legend>${onShift(last)}</fieldset>`
    + (noStaff ? '<div class="info"><span class="b">Add your team first</span><span class="small">Add bar staff and glasses runners in Staff, then log tips here.</span><button type="button" class="btn sm" data-act="tab" data-tab="staff">Go to Staff</button></div>' : '')
    + `<button type="button" class="btn primary big" data-act="log-new"${noStaff ? ' disabled' : ''}>Log tips…</button>`,
    { icon: ICON.cash });

  const errors = r.intervals.filter((i) => i.error).length;
  const rows = logs.length
    ? logRows(r)
    : '<div class="empty"><span>Log the LS Pay total whenever someone starts or leaves, and once more at closing.</span></div>';
  const list = win('Logs',
    (errors ? '<div class="err">A log has a lower total than the one before it. Tap it to fix the amount.</div>' : '')
    + rows
    + (logs.length ? '<span class="xs muted">Tap a log to correct it.</span>' : ''),
    { grey: true, status: `${logs.length} ${logs.length === 1 ? 'log' : 'logs'} · total ${euro(r.total)} €` });
  return top + list;
}
