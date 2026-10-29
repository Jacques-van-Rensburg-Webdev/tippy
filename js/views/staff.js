// Staff: add someone; the folder tree (Bar, Glasses runners, Prep shifts, No longer here) with
// edit / remove / bring back; tip rules; company details for the PDF.

import * as store from '../store.js';
import { activeOf } from '../data.js';
import { ui } from '../ui-state.js';
import { ICON, esc, win } from '../ui.js';

const node = (key, label, count, color) => `<button type="button" class="node" data-act="toggle" data-key="${key}" aria-expanded="${Boolean(ui.open[key])}">`
  + `<span class="pm" aria-hidden="true">${ui.open[key] ? '−' : '+'}</span>${ICON.folder(color)}<b>${label}</b>`
  + (count !== null ? `<span class="muted">(${count})</span>` : '') + '</button>';

function personRow(p, former, s) {
  if (ui.editStaff === p.id) {
    return '<div class="staff-edit">'
      + `<label class="lab"><span class="small">Name</span><input class="input" id="edit-name" data-keep value="${esc(p.name)}"></label>`
      + '<label class="lab"><span class="small">Role</span><select class="input" id="edit-role" data-keep>'
      + `<option value="bar"${p.role === 'bar' ? ' selected' : ''}>Bar</option><option value="glasses"${p.role === 'glasses' ? ' selected' : ''}>Glasses runner</option></select></label>`
      + '<div class="row wrap">'
      + `<button type="button" class="btn primary sm" data-act="staff-save" data-id="${esc(p.id)}">Save</button>`
      + '<button type="button" class="btn sm" data-act="staff-cancel">Cancel</button>'
      + (former ? '' : `<button type="button" class="btn sm" data-act="staff-remove" data-id="${esc(p.id)}">No longer here</button>`)
      + '</div></div>';
  }
  const tags = (s.prepMon === p.id ? ' <span class="tag">Prep Mon</span>' : '') + (s.prepFri === p.id ? ' <span class="tag">Prep Fri</span>' : '');
  return `<div class="person"><span class="person-name">${esc(p.name)}${tags}</span><span></span>`
    + (former
      ? `<button type="button" class="btn sm" data-act="staff-back" data-id="${esc(p.id)}">Bring back</button>`
      : `<button type="button" class="btn sm" data-act="staff-edit" data-id="${esc(p.id)}">Edit…</button>`)
    + '</div>';
}

const kids = (list, former, emptyText, s) => `<div class="kids">${list.length
  ? list.map((p) => personRow(p, former, s)).join('')
  : `<span class="small muted kids-empty">${emptyText}</span>`}</div>`;

function prepFolder(bar, s) {
  const options = (value) => '<option value="">Nobody</option>'
    + bar.map((p) => `<option value="${esc(p.id)}"${p.id === value ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  return '<div class="kids prep-kids">'
    + `<span class="xs muted">Done by bar staff on Monday and Friday. Earns ${esc(s.prepPct)}% of the week’s tips (after glasses). These are the usual people; change a single week on the Week tab.</span>`
    + `<label class="lab"><span class="small b">Monday</span><select class="input" id="prep-mon-default" data-act="prep-default" data-key="prepMon">${options(s.prepMon)}</select></label>`
    + `<label class="lab"><span class="small b">Friday</span><select class="input" id="prep-fri-default" data-act="prep-default" data-key="prepFri">${options(s.prepFri)}</select></label>`
    + '</div>';
}

const foldOut = (key, summary) => `<button type="button" class="node flush" data-act="toggle" data-key="${key}" aria-expanded="${Boolean(ui.open[key])}">`
  + `<span class="pm" aria-hidden="true">${ui.open[key] ? '−' : '+'}</span><span class="small">${summary}</span></button>`;

function rules(s) {
  return '<fieldset class="group"><legend>Tip rules</legend>'
    + foldOut('rules', `Glasses ${esc(s.glassesPct)}% of their shift · Prep ${esc(s.prepPct)}% of the rest`)
    + (ui.open.rules ? '<div class="stack gap-10">'
      + `<label class="lab"><span class="small">Glasses share of tips logged during their shift (%)</span><input class="input" id="rule-glasses" data-keep inputmode="decimal" value="${esc(s.glassesPct)}"></label>`
      + `<label class="lab"><span class="small">Prep share of what’s left after glasses (%)</span><input class="input" id="rule-prep" data-keep inputmode="decimal" value="${esc(s.prepPct)}"></label>`
      + '<span class="xs muted">New percentages apply from the next day that has no logs yet. Days already started keep their rules.</span>'
      + '<div class="row end"><button type="button" class="btn primary sm" data-act="rules-save">Save rules</button></div></div>' : '')
    + '</fieldset>';
}

function company(s) {
  const c = s.company;
  const summary = [c.name, c.street, [c.postcode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'Not filled in yet';
  return '<fieldset class="group"><legend>Company details</legend>'
    + foldOut('company', esc(summary))
    + (ui.open.company ? '<div class="stack gap-10"><span class="xs muted">Printed at the top of every payout PDF.</span>'
      + `<label class="lab"><span class="small">Company name</span><input class="input" id="co-name" data-keep value="${esc(c.name)}"></label>`
      + `<label class="lab"><span class="small">Street and number</span><input class="input" id="co-street" data-keep value="${esc(c.street)}"></label>`
      + '<div class="cols-address">'
      + `<label class="lab"><span class="small">Postcode</span><input class="input" id="co-postcode" data-keep inputmode="numeric" value="${esc(c.postcode)}"></label>`
      + `<label class="lab"><span class="small">City</span><input class="input" id="co-city" data-keep value="${esc(c.city)}"></label></div>`
      + '<div class="row end"><button type="button" class="btn primary sm" data-act="company-save">Save details</button></div></div>' : '')
    + '</fieldset>';
}

export function viewStaff() {
  const s = store.settings();
  const bar = activeOf('bar');
  const glasses = activeOf('glasses');
  const former = store.roster().filter((p) => p.active === false);
  const body = '<label class="lab" for="new-name"><span>Add someone:</span></label>'
    + '<div class="cols-add">'
    + '<input class="input" id="new-name" data-keep placeholder="First name" autocomplete="off">'
    + '<select class="input" id="new-role" data-keep aria-label="Role"><option value="bar">Bar</option><option value="glasses">Glasses</option></select>'
    + '<button type="button" class="btn primary" data-act="staff-add">Add</button></div>'
    + '<div class="sunken tree">'
    + node('bar', 'Bar', bar.length, '#C9302C') + (ui.open.bar ? kids(bar, false, 'No bar staff yet. Add them above.', s) : '')
    + node('glasses', 'Glasses runners', glasses.length, '#2C7FB8') + (ui.open.glasses ? kids(glasses, false, 'No glasses runners yet. Add them above with the Glasses role.', s) : '')
    + node('prep', 'Prep shifts', null, '#F6B70F') + (ui.open.prep ? prepFolder(bar, s) : '')
    + node('former', 'No longer here', former.length, '#E9DFCF') + (ui.open.former ? kids(former, true, 'Nobody here. People you remove stay on past payouts.', s) : '')
    + '</div>'
    + rules(s)
    + company(s);
  return win(`Staff — ${s.company.name || 'Your company'}`, body, {
    icon: ICON.staff,
    status: `${bar.length} bar · ${glasses.length} glasses · ${former.length} former`,
  });
}
