// The Log tips / Edit log dialog: the LS Pay total, the time, the bar staff and glasses runner,
// adding someone new, a live preview of the split and the checks before Save.

import { computeDay } from '../split.js';
import { euro, parseEuro } from '../money.js';
import { niceDate, nowTime, todayIso } from '../dates.js';
import * as store from '../store.js';
import { day, dayRules, logsOf, nameOf } from '../data.js';
import { ui } from '../ui-state.js';
import { ICON, esc, win } from '../ui.js';
import { perHead } from './today.js';

const box = () => document.getElementById('dialog');
const field = (id) => document.getElementById(id);

export function openLog(editId) {
  const logs = logsOf(day(ui.date));
  let draft;
  if (editId) {
    const l = logs.find((x) => x.id === editId);
    if (!l) return;
    draft = { total: euro(l.total), time: l.time, bar: [...(l.bar || [])], glasses: l.glasses || '' };
  } else {
    // A new log starts with the people from the last one. On another day the time is typed in,
    // so a past log isn't saved at today's clock time.
    const last = logs[logs.length - 1];
    draft = { total: '', time: ui.date === todayIso() ? nowTime() : '', bar: last ? [...(last.bar || [])] : [], glasses: last ? last.glasses || '' : '' };
  }
  ui.dialog = { editId: editId || null, draft };
  ui.confirmDelete = false;
  renderDialog();
  field('log-total')?.focus();
}

export function closeLog() {
  ui.dialog = null;
  renderDialog();
}

// The dialog's fields -> the draft.
export function readDraft() {
  const d = ui.dialog.draft;
  if (field('log-total')) d.total = field('log-total').value;
  if (field('log-time')) d.time = field('log-time').value;
  d.bar = [...box().querySelectorAll('input[name="bar"]:checked')].map((el) => el.value);
  d.glasses = box().querySelector('input[name="glasses"]:checked')?.value || '';
  return d;
}

// Ids in roster order, so the split's cent order doesn't depend on tick order.
const barOrder = (ids) => store.roster().filter((p) => ids.includes(p.id)).map((p) => p.id);

// -> { cand, error, iv } for the log as typed.
export function candidate() {
  const d = readDraft();
  const total = parseEuro(d.total);
  const logs = logsOf(day(ui.date)).filter((l) => l.id !== ui.dialog.editId);
  const cand = { id: '__cand', time: d.time, total, bar: barOrder(d.bar), glasses: d.glasses || null };
  let error = null;
  if (!d.total) error = 'Enter the LS Pay total.';
  else if (Number.isNaN(total)) error = 'Enter the total as a number, like 42,45.';
  else if (!d.time) error = 'Enter the time.';
  else if (logs.some((l) => l.time === d.time)) error = `There is already a log at ${d.time}. Change the time or edit that log instead.`;
  let iv = null;
  if (!error) {
    const r = computeDay([...logs, cand], dayRules(day(ui.date)));
    const idx = r.intervals.findIndex((i) => i.log.id === '__cand');
    iv = r.intervals[idx];
    const next = r.intervals[idx + 1];
    if (iv.error) error = `The total can’t be lower than the previous log (${euro(iv.log.total - iv.delta)} €).`;
    else if (next && next.error) error = `The total can’t be higher than the next log at ${next.log.time} (${euro(next.log.total)} €).`;
    else if (iv.delta > 0 && !cand.bar.filter((id) => id !== cand.glasses).length) error = 'Tick at least one bar person, or the bar share has no one to go to.';
  }
  return { cand, error, iv };
}

export function refreshPreview() {
  if (!ui.dialog || !field('log-preview')) return;
  const { cand, error, iv } = candidate();
  const earlier = logsOf(day(ui.date)).filter((l) => l.id !== ui.dialog.editId && l.time < cand.time);
  const prev = earlier[earlier.length - 1];
  field('bar-legend').textContent = `Bar, ${prev ? prev.time : 'start'} – ${cand.time || '…'}`;
  field('log-save').disabled = Boolean(error);
  const preview = field('log-preview');
  if (error) {
    preview.innerHTML = field('log-total').value ? `<div class="err" role="alert">${esc(error)}</div>` : '';
    return;
  }
  const rules = dayRules(day(ui.date));
  const barIds = cand.bar.filter((id) => id !== cand.glasses);
  const line = (label, cents) => `<div class="row between"><span>${label}</span><span>${euro(cents)}</span></div>`;
  preview.innerHTML = '<div class="info num">'
    + `<div class="row">${ICON.info}<span class="b">+${euro(iv.delta)} € since ${esc(iv.from || 'the start')}${barIds.length ? ` · ${perHead(iv.delta, barIds.length)} each` : ''}</span></div>`
    + (cand.glasses ? line(`1. Glasses (${esc(rules.glassesPct)}%) · ${esc(nameOf(cand.glasses))}`, iv.glassesC) : '')
    + line(`${cand.glasses ? '2. ' : ''}Prep pot (${esc(rules.prepPct)}%${cand.glasses ? ' of the rest' : ''})`, iv.prepC)
    + `<div class="b preview-bar">${cand.glasses ? '3. ' : ''}Bar, ${euro(iv.barC)} ÷ ${barIds.length}</div>`
    + `<div class="grid2 preview-shares">${barIds.map((id) => line(esc(nameOf(id)), iv.shares[id] || 0)).join('')}</div>`
    + '</div>';
}

export function renderDialog() {
  const dl = ui.dialog;
  if (!dl) {
    box().innerHTML = '';
    document.body.style.overflow = '';
    return;
  }
  document.body.style.overflow = 'hidden';
  const d = dl.draft;
  const logs = logsOf(day(ui.date));
  const prev = logs.filter((l) => l.id !== dl.editId && l.time < d.time).pop();
  const roster = store.roster();
  const barPeople = roster.filter((p) => p.role === 'bar' && (p.active !== false || d.bar.includes(p.id)));
  const glassesPeople = roster.filter((p) => (p.role === 'glasses' && p.active !== false) || p.id === d.glasses);
  const check = (p) => `<label class="opt"><input type="checkbox" class="ck" name="bar" value="${esc(p.id)}"${d.bar.includes(p.id) ? ' checked' : ''}><span${d.bar.includes(p.id) ? ' class="b"' : ''}>${esc(p.name)}</span></label>`;
  const radio = (id, label) => `<label class="opt"><input type="radio" class="ck radio" name="glasses" value="${esc(id)}"${d.glasses === id ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const title = (dl.editId ? 'Edit log' : 'Log tips') + (ui.date === todayIso() ? '' : ` — ${niceDate(ui.date)}`);

  const body = '<div class="cols-log">'
    + `<label class="lab"><span>LS Pay tips so far (€)</span><input class="input money" id="log-total" inputmode="decimal" autocomplete="off" placeholder="${prev ? esc(euro(prev.total)) : '0,00'}" value="${esc(d.total)}"></label>`
    + `<label class="lab"><span>Time</span><input class="input time" id="log-time" type="time" value="${esc(d.time)}"></label></div>`
    + `<span class="xs muted">The running total from the LS Pay report.${prev ? ` Last log: ${euro(prev.total)} € at ${esc(prev.time)}.` : ''}</span>`
    + `<fieldset class="group"><legend id="bar-legend">Bar, ${esc(prev ? prev.time : 'start')} – ${esc(d.time || '…')}</legend><div class="grid2">`
    + (barPeople.length ? barPeople.map(check).join('') : '<span class="small muted full">No bar staff yet.</span>')
    + '</div></fieldset>'
    + `<fieldset class="group"><legend>Glasses runner (gets ${esc(dayRules(day(ui.date)).glassesPct)}%)</legend><div class="grid2">`
    + glassesPeople.map((p) => radio(p.id, p.name)).join('') + radio('', 'No glasses')
    + '</div></fieldset>'
    + '<details class="add-new"><summary class="small">Someone new? Add them here</summary><div class="cols-new">'
    + '<input class="input" id="dlg-new-name" placeholder="First name" aria-label="New person’s name">'
    + '<select class="input" id="dlg-new-role" aria-label="Role"><option value="bar">Bar</option><option value="glasses">Glasses</option></select>'
    + '<button type="button" class="btn sm" data-act="dlg-add">Add</button></div></details>'
    + '<div id="log-preview" aria-live="polite"></div>'
    + '<div class="cols-save"><button type="button" class="btn primary big" data-act="log-save" id="log-save">Save log</button><button type="button" class="btn big" data-act="log-close">Cancel</button></div>'
    + (dl.editId ? (ui.confirmDelete
      ? `<div class="err row between wrap"><span>Delete the log at ${esc(d.time)}?</span><span class="row"><button type="button" class="btn sm" data-act="log-delete">Delete</button><button type="button" class="btn sm" data-act="log-delete-cancel">Keep</button></span></div>`
      : '<button type="button" class="link" data-act="log-delete-ask">Delete this log</button>') : '');

  box().innerHTML = `<div class="overlay" role="dialog" aria-modal="true" aria-label="${title}">${win(title, body, { icon: ICON.cash, close: 'log-close' })}</div>`;
  refreshPreview();
}
