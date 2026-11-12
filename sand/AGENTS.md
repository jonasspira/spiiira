---
# Keeps this file off www.spiiira.com. Jekyll skips pages marked unpublished.
published: false
---

# sand

A public world map of Jonas's sand-jar collection, served at
www.spiiira.com/sand/. Every jar with a known place has a pin; clicking one
flies the map in and opens a card about the place and what its sand is made of.
This folder is the only copy; there is no separate repository.

**Start every session by reading `STATUS.md` in this folder.** It holds where
this started, every decision so far, what is unfinished, and what to do next.
Unlike the repo's other `STATUS.md` files it is committed (forced past
`.git/info/exclude`) so Codex, cloud sessions and any other copy of the repo can
read it. Nothing in it is private. Keep it committed and keep its
`published: false` front matter.

## Where the pieces are

| Piece | Lives in |
|---|---|
| The page | `index.html` |
| Behaviour (map, card, Random, stats) | `app.js` |
| Styling | `style.css` |
| **The data, single source of truth** | `data/sand-jars.json` (all 129 jars) |
| Map library (Leaflet 1.9.4) | `vendor/`, copied unmodified from npm, with its licence |
| The rarity sub-page (www.spiiira.com/sand/rarity/) | `rarity/index.html`, one self-contained file that reads the same data file |
| The "Sand" mark's font (Unbounded, Google Fonts, SIL Open Font Licence, from `@fontsource-variable/unbounded` 5.2.8, Latin only) | `vendor/fonts/`, with its licence |
| The intro (first-visit note and how-to) | the `<dialog id="intro">` in `index.html` |
| Data checks | `tests/data.test.mjs` |
| Tab icon | `favicon.svg` |
| Progress, decisions, next steps | `STATUS.md` (committed) |

## Why plain files, not React + Vite

The page is one map, one drawer and one button. Leaflet does all the heavy
lifting and is plain JavaScript already, so React + Vite (as in `nyc26/`) would
add a build step, a `node_modules` folder and a compile-before-commit rule for
no gain. Plain files run as they are on GitHub Pages and from any local static
server, and the page can be fixed by editing one file. The libraries are kept in
`vendor/` rather than loaded from a CDN so the only outside requests are the
map tiles and the visit counter. **Do not mix in a framework or a build step.**

The same goes for motion (Jonas asked about React for it, 2026-11-11): all of
it is CSS animation and the browser's built-in `element.animate()`, no
animation library. If spring-style motion is ever wanted, the plain-JavaScript
build of Motion fits as one file in `vendor/` with no build; React does not.

Because there is no build, there is no `src/` and no `assets/`: the files in
this folder are both the source and what is served. Edit them directly.

## How sand/ differs from nyc26/ (this folder overrides nyc26's rules)

- **Public and indexable.** No PIN, no `noindex`, no login.
- **No backend of any kind.** No Worker, no D1 database, no intake endpoint, no
  server, no API key. All data is in `data/sand-jars.json` in this repository.
  The page's only outside requests are the OpenStreetMap tiles, GoatCounter,
  and card photos loaded from upload.wikimedia.org when a card opens.
- **No build step** (see above), so nyc26's "edit `src/`, then `npm run build`"
  rule does not apply here.
- Same as nyc26: **no homepage card and no `README.md` row** unless Jonas asks.

## Rules that do not change

- **The data file is the single source of truth.** The page computes every
  number (jars, pins, places, countries, continents, beaches) from it. Never
  hardcode a count in the HTML.
- **The inventory fields are the artefact.** `id`, `place`, `label_as_written`,
  `shelf_group`, `photo`, `confidence` and `notes` are copied verbatim from the
  inventory (the Sand Jars database in Notion, from `sand-jars-inventory.csv`).
  Do not "fix" a label's spelling.
- **Pins must be real.** Every coordinate comes from OpenStreetMap (Nominatim,
  or the Overpass API for Oneuli). `geocode.osm` holds the OSM object it came
  from. Never take a coordinate from memory or invent a beach position. When no
  real beach of that name exists, use the nearest real named place, set
  `approximate: true`, and say why in `approx_note`; the card shows it and the
  pin is drawn hollow and dashed.
- **Sand profiles must be researched.** Each pinned jar's `sand.sources` lists
  where the description came from. If nothing is published, `sand.known` is
  `false` and the summary says so plainly. Never write a plausible mineral
  breakdown without a source. Jars of the same place share one profile.
- **The two Santorini jars are different sands** (black SJ-053, red SJ-060) and
  are not a duplicate group.
- **Its own look, not spiiira-ui** (Jonas, 2026-11-11). Dark theme; a
  full-screen map under a translucent header. The page is called **Sand**
  (Jonas, 2026-11-12: not "Sand jars"). The "Sand" mark is Unbounded, weight
  625, 28px in the header (Jonas's own choice); the intro's big title and each
  card's place name use the same face and weight (Jonas, 2026-11-12);
  everything else is the system sans. Jonas rejected
  Instrument Serif and thirteen other candidates as looking too AI-made, so do
  not swap typefaces without asking him; the card floats as a rounded panel on wide screens and is a bottom
  sheet on phones. Do not restyle it back to the spiiira-ui dashboard look.
- **The intro shows on a visitor's first visit only** (Jonas, 2026-11-11). It
  remembers that in the browser's own `localStorage` (key `sand-intro-seen`,
  never sent anywhere; if storage is blocked it just shows each visit). The
  header's "About" button reopens it. On wide screens it must fit the
  window with nothing below the fold (Jonas, 2026-11-12): `fitIntro()`
  scales it down when the window is short; phones scroll with the button
  pinned. It closes with "Explore the map",
  Escape, or a click beside the text. Its story is written only from what
  Jonas told: it names no one and is not addressed to anyone. Do not add to
  the story without asking him. Its stats line is computed from the data.
- **Motion is only where it explains something**, and each piece has one
  reason: the intro lines rise in (under a second); on the first visit only,
  the pins sweep in west to east when the intro closes (the collection
  spreading across the world); the card slides in and out; switching jars
  cross-fades the card; one orange pulse marks the pin when the map arrives;
  photos fade in. No loops, no cursor effects, no count-up numbers. Everything
  is cut to near-instant for visitors whose device asks for reduced motion.
- **Phones** (Jonas, 2026-11-11: "ensure the page displays nicely on
  mobile"): the header drops the subtitle and stats (the intro carries them);
  the card is a sheet that rests at 60% height, drags up to full and down to
  close (a tap on its handle toggles); the world view fits the pins' own
  extent rather than the whole globe, so it is as large as it can be with
  every pin visible. Check 390x844 and 375x667 after layout changes.
- **Map rendering**: the darkening filter is on each tile (`.leaflet-tile`),
  not on the tile layer; on the layer it drew thin dark lines where tiles met.
  Antarctica (no jars) is painted over in the sea colour from 60°S down, so
  the zoomed-out map is not cut off by a dark slab.
- **Every jar is its own dot** (Jonas, 2026-11-12: landing should show there
  are over a hundred). No number bubbles. Where jars are closer than a dot's
  width, `layoutPins()` nudges their dots apart to sit side by side around the
  true spot, recomputed after every zoom; zoomed in, they return to their
  exact places. Dots shrink when zoomed out (`.far`, `.farthest`) so packed
  groups stay near their real places.
- **The header totals open lists** (Jonas, 2026-11-12). Each number is a
  button; its panel lists the jars behind it (jars = the shelf row by row;
  places A to Z; countries and continents as folding groups, most jars first;
  beaches A to Z; not beaches with a short explanation), and every jar listed
  opens its card. These lists are the only list views: still no search,
  filters, accounts, comments, sharing or editing, and the map stays the page.
- **The rarity sub-page** (Jonas, 2026-11-12) groups every sand by
  `sand.type` and ranks the types by how few jars share them: rarer within
  this collection, not worldwide. Types were assigned by hand from each
  place's researched `glance.made_of` and `composition`, never from outside
  knowledge; unanalysed sands are `Not analysed` and unranked. Jar names link
  to `../#R6J10`, which opens that jar on the map without the intro. Linked
  from "Rarity" in the map's header. Keep it simple (Jonas: don't
  over-engineer).
- **Each colour has exactly one job; everything else is grey.** Jonas chose four
  accents (2026-11-10), then said the first use of them felt random, so each now
  means one thing only:
  amber `#FDBA21` = a beach jar (pins, groups, the card's highlight rule);
  purple `#BF63F3` = not a beach (pins, groups, its tag);
  orange `#FE5517` = the jar you are looking at now (selected pin ring, its
  arrival pulse);
  blue `#0066FF` = something you can press (Random jar, Explore the map, links,
  focus), shown as
  `#6AA6FF` where it is text, because `#0066FF` is too dark to read on grey;
  green `#2EE6A6` = the collection's totals (the numbers in the header stats
  and the intro's totals line; Jonas asked for an unused accent, 2026-11-12).
  Shelf codes are monospace, regular weight, with the R and J in light blue
  `#6AA6FF`, and the current jar's same-beach button is outlined in that blue
  (Jonas, 2026-11-12, a deliberate second job for blue; `codeEl()` in app.js,
  and the same on the rarity page). Rose and bold were tried and rejected.
  Tags, caveats, numbers and captions are grey. No decorative colour (the
  four-colour stripe under the header was removed for that reason).
- **Colour is never the only cue.** Beach pins are circles, not-a-beach pins
  are diamonds, approximate pins are hollow and dashed, the open jar has a ring.
  The map key explains each with a plain-language line. Keep the key in step
  with the pins. It sits bottom-right (over empty ocean), starts open on wide
  screens and folded on phones, and hides while a card is open.
- **Cards are for glancing** (Jonas, 2026-11-10: less text, just interesting
  details). Top to bottom: photo, shelf code and country, place, label, tags, one short
  caveat line at most, the one-sentence `highlight`, three quick facts
  (`glance`), the Wikipedia link, the other jars from the same beach.
  Everything longer (the full summary, grain, sources, inventory notes) stays
  folded under "More". Do not move long text back above the fold.
- **Photos must be free to reuse and credited.** Each `image` is a Wikimedia
  Commons photo under CC BY, CC BY-SA, CC0 or public domain (never NC or ND),
  shown with the photographer, the licence and a link to its Commons page, as
  those licences require. Photos are chosen by looking at them: the actual
  place, shoreline and sand in frame. A place with no suitable photo has
  `image: null` and the card simply has no photo.
- **Engagement is counted with GoatCounter events, nothing else.** `app.js`
  sends named events (`sand-open-pin`, `sand-random`, `sand-open-sibling`,
  `sand-wikipedia`, `sand-more`, `sand-panel-<list>` when a header total's
  list is opened, `sand-open-list` when a jar is opened from one, and `sand-time-30s` / `-1m` / `-2m` / `-5m` /
  `-10m` for visible time on the page). No cookies, no personal data, no other
  analytics service. GoatCounter ignores localhost, so local previews count
  nothing.
- **The OpenStreetMap credit must stay** (its licence requires it). It is
  shown small; the "Leaflet" label is removed, which is allowed.
- **Highlights and quick facts are condensed from the sourced summary**, never
  new facts. A place with `known: false` has an empty highlight; the card then
  says the composition is not published.

## v1 defaults for the edge cases (data-driven: change the data, not the code)

| Case | v1 handling |
|---|---|
| Duplicate jars (Venice x3; Nassau, Daytona, Pensacola, Barcelona, Manhattan Beach, Santa Monica, Papagayo, Eleuthera x2) | One dot per jar, same coordinates, shared `duplicate_group`. Their dots sit side by side. The card links to the other jar(s). |
| Non-beach jars | `category: "not_a_beach"`, with a purple diamond pin, a card and a purple "Not a beach" tag. |
| Country-only labels (Hawaii, Iceland, Nicaragua) | `category: "country_only"`, approximate pin at the country or state centre. |
| SJ-025, the empty jar | `category: "empty"`, no coordinates, no pin, and **not mentioned anywhere on the page** (Jonas, 2026-11-10: "doesn't need to be noted"). It stays in the data file and counts toward the 129 jars. |
| SJ-121, "[?]af Beach, Cape Town" | Low confidence, approximate pin at central Cape Town, card says the name is unresolved. Do not guess the beach name; it needs a photo of the jar's left side. |
| Cut-off labels (SJ-095 Nevis, SJ-106 Mendenhall, SJ-126 Kunë-Vain-Talë, SJ-129 Gulf Shores, and the other medium rows) | Inferred name kept, `confidence: "medium"`, and the card says it is not fully verified. |

## Data fields

Each jar: the seven inventory fields above, plus `shelf_code` (where the jar
sits: `R6J10` = row 6, tenth jar counting from the left; Jonas, 2026-11-12;
the page shows it instead of the `SJ-` number, which stays in the card
footer as "Inventory SJ-067"), `place_key` (one per distinct
place), `country`, `category` (`beach`, `not_a_beach`, `country_only`, `empty`),
`duplicate_group`, `latitude`, `longitude`, `approximate`, `approx_note`, `zoom`
(how far the map flies in), `geocode` (`source`, `osm`, `matched`),
`wikipedia` (`title`, `url`, checked against Wikipedia's API: a real article,
not a disambiguation page; sometimes the nearest broader article, e.g. La
Pelosa links to Stintino), and `sand`: `known`, `highlight` (one sentence, at
most about 22 words), `glance` (`colour`, `made_of`, `from`, a few words each,
empty when unknown), then the longer research fields `colour`, `composition`,
`origin`, `why_this_colour`, `grain`, `summary` (2 to 4 sentences) and
`sources`, plus `type` (the rarity group, one of nine; jars of the same place
share it); and `image` (or `null`): `src` (a 500px Commons thumbnail),
`srcset` (adds the 960px one when the original is big enough), `page` (the
Commons file page), `file`, `artist`, `licence`, `caption` (what the photo
shows, a few words). Do not confuse `image` with `photo`, which is the
inventory photo of the shelf (IMG_0831 to IMG_0836). `country` uses the sovereign state, except for
territories counted on their own: Hong Kong, Aruba, Cayman Islands, Turks and
Caicos Islands. Hawaii is `United States`. The continent for each country is
in the `CONTINENT` table in `app.js`; if a country is missing there, the
continent stat hides itself rather than guess.

## Working on it

```
python3 -m http.server 8080      # from the repository root
open http://127.0.0.1:8080/sand/
node --test sand/tests/data.test.mjs   # data checks; all must pass
```

To change a jar, edit `data/sand-jars.json`, run the tests, reload the page.

**After any change, bump the version number** (`?v=2` -> `?v=3`) on
`style.css` and `app.js` in `index.html` and on `DATA_URL` in `app.js`.
Browsers keep old copies of these files, and without the bump visitors (and
Jonas, previewing locally) keep seeing the old page.
Commit and push only when Jonas asks.
