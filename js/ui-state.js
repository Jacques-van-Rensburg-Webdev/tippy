// What's shown right now (not saved): the tab, the day and week, open folders, the open dialog
// and other passing states.

import { mondayOf, todayIso } from './dates.js';

export const ui = {
  tab: 'today',
  date: todayIso(),
  weekMon: mondayOf(todayIso()),
  open: { bar: true, glasses: false, prep: false, former: false, rules: false, company: false },
  editStaff: null,   // id of the person being edited on Staff
  undoFor: null,     // id whose approval is asking "Undo / Keep"
  dialog: null,      // { editId, draft: { total, time, bar, glasses } }
  confirmDelete: false,
};

// Moves the shown day; the Week tab follows it to that day's week.
export function showDay(date) {
  ui.date = date;
  ui.undoFor = null;
  ui.weekMon = mondayOf(date);
}
