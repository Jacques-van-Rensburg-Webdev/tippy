// Shared HTML helpers: escaping, the reference's icons, windows, date nav and the toast.
// Buttons carry data-act (handled in js/actions.js).

import { esc } from './esc.js';
import { todayIso } from './dates.js';

export { esc };

export const ICON = {
  clock: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="#FBF6EE" stroke="#1B1B1B"/><path d="M8 4v4l3 2" stroke="#C9302C" stroke-width="1.5" fill="none"/></svg>',
  cash: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="4" width="14" height="9" fill="#2E9E4F" stroke="#1B1B1B"/><circle cx="8" cy="8.5" r="2" fill="#F6B70F" stroke="#1B1B1B"/></svg>',
  cal: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3" width="13" height="11.5" fill="#FBF6EE" stroke="#1B1B1B"/><rect x="1.5" y="3" width="13" height="3" fill="#C9302C" stroke="#1B1B1B"/><rect x="4" y="8" width="2" height="2" fill="#1B1B1B"/><rect x="9" y="10.5" width="2" height="2" fill="#F6B70F" stroke="#1B1B1B" stroke-width="0.5"/></svg>',
  staff: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3" fill="#2C7FB8" stroke="#1B1B1B"/><path d="M2 15c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5z" fill="#0F3D45" stroke="#1B1B1B"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#2C7FB8" stroke="#1B1B1B"/><rect x="9" y="8" width="2" height="7" fill="#fff"/><rect x="9" y="5" width="2" height="2" fill="#fff"/></svg>',
  tick: '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6l3 3 6-7" fill="none" stroke="#1E6B35" stroke-width="2.6"/></svg>',
  folder: (color) => `<svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 3h6l2 2h10v10H1z" fill="${color}" stroke="#1B1B1B"/></svg>`,
  pdf: '<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#1B1B1B"/><path d="M10 1v3h3" fill="none" stroke="#1B1B1B"/><rect x="5" y="9" width="6" height="3" fill="#C9302C"/></svg>',
};

// A window: title bar (red, or grey), body, optional status line and close button.
export function win(title, body, { label, grey = false, icon = '', close = '', status = '' } = {}) {
  return `<section class="win" aria-label="${esc(label || title)}">`
    + `<div class="title${grey ? ' grey' : ''}">${icon}<h2 class="title-text">${esc(title)}</h2>`
    + (close ? `<button type="button" class="tbtn" data-act="${close}" aria-label="Close">×</button>` : '')
    + `</div><div class="body">${body}</div>`
    + (status ? `<div class="status-line">${status}</div>` : '')
    + '</section>';
}

// One device only (task/todo.md, decision 1).
export const syncLine = () => '<span class="small sync-local">Saved on this device only</span>';

export function dateNav(date) {
  const isToday = date === todayIso();
  return '<div class="row">'
    + '<button type="button" class="btn sm" data-act="day" data-n="-1" aria-label="Previous day">‹</button>'
    + `<input class="input date-picker grow" type="date" data-act="date-select" value="${esc(date)}" aria-label="Choose date">`
    + '<button type="button" class="btn sm" data-act="day" data-n="1" aria-label="Next day">›</button>'
    + (isToday ? '' : '<button type="button" class="btn sm" data-act="day-today">Today</button>')
    + '</div>';
}

let toastTimer = null;
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}
