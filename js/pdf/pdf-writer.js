// A small PDF builder (the same as Shifty's), no library: A4 pages with text (Helvetica,
// Helvetica-Bold), lines, and filled or outlined boxes. No HTML here.
// Coordinates are in points from the page's top-left corner.
// Text uses the PDF's standard Western encoding (WinAnsi), so €, ä, ö, ü, ß and – print as
// themselves; anything it doesn't have becomes "?".

export const PAGE = { width: 595.28, height: 841.89 }; // A4

// Unicode -> WinAnsi for the characters outside Latin-1 that it has.
const WIN_ANSI = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
  0x2212: 0x2d, // minus sign -> hyphen
  0x2248: 0x7e, // ≈ -> ~
};

// A string as one byte per character (0–255), escaped for a PDF string literal.
function pdfString(text) {
  let out = '';
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    let byte = WIN_ANSI[code] ?? (code < 0x100 && !(code >= 0x80 && code < 0xa0) ? code : 0x3f);
    if (byte < 0x20) byte = 0x20;
    const c = String.fromCharCode(byte);
    out += c === '\\' || c === '(' || c === ')' ? `\\${c}` : c;
  }
  return `(${out})`;
}

const num = (n) => (Math.round(n * 100) / 100).toString();

// '#d61c1c' -> '0.84 0.11 0.11'
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => num(v / 255)).join(' ');
}

// Helvetica widths (per 1000 units) for the printable ASCII range, for measuring text.
const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Width of `text` in points at `size` (characters outside ASCII count as an "n").
export function textWidth(text, size, bold = false) {
  const table = bold ? BOLD : HELVETICA;
  let units = 0;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    units += table[code - 32] ?? 556;
  }
  return (units * size) / 1000;
}

// `text` cut down to fit `width` points, ending in "…" if it had to be shortened.
export function fitText(text, width, size, bold = false) {
  const full = String(text);
  if (textWidth(full, size, bold) <= width) return full;
  let cut = full;
  while (cut && textWidth(`${cut}…`, size, bold) > width) cut = cut.slice(0, -1);
  return cut ? `${cut.trimEnd()}…` : '';
}

export function createPdf() {
  const pages = [];

  function addPage() {
    const ops = [];
    const y = (top) => PAGE.height - top;
    const page = {
      // Text with its baseline at `top`. align: 'left' | 'right' (x is then the right edge).
      text(x, top, text, { size = 10, bold = false, color = '#000000', align = 'left' } = {}) {
        const left = align === 'right' ? x - textWidth(text, size, bold) : x;
        ops.push(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${rgb(color)} rg ${num(left)} ${num(y(top))} Td ${pdfString(text)} Tj ET`);
      },
      line(x1, top1, x2, top2, { width = 0.5, color = '#000000' } = {}) {
        ops.push(`${num(width)} w ${rgb(color)} RG ${num(x1)} ${num(y(top1))} m ${num(x2)} ${num(y(top2))} l S`);
      },
      rect(x, top, w, h, color) {
        ops.push(`${rgb(color)} rg ${num(x)} ${num(y(top + h))} ${num(w)} ${num(h)} re f`);
      },
      // An outlined box.
      strokeRect(x, top, w, h, { width = 0.5, color = '#000000' } = {}) {
        ops.push(`${num(width)} w ${rgb(color)} RG ${num(x)} ${num(y(top + h))} ${num(w)} ${num(h)} re S`);
      },
    };
    pages.push(ops);
    return page;
  }

  // The finished file as bytes.
  function toBytes() {
    const objects = []; // object bodies; object n is objects[n - 1]
    const add = (body) => objects.push(body) && objects.length;
    const catalog = add(null);
    const pagesObj = add(null);
    const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = pages.map((ops) => {
      const content = ops.join('\n');
      const stream = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] `
        + `/Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

    // Every character is one byte (see pdfString), so string lengths are byte offsets.
    let file = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const offsets = objects.map((body, i) => {
      const at = file.length;
      file += `${i + 1} 0 obj\n${body}\nendobj\n`;
      return at;
    });
    const xref = file.length;
    file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    file += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    file += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

    const bytes = new Uint8Array(file.length);
    for (let i = 0; i < file.length; i += 1) bytes[i] = file.charCodeAt(i) & 0xff;
    return bytes;
  }

  return { addPage, toBytes, pageCount: () => pages.length };
}
