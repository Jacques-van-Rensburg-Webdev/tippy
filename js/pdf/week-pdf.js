// Save week as PDF… on Week: builds the shown week's summary PDF and hands it over (the Share sheet
// on a phone, a download on a computer). Built straight away in the click, like the payout PDF.

import { computeWeekPeople, computeWeekPrep } from '../split.js';
import { addDays, isoWeek, todayIso } from '../dates.js';
import * as store from '../store.js';
import { nameOf, prepPeople } from '../data.js';
import { ui } from '../ui-state.js';
import { showToast } from '../ui.js';
import { weekTotals } from '../views/week.js';
import { buildWeekPdf } from './week-layout.js';
import { sharePdf } from './share.js';

export function makeWeekPdf() {
  const monday = ui.weekMon;
  const fileName = `Trinkgeld KW${isoWeek(monday)} ${addDays(monday, 3).slice(0, 4)}`;
  let bytes;
  try {
    const { days, pot } = weekTotals(monday);
    const { monId, friId, approvals } = prepPeople(monday);
    const shares = computeWeekPrep(pot, monId, friId);
    const week = computeWeekPeople(days, shares);
    // Staff list order; people no longer on the list last.
    const order = store.roster().map((p) => p.id);
    const rank = (id) => (order.includes(id) ? order.indexOf(id) : order.length);
    week.people.sort((a, b) => rank(a.id) - rank(b.id));
    const shift = (label, id) => ({ label, id, cents: id ? shares[id] || 0 : 0, approved: Boolean(id && approvals[id] && approvals[id].cents === shares[id]) });
    ({ bytes } = buildWeekPdf({
      monday,
      ended: todayIso() > addDays(monday, 6),
      company: store.settings().company || {},
      days,
      week,
      prep: [shift('Montag', monId), shift('Freitag', friId)],
      nameOf,
    }));
  } catch {
    showToast('The PDF couldn’t be created. Try again.');
    return;
  }
  sharePdf(bytes, `${fileName}.pdf`, fileName).then((result) => {
    if (result === 'downloaded') showToast('PDF saved.');
    else if (result === 'cancelled') showToast('PDF not saved.');
  });
}
