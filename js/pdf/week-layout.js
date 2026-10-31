// The German week PDF, in the payout PDF's style (mm on A4). No HTML here.
//   Header:  company name / street / postcode + city · "Wochenübersicht Trinkgeld"
//            · KW and the week's dates (and "Woche läuft noch" before it ends)
//   Tage:    each day's LS Pay tips, paid out and prep pot, and SUMME
//   Person:  each person's amount per day, prep share, Gesamt and days approved,
//            Nicht zugeordnet, SUMME
//   Prep:    the Monday and Friday prep shifts, their shares and approval
//   Footer:  "Erstellt mit Tippy am …"
// Long tables continue on another page.

import { euro } from '../money.js';
import { addDays, deDate, iso, isoWeek } from '../dates.js';
import { createPdf, fitText, textWidth } from './pdf-writer.js';

const MM = 72 / 25.4;
const L = 18;
const W = 174;
const PAGE_END = 280;
const GREY_HEAD = '#F1F1F1';
const LINE = { width: 0.3 * MM, color: '#000000' };
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const pad = (n) => String(n).padStart(2, '0');
const amount = (cents) => (cents === null || cents === undefined ? '–' : euro(cents));

// -> the PDF's bytes.
//   days: weekTotals' 7 days ({ date, r }); week: computeWeekPeople's result, people already in
//   the order to print; prep: [{ label, id, cents, approved }]; nameOf(id) gives a name;
//   ended: the week is over; now is when the PDF is made.
export function buildWeekPdf({ monday, ended, company, days, week, prep, nameOf, now = new Date() }) {
  const pdf = createPdf();
  let page = pdf.addPage();
  let y = 18;

  const text = (x, top, value, { size = 10, bold = false, color = '#000000', align = 'left' } = {}) => {
    page.text(x * MM, top * MM, value, { size, bold, color, align });
  };
  const cell = (x, top, w, h, value, { fill, bold = false, size = 10, align = 'left' } = {}) => {
    if (fill) page.rect(x * MM, top * MM, w * MM, h * MM, fill);
    page.strokeRect(x * MM, top * MM, w * MM, h * MM, LINE);
    if (value === undefined || value === '') return;
    const fitted = fitText(value, (w - 3) * MM, size, bold);
    if (align === 'right') text(x + w - 1.5, top + h / 2 + 1.2, fitted, { size, bold, align: 'right' });
    else text(x + 1.5, top + h / 2 + 1.2, fitted, { size, bold });
  };
  const ensure = (h) => {
    if (y + h > PAGE_END) {
      page = pdf.addPage();
      y = 18;
    }
  };
  // A row of cells: cols [{ w, value, align }], shared options.
  const row = (cols, h, opts = {}) => {
    ensure(h);
    let x = L;
    cols.forEach(({ w, value, align, bold }) => {
      cell(x, y, w, h, value, { ...opts, align: align || opts.align, bold: bold ?? opts.bold });
      x += w;
    });
    y += h;
  };

  // ---------- Header
  const sunday = addDays(monday, 6);
  const lw = 74;
  const rw = W - lw;
  cell(L, y, lw, 9, company.name || '');
  cell(L, y + 9, lw, 9, company.street || '');
  cell(L, y + 18, lw, 9, [company.postcode, company.city].filter(Boolean).join(' '));
  cell(L + lw, y, rw, 18, '');
  const TITLE = 'Wochenübersicht Trinkgeld';
  const titleSize = [15, 14, 13, 12].find((size) => textWidth(TITLE, size) <= (rw - 6) * MM) || 12;
  text(L + lw + 3, y + 11, fitText(TITLE, (rw - 6) * MM, titleSize), { size: titleSize });
  cell(L + lw, y + 18, rw - 60, 9, `KW ${isoWeek(monday)}`, { bold: true });
  cell(L + W - 60, y + 18, 60, 9, `${deDate(monday)} – ${deDate(sunday)}`, { bold: true });
  y += 27 + 6;
  if (!ended) {
    text(L, y, `Stand: ${deDate(iso(now))} – Woche läuft noch, Beträge können sich ändern.`, { size: 9, color: '#555555' });
    y += 4;
  }
  y += 4;

  // ---------- Tage
  const t = [50, 42, 42, 40];
  text(L, y, 'Tage', { bold: true });
  y += 3;
  row([
    { w: t[0], value: 'Tag' },
    { w: t[1], value: 'LS Pay Trinkgeld', align: 'right' },
    { w: t[2], value: 'Ausgezahlt', align: 'right' },
    { w: t[3], value: 'Prep-Topf', align: 'right' },
  ], 8, { bold: true, fill: GREY_HEAD });
  days.forEach(({ date, r }, i) => {
    row([
      { w: t[0], value: `${WEEKDAYS[i]} ${deDate(date)}` },
      { w: t[1], value: amount(r && r.total), align: 'right' },
      { w: t[2], value: amount(r && r.paid), align: 'right' },
      { w: t[3], value: amount(r && r.prep), align: 'right' },
    ], 7);
  });
  row([
    { w: t[0], value: 'SUMME', align: 'right' },
    { w: t[1], value: euro(week.tips), align: 'right' },
    { w: t[2], value: euro(week.paid), align: 'right' },
    { w: t[3], value: euro(week.prep), align: 'right' },
  ], 8, { bold: true });
  y += 8;

  // ---------- Trinkgeld pro Person
  const name = 26;
  const dayW = 14;
  const prepW = 16;
  const totalW = 18;
  const okW = W - name - dayW * 7 - prepW - totalW;
  const personCols = (first, perDay, prepValue, total, ok) => [
    { w: name, value: first },
    ...perDay.map((value) => ({ w: dayW, value, align: 'right' })),
    { w: prepW, value: prepValue, align: 'right' },
    { w: totalW, value: total, align: 'right', bold: true },
    { w: okW, value: ok },
  ];
  ensure(20);
  text(L, y, 'Trinkgeld pro Person', { bold: true });
  y += 3;
  row(personCols('Name', WEEKDAYS, 'Prep', 'Gesamt', 'Bestätigt'), 8, { bold: true, fill: GREY_HEAD, size: 8 });
  week.people.forEach((p) => {
    const ok = p.worked ? `${p.approved}/${p.worked} Tage` : '';
    row(personCols(nameOf(p.id), p.days.map((c) => (c === null ? '' : euro(c))), p.prep ? euro(p.prep) : '', euro(p.total), ok), 8, { size: 8 });
  });
  if (week.unassigned) {
    row([
      { w: W - totalW - okW, value: 'Nicht zugeordnet' },
      { w: totalW, value: euro(week.unassigned), align: 'right', bold: true },
      { w: okW, value: '' },
    ], 8, { size: 8 });
  }
  row([
    { w: W - totalW - okW, value: 'SUMME', align: 'right' },
    { w: totalW, value: euro(week.tips), align: 'right' },
    { w: okW, value: '' },
  ], 8, { bold: true, size: 8 });
  y += 8;

  // ---------- Prep-Topf
  const pr = [30, W - 30 - 30 - 40, 30, 40];
  ensure(30);
  text(L, y, 'Prep-Topf', { bold: true });
  y += 3;
  row([
    { w: pr[0], value: 'Schicht' },
    { w: pr[1], value: 'Name' },
    { w: pr[2], value: 'Betrag', align: 'right' },
    { w: pr[3], value: 'Bestätigt' },
  ], 8, { bold: true, fill: GREY_HEAD });
  prep.forEach((s) => {
    row([
      { w: pr[0], value: s.label },
      { w: pr[1], value: s.id ? nameOf(s.id) : 'Niemand' },
      { w: pr[2], value: s.id ? euro(s.cents) : '–', align: 'right', bold: true },
      { w: pr[3], value: s.id ? (s.approved ? 'Bestätigt' : 'Offen') : '' },
    ], 8);
  });

  // ---------- Footer
  ensure(14);
  y = Math.max(y + 12, 272);
  text(L, y, `Erstellt mit Tippy am ${deDate(iso(now))} um ${pad(now.getHours())}:${pad(now.getMinutes())}`, { size: 8, color: '#555555' });

  return { bytes: pdf.toBytes(), pages: pdf.pageCount() };
}
