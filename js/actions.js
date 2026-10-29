// What each button does (data-act), for Today, Payout, Week and the log dialog.
// Staff's actions are in staff-actions.js. Every action ends by asking for a render.

import { computeDay, computeWeekPrep } from './split.js';
import { addDays, todayIso } from './dates.js';
import * as store from './store.js';
import { day, dayRules, genId, prepPeople, saveDay, saveRoster, saveWeek } from './data.js';
import { showDay, ui } from './ui-state.js';
import { showToast } from './ui.js';
import { candidate, closeLog, openLog, readDraft, refreshPreview, renderDialog } from './views/log-dialog.js';
import { weekTotals } from './views/week.js';
import { makePayoutPdf } from './pdf/payout-pdf.js';
import { STAFF_ACTIONS } from './staff-actions.js';

const ACTIONS = {
  tab: (el, go) => go(el.dataset.tab),
  day: (el) => showDay(addDays(ui.date, Number(el.dataset.n))),
  'day-today': () => showDay(todayIso()),
  'goto-day': (el, go) => { showDay(el.dataset.date); go('payout'); },
  week: (el) => { ui.weekMon = addDays(ui.weekMon, Number(el.dataset.n)); },

  // ---------- Log dialog
  'log-new': () => openLog(null),
  'log-edit': (el) => openLog(el.dataset.id),
  'log-close': () => closeLog(),
  'log-delete-ask': () => { readDraft(); ui.confirmDelete = true; renderDialog(); },
  'log-delete-cancel': () => { readDraft(); ui.confirmDelete = false; renderDialog(); },
  'log-delete': () => {
    const { editId } = ui.dialog;
    closeLog();
    saveDay(ui.date, (cur) => { cur.logs = cur.logs.filter((l) => l.id !== editId); });
    showToast('Log deleted.');
  },
  'log-save': () => {
    const { cand, error } = candidate();
    if (error) return;
    const { editId } = ui.dialog;
    const entry = { id: editId || genId(), time: cand.time, total: cand.total, bar: cand.bar, glasses: cand.glasses };
    closeLog();
    saveDay(ui.date, (cur) => {
      if (editId) cur.logs = cur.logs.map((l) => (l.id === editId ? entry : l));
      else cur.logs.push(entry);
    });
    showToast(editId ? 'Log updated.' : 'Log saved.');
  },
  'dlg-add': () => {
    const nameField = document.getElementById('dlg-new-name');
    const name = nameField.value.trim();
    const role = document.getElementById('dlg-new-role').value;
    if (!name) { nameField.focus(); return; }
    readDraft();
    const id = genId();
    if (role === 'bar') ui.dialog.draft.bar.push(id);
    else ui.dialog.draft.glasses = id;
    saveRoster([...store.roster(), { id, name, role, active: true }]);
    renderDialog();
    showToast(`${name} added to the team.`);
  },

  // ---------- Payout
  approve: (el) => {
    const d = day(ui.date);
    const p = computeDay(d && d.logs, dayRules(d)).byId[el.dataset.id];
    if (!p) return;
    saveDay(ui.date, (cur) => { cur.approvals[p.id] = { at: new Date().toISOString(), cents: p.total }; });
  },
  'undo-ask': (el) => { ui.undoFor = el.dataset.id; },
  'undo-cancel': () => { ui.undoFor = null; },
  unapprove: (el) => {
    ui.undoFor = null;
    saveDay(ui.date, (cur) => { delete cur.approvals[el.dataset.id]; });
    showToast('Approval removed.');
  },
  pdf: () => makePayoutPdf(),

  // ---------- Week
  'prep-approve': (el) => {
    const { monId, friId, approvals } = prepPeople(ui.weekMon);
    const shares = computeWeekPrep(weekTotals(ui.weekMon).pot, monId, friId);
    const id = el.dataset.id;
    saveWeek(ui.weekMon, {
      approvals: { ...approvals, [id]: { at: new Date().toISOString(), cents: shares[id] || 0 } },
      mon: monId || null,
      fri: friId || null,
    });
    showToast('Prep approved.');
  },

  ...STAFF_ACTIONS,
};

// Selects: a week's prep person, the usual prep people.
const CHANGES = {
  'week-prep': (el) => { saveWeek(ui.weekMon, { [el.dataset.key]: el.value || null }); showToast('Prep shift updated for this week.'); },
  'prep-default': (el) => { store.set('settings/main', { ...store.settings(), [el.dataset.key]: el.value || null }); showToast('Usual prep person saved.'); },
};

// go(tab) switches tabs; render() redraws the screen.
export function initActions({ go, render }) {
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-act]');
    if (!el || el.tagName === 'SELECT' || el.disabled) return;
    const action = ACTIONS[el.dataset.act];
    if (!action) return;
    action(el, go);
    render();
  });
  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.closest('#dialog')) {
      if (el.name === 'bar') el.nextElementSibling?.classList.toggle('b', el.checked);
      refreshPreview();
      return;
    }
    const change = CHANGES[el.dataset.act];
    if (change) { change(el); render(); }
  });
  document.addEventListener('input', (event) => {
    if (event.target.closest('#dialog') && (event.target.id === 'log-total' || event.target.id === 'log-time')) {
      refreshPreview();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.dialog) closeLog();
    if (event.key === 'Enter' && event.target.id === 'new-name') {
      event.preventDefault();
      document.querySelector('[data-act="staff-add"]')?.click();
    }
  });
}
