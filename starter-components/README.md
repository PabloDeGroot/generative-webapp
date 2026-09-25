# Starter components

Hand-defined components that set a site's identity before (or instead of) LLM seeding. Each toolkit
has its own folder: `starter-components/<toolkit>/` (for example `starter-components/travel/`).

## Workflow

1. Define the components that should shape the site's look (header, hero, cards, buttons…).
2. `npm run components:install -- <toolkit>` puts them in the toolkit's library.
3. Optionally let the LLM fill the gaps: `npm run call -- initializeComponents '{"toolkit":"<toolkit>","prompt":"..."}'`.
   The initializer reads the existing library first, reuses what's there and matches its visual language,
   so your starters anchor everything it adds.

To start from scratch, clear the library first:
`npm run call -- resetComponents '{"toolkit":"<toolkit>","confirm":"RESET"}'`.

Add `--emulator` to any of these to work against the local emulators instead of production.

## Two kinds of component

Every component needs `<id>.json`. The id must be a valid custom element name (lowercase, at least
one hyphen) and the file name must match it.

**Hand-written** — `<id>.json` + `<id>.js`. The JavaScript is used as-is: a class extending
`HTMLElement`, registered with `customElements.define('<id>', …)`, rendering into its shadow DOM with
Tailwind classes. Twind is wired in automatically on install (don't import it yourself). Install
rejects code that stores a prop on a built-in element property (`this.title = …`, `this.id = …`):
keep props in private fields such as `this._title`.

**Spec only** — just `<id>.json`. The code is generated from your spec by the codegen and evaluator
phases; the LLM designer is skipped, so structure, props and styling are exactly what you wrote.

## `<id>.json`

Only `id` and `shortDesc` are required; everything else defaults to empty. The page designer and
other components see `shortDesc`, `role`, `props`, `slots` and `styling`, so describe them well.

```json
{
  "prompt": "Site header shown at the top of every page.",
  "id": "g-site-header",
  "shortDesc": "Top bar with the site name on the left and a slot for navigation links on the right.",
  "role": "layout",
  "props": [
    { "name": "site-name", "type": "string", "required": true, "description": "Name shown as the logo text." }
  ],
  "slots": [
    { "name": "nav", "description": "Navigation links.", "accepts": "a elements or buttons" }
  ],
  "styling": {
    "tailwindClasses": "flex items-center justify-between px-6 py-4 bg-stone-900 text-amber-50",
    "palette": ["stone-900", "amber-50", "amber-400"],
    "notes": "Serif logo text; amber-400 for hover states."
  },
  "dependencies": [],
  "interactions": [],
  "markupSketch": "<header><span class=logo>{site-name}</span><nav><slot name=nav></slot></nav></header>"
}
```

- `prop.type`: `string`, `number`, `boolean` or `json` (JSON-encoded attribute).
- `dependencies`: `[{ "id": "g-other-component", "usage": "…" }]` — components this one renders.
- `interactions`: `[{ "trigger": "…", "method": "POST", "route": "/…", "bodyShape": "…" }]` — calls to the
  site's action runner (never GET).

## Pulling components you like

`npm run components:pull -- <toolkit> [ids...]` copies components from the library into this folder
(spec as `<id>.json`, code as `<id>.js`, without the debug header and Twind wiring), so a generated
component you like can be kept in the repo, edited by hand, and reinstalled with
`npm run components:install -- <toolkit> <id> --overwrite`. Existing files are kept unless you pass
`--overwrite`.
