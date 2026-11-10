---
# Keeps this file off www.spiiira.com. Jekyll skips pages marked unpublished.
published: false
---

# sand

A public world map of Jonas's sand-jar collection, served at
www.spiiira.com/sand/. Every jar with a known place has a pin; clicking one
flies the map in and opens a card about the place and what its sand is made of.
This folder is the only copy; there is no separate repository.

## Where the pieces are

| Piece | Lives in |
|---|---|
| The page | `index.html` |
| Behaviour (map, card, Random, stats) | `app.js` |
| Styling | `style.css` |
| **The data, single source of truth** | `data/sand-jars.json` (all 129 jars) |
| Map libraries (Leaflet 1.9.4, Leaflet.markercluster 1.5.3) | `vendor/`, copied unmodified from npm, with their licences |
| Data checks | `tests/data.test.mjs` |
| Tab icon | `favicon.svg` |

## Why plain files, not React + Vite

The page is one map, one drawer and one button. Leaflet does all the heavy
lifting and is plain JavaScript already, so React + Vite (as in `nyc26/`) would
add a build step, a `node_modules` folder and a compile-before-commit rule for
no gain. Plain files run as they are on GitHub Pages and from any local static
server, and the page can be fixed by editing one file. The libraries are kept in
`vendor/` rather than loaded from a CDN so the only outside requests are the
map tiles and the visit counter. **Do not mix in a framework or a build step.**

Because there is no build, there is no `src/` and no `assets/`: the files in
this folder are both the source and what is served. Edit them directly.

## How sand/ differs from nyc26/ (this folder overrides nyc26's rules)

- **Public and indexable.** No PIN, no `noindex`, no login.
- **No backend of any kind.** No Worker, no D1 database, no intake endpoint, no
  server, no API key. All data is in `data/sand-jars.json` in this repository.
  The page makes no requests except the OpenStreetMap tiles and GoatCounter.
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
- **v1 has one flow only**: map, pin, card, Random, Return to map. No search,
  filters, list view, accounts, comments, sharing or editing on the page. Do not
  turn it into a list, gallery or blog. The map is the page.

## v1 defaults for the edge cases (data-driven: change the data, not the code)

| Case | v1 handling |
|---|---|
| Duplicate jars (Venice x3; Nassau, Daytona, Pensacola, Barcelona, Manhattan Beach, Santa Monica, Papagayo, Eleuthera x2) | One pin per jar, same coordinates, shared `duplicate_group`. They cluster, then fan out when clicked. The card links to the other jar(s). |
| Non-beach jars | `category: "not_a_beach"`, with a pin, a card and a "Not a beach" tag. |
| Country-only labels (Hawaii, Iceland, Nicaragua) | `category: "country_only"`, approximate pin at the country or state centre. |
| SJ-025, the empty jar | `category: "empty"`, no coordinates, no pin. Shown only as the "empty jar awaiting sand" note in the legend, which opens its inventory row. |
| SJ-121, "[?]af Beach, Cape Town" | Low confidence, approximate pin at central Cape Town, card says the name is unresolved. Do not guess the beach name; it needs a photo of the jar's left side. |
| Cut-off labels (SJ-095 Nevis, SJ-106 Mendenhall, SJ-126 Kunë-Vain-Talë, SJ-129 Gulf Shores, and the other medium rows) | Inferred name kept, `confidence: "medium"`, and the card says it is not fully verified. |

## Data fields

Each jar: the seven inventory fields above, plus `place_key` (one per distinct
place), `country`, `category` (`beach`, `not_a_beach`, `country_only`, `empty`),
`duplicate_group`, `latitude`, `longitude`, `approximate`, `approx_note`, `zoom`
(how far the map flies in), `geocode` (`source`, `osm`, `matched`), and `sand`
(`known`, `colour`, `composition`, `origin`, `why_this_colour`, `grain`,
`summary`, `sources`). `country` uses the sovereign state, except for
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
Commit and push only when Jonas asks.
