// What Staff's buttons do: add, edit, remove and bring back people; open folders; tip rules;
// company details.

import * as store from './store.js';
import { genId, saveRoster, saveSettings } from './data.js';
import { ui } from './ui-state.js';
import { showToast } from './ui.js';

const value = (id) => document.getElementById(id).value;
const updatePerson = (id, change) => saveRoster(store.roster().map((p) => (p.id === id ? { ...p, ...change } : p)));
const percent = (text) => parseFloat(String(text).replace(',', '.'));

export const STAFF_ACTIONS = {
  toggle: (el) => { ui.open[el.dataset.key] = !ui.open[el.dataset.key]; },
  'staff-add': () => {
    const field = document.getElementById('new-name');
    const name = field.value.trim();
    const role = value('new-role');
    if (!name) { field.focus(); return; }
    field.value = '';
    ui.open[role === 'bar' ? 'bar' : 'glasses'] = true;
    saveRoster([...store.roster(), { id: genId(), name, role, active: true }]);
    showToast(`${name} added.`);
  },
  'staff-edit': (el) => {
    ui.editStaff = el.dataset.id;
    setTimeout(() => document.getElementById('edit-name')?.focus(), 0);
  },
  'staff-cancel': () => { ui.editStaff = null; },
  'staff-save': (el) => {
    const name = value('edit-name').trim();
    if (!name) { document.getElementById('edit-name').focus(); return; }
    ui.editStaff = null;
    updatePerson(el.dataset.id, { name, role: value('edit-role') });
    showToast('Saved.');
  },
  'staff-remove': (el) => {
    ui.editStaff = null;
    ui.open.former = true;
    updatePerson(el.dataset.id, { active: false });
    showToast('Moved to “No longer here”.');
  },
  'staff-back': (el) => { updatePerson(el.dataset.id, { active: true }); showToast('Back on the team.'); },
  'rules-save': () => {
    const glasses = percent(value('rule-glasses'));
    const prep = percent(value('rule-prep'));
    if (!(glasses >= 0 && glasses <= 100) || !(prep >= 0 && prep <= 100)) { showToast('Enter percentages between 0 and 100.'); return; }
    saveSettings({ glassesPct: glasses, prepPct: prep });
    showToast('Tip rules saved.');
  },
  'company-save': () => {
    saveSettings({ company: { name: value('co-name').trim(), street: value('co-street').trim(), postcode: value('co-postcode').trim(), city: value('co-city').trim() } });
    showToast('Company details saved.');
  },
};
