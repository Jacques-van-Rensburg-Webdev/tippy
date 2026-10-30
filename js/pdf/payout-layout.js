// The German payout PDF (the reference's layout, in mm on A4). No HTML here.
//   Header:  company name / street / postcode + city · "Auszahlung Trinkgeld von Kartenzahlung"
//            · Datum / Quittungsnummer and the date
//   Reports: each LS Pay log (Bericht · Uhrzeit · EUR,Cent) and SUMME
//   Payout:  "Trinkgeld wie folgt ausgezahlt an:" Bar, Gläser and Prep-Topf rows (Name und
//            Schicht · Berechnung · Betrag · Bestätigt / erhalten), Nicht zugeordnet, SUMME
//   Footer:  "Erstellt mit Tippy am …" and the "ausgezahlt von" signature line
// Long tables continue on another page.

import { computeDay } from '../split.js';
import { euro } from '../money.js';
import { deDate, iso, timeOf } from '../dates.js';
import { createPdf, fitText, textWidth } from './pdf-writer.js';

const MM = 72 / 25.4;
const L = 18;
const W = 174;
const PAGE_END = 280;
const GREY_HEAD = '#F1F1F1';
const GREY_SECTION = '#FAFAFA';
const LINE = { width: 0.3 * MM, color: '#000000' };

const pad = (n) => String(n).padStart(2, '0');

// -> the PDF's bytes. nameOf(id) gives a person's name; now is when the PDF is made.
export function buildPayoutPdf({ date, company, logs, rules, approvals, nameOf, now = new Date() }) {
  const r = computeDay(logs, rules);
  const pdf = createPdf();
  let page = pdf.addPage();
  let y = 18;

  const text = (x, top, value, { size = 10, bold = false, color = '#000000', align = 'left' } = {}) => {
    page.text(x * MM, top * MM, value, { size, bold, color, align });
  };
  // A bordered table cell with optional grey fill and text (cut to fit), like jsPDF's cell.
  const cell = (x, top, w, h, value, { fill, bold = false, size = 10, align = 'left' } = {}) => {
    if (fill) page.rect(x * MM, top * MM, w * MM, h * MM, fill);
    page.strokeRect(x * MM, top * MM, w * MM, h * MM, LINE);
    if (value === undefined || value === '') return;
    const fitted = fitText(value, (w - 4) * MM, size, bold);
    if (align === 'right') text(x + w - 2, top + h / 2 + 1.3, fitted, { size, bold, align: 'right' });
    else text(x + 2, top + h / 2 + 1.3, fitted, { size, bold });
  };
  const ensure = (h) => {
    if (y + h > PAGE_END) {
      page = pdf.addPage();
      y = 18;
    }
  };

  // ---------- Header
  const lw = 74;
  const rw = W - lw;
  cell(L, y, lw, 9, company.name || '');
  cell(L, y + 9, lw, 9, company.street || '');
  cell(L, y + 18, lw, 9, [company.postcode, company.city].filter(Boolean).join(' '));
  cell(L + lw, y, rw, 18, '');
  // The title at 15pt, a little smaller if it doesn't fit its box.
  const TITLE = 'Auszahlung Trinkgeld von Kartenzahlung';
  const titleSize = [15, 14, 13, 12].find((size) => textWidth(TITLE, size) <= (rw - 6) * MM) || 12;
  text(L + lw + 3, y + 11, fitText(TITLE, (rw - 6) * MM, titleSize), { size: titleSize });
  cell(L + lw, y + 18, rw - 40, 9, 'Datum / Quittungsnummer');
  cell(L + W - 40, y + 18, 40, 9, deDate(date), { bold: true });
  y += 27 + 8;

  // ---------- LS Pay reports
  const c1 = W - 30 - 40;
  cell(L, y, c1, 8, 'LS Pay Trinkgeld laut Bericht', { bold: true, fill: GREY_HEAD });
  cell(L + c1, y, 30, 8, 'Uhrzeit', { bold: true, fill: GREY_HEAD });
  cell(L + c1 + 30, y, 40, 8, 'EUR,Cent', { bold: true, fill: GREY_HEAD, align: 'right' });
  y += 8;
  logs.forEach((l) => {
    ensure(8);
    cell(L, y, c1, 8, 'Bericht');
    cell(L + c1, y, 30, 8, l.time);
    cell(L + c1 + 30, y, 40, 8, euro(l.total), { align: 'right' });
    y += 8;
  });
  ensure(8);
  cell(L, y, c1 + 30, 8, 'SUMME', { bold: true, align: 'right' });
  cell(L + c1 + 30, y, 40, 8, euro(r.total), { bold: true, align: 'right' });
  y += 8 + 8;

  // ---------- Payout
  ensure(20);
  text(L, y, 'Trinkgeld wie folgt ausgezahlt an:', { bold: true });
  y += 3;
  const a = 48;
  const c = 26;
  const d = 40;
  const b = W - a - c - d;
  cell(L, y, a, 8, 'Name und Schicht', { bold: true, fill: GREY_HEAD });
  cell(L + a, y, b, 8, 'Berechnung', { bold: true, fill: GREY_HEAD });
  cell(L + a + b, y, c, 8, 'Betrag', { bold: true, fill: GREY_HEAD, align: 'right' });
  cell(L + a + b + c, y, d, 8, 'Bestätigt / erhalten', { bold: true, fill: GREY_HEAD });
  y += 8;
  const section = (title) => {
    ensure(7);
    cell(L, y, W, 6, title, { bold: true, size: 8, fill: GREY_SECTION });
    y += 6;
  };
  // A row with a prep cut is taller: the Berechnung gets a second line "vor Prep … − Prep …".
  const row = (p) => {
    const h = p.prepCut ? 13 : 9;
    ensure(h);
    const ap = approvals[p.id];
    const ok = ap && ap.cents === p.total;
    const parts = p.parts.map((pt) => (pt.kind === 'glasses' ? `${pt.pct} % von ${euro(pt.of)}` : euro(pt.cents))).join(' + ');
    cell(L, y, a, h, `${nameOf(p.id)}  ${p.from ? p.from : 'Beginn'}–${p.to || ''}`);
    if (p.prepCut) {
      cell(L + a, y, b, h, '');
      text(L + a + 2, y + 5, fitText(parts, (b - 4) * MM, 10));
      text(L + a + 2, y + 10, fitText(`vor Prep ${euro(p.beforePrep)} − Prep ${euro(p.prepCut)}`, (b - 4) * MM, 8), { size: 8 });
    } else {
      cell(L + a, y, b, h, parts);
    }
    cell(L + a + b, y, c, h, euro(p.total), { bold: true, align: 'right' });
    cell(L + a + b + c, y, d, h, ok ? `Bestätigt ${timeOf(ap.at)}` : 'Offen');
    y += h;
  };
  const bar = r.people.filter((p) => p.bar);
  const glasses = r.people.filter((p) => !p.bar && p.glasses);
  if (bar.length) { section('BAR'); bar.forEach(row); }
  if (glasses.length) { section('GLÄSER'); glasses.forEach(row); }
  section('PREP-TOPF');
  ensure(9);
  cell(L, y, a, 9, 'Rücklage Prep');
  cell(L + a, y, b, 9, `${rules.prepPct} % nach Gläsern`);
  cell(L + a + b, y, c, 9, euro(r.prep), { bold: true, align: 'right' });
  cell(L + a + b + c, y, d, 9, 'Wöchentlich');
  y += 9;
  if (r.unassigned) {
    ensure(9);
    cell(L, y, a + b, 9, 'Nicht zugeordnet');
    cell(L + a + b, y, c, 9, euro(r.unassigned), { bold: true, align: 'right' });
    cell(L + a + b + c, y, d, 9, '');
    y += 9;
  }
  const done = r.people.filter((p) => approvals[p.id] && approvals[p.id].cents === p.total).length;
  ensure(9);
  cell(L, y, a + b, 9, 'SUMME', { bold: true, align: 'right' });
  cell(L + a + b, y, c, 9, euro(r.total), { bold: true, align: 'right' });
  cell(L + a + b + c, y, d, 9, `${done} von ${r.people.length} bestätigt`);
  y += 9;

  // ---------- Footer: made with, and the signature line
  ensure(28);
  y = Math.max(y + 20, 262);
  text(L, y, `Erstellt mit Tippy am ${deDate(iso(now))} um ${pad(now.getHours())}:${pad(now.getMinutes())}`, { size: 8, color: '#555555' });
  page.line((L + W - 80) * MM, (y - 2) * MM, (L + W) * MM, (y - 2) * MM, LINE);
  text(L + W - 80, y + 3, 'ausgezahlt von');

  return { bytes: pdf.toBytes(), pages: pdf.pageCount() };
}
