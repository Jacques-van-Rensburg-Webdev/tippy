# Tippy

Splits the bar's card tips between the staff on shift. Log the LS Pay running total whenever
someone starts or leaves, and once more at closing; Tippy splits what was added since the last log:

1. **Glasses runner:** 10 % of it (if one is on).
2. **Prep pot:** 5 % of the rest, paid out weekly to the Monday and Friday prep people.
3. **Bar:** the remainder, split evenly in cents between the bar staff ticked for that log.

Each person approves their amount on **Payout**, and the day's payout can be saved as a German
PDF ("Auszahlung Trinkgeld von Kartenzahlung") with your company details. The percentages can be
changed in **Staff → Tip rules**; a day keeps the rules it started with.

Built from `docs/design/trinkgeld-split.html` (the reference design, made as "Trinkgeld Split").
Plain HTML, CSS and JS: no build step, no dependencies.

## Run it

Serve the folder so the ES modules load:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 and use your browser's device toolbar at 390 × 844.

**Your data stays on the device** you use Tippy on (the browser's localStorage). Use one phone
or tablet for the bar; clearing the browser's website data deletes it.

## Put it on your phone

**Link:** https://jacques-van-rensburg-webdev.github.io/tippy/

- **iPhone (Safari):** open the link → tap **Share** → **Add to Home Screen** → **Add**. Open Tippy from the home-screen icon.
- **Android (Chrome):** open the link → tap **⋮** → **Install app** (or **Add to Home screen**).

It opens full screen on Today and works offline. When the phone is online, it picks up a new
version the next time it opens.

**Your data:** saved on that phone only, in the home-screen app (on iPhone it's separate from
Safari tabs, so use the icon). Nothing is sent anywhere: the link only serves the app's code.
There's no backup yet; deleting the app or clearing website data deletes the logs.

When adding a file to the app, also add it to `APP_FILES` in `sw.js`.

## Tests

```
npm test
```

Runs the split, money and date tests with Node's built-in test runner (no packages).

## Tabs

- **Today:** the LS Pay total so far, who's on shift, **Log tips…** and the day's logs (tap a log to edit or delete it).
- **Payout:** each person's amount, how it was worked out, Approve, and **Save as PDF…** (the Share sheet on a phone, a download on a computer).
- **Week:** the week's tips and prep pot, and the Monday / Friday prep shifts with their share and approval once the week has ended.
- **Staff:** the team (Bar, Glasses runners, No longer here), the usual prep people, tip rules and company details.

## Grid

- Rules: `design-grid-rules.md`. Tippy matches its reference design exactly (agreed in the plan), so its sizes come from the reference; all of them are named tokens in `css/tokens.css`.
- Overlay: press **G** in the browser, or add `?grid` to the URL.

## Structure

```
index.html                 the page: header (safe area), window column, taskbar, dialog, toast
manifest.webmanifest       home-screen install: name, icons, opens on Today
sw.js                      offline: app files network first, the font saved
css/tokens.css             every value: the reference's colours, sizes, spacing and text sizes
css/styles.css             reset, shell, grid, grid overlay
css/win95.css              windows, title bars, buttons, fields, lists, tree, taskbar, overlay
css/screens.css            list columns and the screens' small layouts
js/app.js                  entry: tabs (#/today, #/payout, #/week, #/staff) and rendering
js/actions.js              what the buttons do (staff-actions.js for Staff)
js/split.js                the tip split (no HTML)
js/store.js, js/data.js    saved data on this device, and reading / saving it
js/ui-state.js             what's shown now (tab, day, week, dialog)
js/ui.js, js/esc.js        windows, icons, date nav, toast; HTML escaping
js/money.js, js/dates.js   cents ↔ "42,45"; dates, times, ISO week numbers
js/views/                  today, payout, week, staff, log-dialog
js/pdf/                    the payout PDF (made in the app, no library) and sharing it
js/grid-overlay.js         G-key grid overlay
assets/images/             icon.svg (+ maskable source) and the PNG icons
tests/                     node --test suites
docs/design/               the reference design
```
