// Entry: the tabs (#/today, #/payout, #/week, #/staff), rendering the current screen into the
// window column, and the taskbar. Every redraw comes from a tap (the data is on this device only),
// so it happens straight away; typed values in fields marked data-keep, and the focused field,
// survive it.

import { initGridOverlay } from './grid-overlay.js';
import { ui } from './ui-state.js';
import { ICON } from './ui.js';
import { initActions } from './actions.js';
import { viewToday } from './views/today.js';
import { viewPayout } from './views/payout.js';
import { viewWeek } from './views/week.js';
import { viewStaff } from './views/staff.js';

const TABS = [
  ['today', 'Today', ICON.clock, viewToday],
  ['payout', 'Payout', ICON.cash, viewPayout],
  ['week', 'Week', ICON.cal, viewWeek],
  ['staff', 'Staff', ICON.staff, viewStaff],
];

const screen = document.getElementById('screen');

function renderTabs() {
  document.getElementById('tabs').innerHTML = TABS.map(([key, label, icon]) => `<button type="button" class="tab" data-act="tab" data-tab="${key}"${ui.tab === key ? ' aria-current="page"' : ''}>${icon}${label}</button>`).join('');
}

export function render() {
  const kept = {};
  screen.querySelectorAll('input[id][data-keep], select[id][data-keep]').forEach((el) => { kept[el.id] = el.value; });
  const focusedId = screen.contains(document.activeElement) ? document.activeElement.id : '';
  const view = (TABS.find(([key]) => key === ui.tab) || TABS[0])[3];
  screen.innerHTML = view();
  Object.entries(kept).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && el.dataset.keep !== undefined) el.value = value;
  });
  if (focusedId) document.getElementById(focusedId)?.focus();
  renderTabs();
}

const tabFromHash = () => {
  const key = window.location.hash.replace('#/', '');
  return TABS.some(([k]) => k === key) ? key : 'today';
};

function go(tab) {
  ui.editStaff = null;
  ui.undoFor = null;
  if (window.location.hash !== `#/${tab}`) window.location.hash = `#/${tab}`;
  ui.tab = tab;
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => { if (tabFromHash() !== ui.tab) go(tabFromHash()); });

ui.tab = tabFromHash();
initActions({ go, render });
render();
initGridOverlay();

// Offline and home-screen install (sw.js). Browsers only allow it on https or localhost.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
