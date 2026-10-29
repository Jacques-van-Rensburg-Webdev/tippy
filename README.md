# Tippy

_One line on what this app does._

## Run it

No build step. Open `index.html` in a browser, or serve the folder so ES modules load:

```
npx serve .
```

or

```
python3 -m http.server
```

Then open http://localhost:3000 (or :8000) and use your browser's device toolbar at 390 × 844.

## Grid

- Rules: `design-grid-rules.md`
- Reference image: `docs/grid-reference.svg` (or `.png`)
- Overlay: press **G** in the browser, or add `?grid` to the URL

Reference positions as **Zone → Columns → Spacing → Size**, for example:
*"Content, columns 1–2, at 96: product tile, 192pt tall."*

## Structure

```
CLAUDE.md               rules for Claude
design-grid-rules.md    layout and spacing rules
index.html              entry page (Header, Content, Tab bar)
css/tokens.css          all design values
css/styles.css          reset, shell, grid, components, overlay
js/app.js               entry script
js/grid-overlay.js      G-key grid overlay
assets/images/          images and icons
docs/                   grid reference image
task/todo.md            plan, checklist and review
```
