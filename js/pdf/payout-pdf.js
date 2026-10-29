// Save as PDF… on Payout: builds the shown day's payout PDF and hands it over (the Share sheet on
// a phone, a download on a computer). Built straight away in the click, so the phone still counts
// the Share sheet as a response to the tap.

import * as store from '../store.js';
import { day, dayRules, logsOf, nameOf } from '../data.js';
import { ui } from '../ui-state.js';
import { showToast } from '../ui.js';
import { buildPayoutPdf } from './payout-layout.js';
import { sharePdf } from './share.js';

export function makePayoutPdf() {
  const d = day(ui.date);
  let bytes;
  try {
    ({ bytes } = buildPayoutPdf({
      date: ui.date,
      company: store.settings().company,
      logs: logsOf(d),
      rules: dayRules(d),
      approvals: (d && d.approvals) || {},
      nameOf,
    }));
  } catch {
    showToast('The PDF couldn’t be created. Try again.');
    return;
  }
  sharePdf(bytes, `Trinkgeld ${ui.date}.pdf`, `Trinkgeld ${ui.date}`).then((result) => {
    if (result === 'downloaded') showToast('PDF saved.');
    else if (result === 'cancelled') showToast('PDF not saved.');
  });
}
