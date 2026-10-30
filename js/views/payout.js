// Payout: the day's totals and warnings, "N of M approved", each person's amount with how it was
// worked out (and its amount before the prep cut) and Approve (Undo; "Amount changed" if it moved after approving), the prep pot, and
// Save as PDF.

import { computeDay } from '../split.js';
import { euro } from '../money.js';
import { niceDate, timeOf } from '../dates.js';
import { day, dayRules, logsOf, nameOf } from '../data.js';
import { ui } from '../ui-state.js';
import { ICON, dateNav, esc, win } from '../ui.js';

export const isApproved = (approvals, p) => Boolean(approvals[p.id] && approvals[p.id].cents === p.total);

// "45,00 + 10% of 100,00"
export const partsText = (p, pct = '% of ') => p.parts.map((pt) => (pt.kind === 'glasses' ? `${pt.pct}${pct}${euro(pt.of)}` : euro(pt.cents))).join(' + ');

function status(p, approvals) {
  const a = approvals[p.id];
  if (isApproved(approvals, p)) {
    if (ui.undoFor === p.id) {
      return `<span class="row"><button type="button" class="btn sm" data-act="unapprove" data-id="${esc(p.id)}">Undo</button><button type="button" class="btn sm" data-act="undo-cancel">Keep</button></span>`;
    }
    return `<button type="button" class="approved" data-act="undo-ask" data-id="${esc(p.id)}" aria-label="Approved at ${esc(timeOf(a.at))}. Tap to undo.">`
      + `<span class="minick">${ICON.tick}</span><span>Approved<br><span class="xs muted approved-time">${esc(timeOf(a.at))}</span></span></button>`;
  }
  return (a ? '<span class="xs warn-text block">Amount changed</span>' : '')
    + `<button type="button" class="btn approve sm" data-act="approve" data-id="${esc(p.id)}">Approve${a ? ' again' : ''}</button>`;
}

function personRows(people, approvals) {
  return people.map((p) => {
    const shift = `${p.from ? p.from : 'start'}–${p.to || ''}`;
    return '<div class="lrow cols-payout">'
      + `<div class="stack"><b>${esc(nameOf(p.id))}</b><span class="xs muted">${esc(shift)} · ${esc(partsText(p))}</span>`
      + (p.prepCut ? `<span class="xs">Before prep ${euro(p.beforePrep)} − prep ${euro(p.prepCut)}</span>` : '')
      + '</div>'
      + `<span class="num b right">${euro(p.total)}</span>`
      + `<div>${status(p, approvals)}</div></div>`;
  }).join('');
}

export function viewPayout() {
  const d = day(ui.date);
  const logs = logsOf(d);
  const rules = dayRules(d);
  const r = computeDay(logs, rules);
  const title = `Payout — ${niceDate(ui.date)}`;
  let body = dateNav(ui.date);
  if (!logs.length) {
    body += '<div class="empty"><span>No tips logged for this day, so there is nothing to pay out yet.</span><button type="button" class="btn sm" data-act="tab" data-tab="today">Go to Today</button></div>';
    return win(title, body, { icon: ICON.cash });
  }
  const approvals = (d && d.approvals) || {};
  const done = r.people.filter((p) => isApproved(approvals, p)).length;
  const waiting = r.people.filter((p) => !isApproved(approvals, p)).map((p) => nameOf(p.id));
  const bar = r.people.filter((p) => p.bar);
  const glasses = r.people.filter((p) => !p.bar && p.glasses);
  const percent = r.people.length ? Math.round((done / r.people.length) * 100) : 0;

  body += '<div class="row between">'
    + `<div class="small stack"><span>LS Pay tips</span><span class="muted">${euro(r.paid)} paid out · ${euro(r.prep)} to prep pot</span></div>`
    + `<div class="lcd medium">${euro(r.total)} €</div></div>`
    + `<span class="xs muted">Rules for this day: glasses ${esc(rules.glassesPct)}% · prep ${esc(rules.prepPct)}% of the rest</span>`
    + (r.unassigned ? `<div class="err">${euro(r.unassigned)} € is not assigned to anyone. Edit the log that has nobody ticked.</div>` : '')
    + (r.intervals.some((i) => i.error) ? '<div class="err">One log has a lower total than the one before. Fix it on Today before paying out.</div>' : '')
    + '<div class="stack gap-4">'
    + `<div class="row between small"><span>${done} of ${r.people.length} approved</span><span class="muted right">${waiting.length ? `Waiting: ${esc(waiting.join(', '))}` : 'Everyone has approved'}</span></div>`
    + `<div class="sunken progress" role="progressbar" aria-label="Approved" aria-valuemin="0" aria-valuemax="${r.people.length}" aria-valuenow="${done}"><div style="width: ${percent}%"></div></div></div>`
    + '<div class="sunken list"><div class="lh cols-payout"><span>Name</span><span class="right">€</span><span>Status</span></div>'
    + (bar.length ? `<div class="sect">Bar</div>${personRows(bar, approvals)}` : '')
    + (glasses.length ? `<div class="sect blue">Glasses</div>${personRows(glasses, approvals)}` : '')
    + '<div class="sect yellow">Prep pot</div>'
    + '<button type="button" class="lrow cols-payout" data-act="tab" data-tab="week">'
    + `<div class="stack"><span>${esc(rules.prepPct)}% after glasses, held for prep</span><span class="xs muted">Paid out weekly</span></div>`
    + `<span class="num b right">${euro(r.prep)}</span><span class="small b">See week ›</span></button></div>`
    + `<button type="button" class="btn primary big" data-act="pdf">${ICON.pdf}Save as PDF…</button>`;
  return win(title, body, { icon: ICON.cash });
}
