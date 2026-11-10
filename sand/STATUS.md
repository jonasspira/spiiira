---
# Keeps this file off www.spiiira.com. Jekyll skips pages marked unpublished.
published: false
---

# sand status

This file is committed on purpose so any AI tool (Claude Code, Codex, cloud
sessions) gets the full picture. The repo's other `STATUS.md` files stay on
Jonas's Mac only; this one is the exception (see `AGENTS.md`). Read
`AGENTS.md` first for the rules; this file is the history and the to-do list.

Last activity: 2026-11-10

## Now

**Built, not yet live.** The page is finished on branch `worktree-sand-map`
and has not been merged or pushed. www.spiiira.com/sand/ will 404 until Jonas
merges it into `main` and pushes. No homepage card or README row, by design.

What a visitor sees:

- A dark world map with 128 pins (129 jars; SJ-025 is empty and has no pin).
  Amber circles are beaches, purple diamonds are not beaches, hollow dashed
  pins are approximate places. A key in the corner explains them. Pins group
  into numbered clusters; a purple ring means the group mixes both kinds.
- A stats strip computed from the data: 129 jars, 128 pins, 118 places,
  33 countries & territories, 5 continents, 116 beaches, 12 not beaches.
- Click a pin (or press Random): the map flies in and a card opens with one
  interesting sentence, three quick facts (colour, made of, from), a Wikipedia
  link, and "More" folding the full researched description and its sources.
- Return to map flies back out. Escape closes the card. Pins and clusters work
  from the keyboard.

Checks: `node --test sand/tests/data.test.mjs` passes 9 checks. Headless Chrome
checks at desktop and phone size passed on 2026-11-10: every pin present,
cluster click separates, pin click opens the right card, 24 Random picks each
showed the right pin, duplicate jars fan out and switch, keyboard Enter works,
no console errors, no failed requests (only map tiles cancelled mid-zoom).

## Next

1. **Jonas reviews the page locally** (see "How to look at it" below), then
   decides whether to merge and push to make it live.
2. **The original CSV was never attached.** The prompt referred to
   `sand-jars-inventory.csv`, but it was not on the Mac. The data was built
   from the Notion "Sand Jars" database instead (SpiraOS / Projects,
   https://app.notion.com/p/44ab85cd1e8b41519e5ab1fa20d4709a). Totals match the
   prompt exactly. If the CSV turns up, compare it with
   `data/sand-jars.json` and flag any difference; the CSV wins.
3. **SJ-121 needs a photo** of the jar's left side to read the first word of
   "[?]af Beach, Cape Town". Until then it stays unresolved, low confidence,
   approximate. Do not guess the name.
4. **Cut-off labels to confirm by looking at the jars**: SJ-012 Daytona,
   SJ-046 Cocoa Beach, SJ-055 Golden Gate "State Par...", SJ-058/SJ-118
   Papagayo, SJ-069 Santa Monica, SJ-095 Nevis, SJ-106 Mendenhall, SJ-117
   Destin, SJ-126 Kunë-Vain-Talë, SJ-129 Gulf Shores (Alabama inferred).
5. **Weakest sand sources, worth upgrading if better ones appear**: Hopkins
   (Belize, a travel blog), Jacó (real-estate blog), Papagayo (travel writing
   only), Positano, Elafonisi, Santorini (black and red), Strandhill (a
   Facebook post for the dune age), Nevis, Koh Talu, St Kitts.
6. Natural round-2 ideas that v1 deliberately leaves out: search, filters, a
   list view. Only build them if Jonas asks.

## How to look at it

```
cd ~/Projects/"SPIIIRA Tools"/spiiira/.claude/worktrees/sand-map
python3 -m http.server 8080
```

Then open http://127.0.0.1:8080/sand/. (If the branch has been merged, run the
same command from `~/Projects/"SPIIIRA Tools"/spiiira` instead.)

## Where the data came from (so it can be redone or extended)

- **Inventory**: 129 rows from Notion (fields copied verbatim: `id`, `place`,
  `label_as_written`, `shelf_group`, `photo`, `confidence`, `notes`). Notion
  has no `position_in_photo` column, so the data file has none.
- **Places**: the 129 jars map to 118 distinct places (`place_key`). Label
  variants merged: Barcelona / Barcelona Spain, the three Venice Beach labels,
  Daytona Beach / Daytona Beach Flor..., Eleuthera / Eluthera, Manhattan Beach /
  Manhattan Beach CA. Santorini black (SJ-053) and red (SJ-060) are separate
  places, not duplicates.
- **Coordinates**: each place was looked up in OpenStreetMap's Nominatim
  search (one request a second). The match is recorded in `geocode.osm` and
  `geocode.matched`. Hand-picked where the first match was wrong: Kalkaska (the
  village, not the county), Ka'anapali Beach, Kapalua Beach, La Pelosa, Punta
  Mita, the Iveragh Peninsula for Ring of Kerry. Oneuli Beach is not in
  OpenStreetMap, so it is pinned at Pu'u Ola'i (Overpass API, node 2689100160),
  approximate. Omaha Beach's match is an information board on the beach.
- **Approximate pins (31 places)**: Panama "Beach", Seychelles, Topsail Island,
  Valley of Fire, Cape Cod, Sunset Beach, Muscle Beach, Mojave Desert, Ambergris
  Caye, Eleuthera, Santo Domingo, Grand Canyon, Santorini black, Iceland, Golden
  Gate Park, Hawaii, Papagayo, Koh Yao Yai, Grand Cayman, Petroglyph, Oneuli,
  Nicaragua, Lake Michigan, Cozumel, Aruba, Ring of Kerry, Turks and Caicos,
  Zambezi, St Kitts, SJ-121 Cape Town, Lake Ohrid. Each has an `approx_note`.
- **Sand profiles**: researched per place on 2026-11-09/10 by six parallel
  research agents using web search and page reads, with sources saved per place.
  Rules they followed: every claim backed by a source found in that session,
  paraphrase only, and "not published" rather than a guess. Results: 116 places
  described, 2 with no published composition (Manuel Antonio, Punta Mita).
  About 40 places are described from their wider coast because the label names
  a city, island or region; each summary says so. Unsourced colour claims were
  removed for Huntington Beach, Sunset Beach and Barcelona.
- **Highlights and quick facts** (`sand.highlight`, `sand.glance`): condensed
  on 2026-11-10 from each place's sourced summary by two agents told to add no
  new facts; spot-checked against the summaries.
- **Wikipedia links**: one per place, each checked against Wikipedia's API as
  a real article (not a disambiguation page). Broader fallbacks: La Pelosa ->
  Stintino, both Santorini jars -> Santorini, Oneuli -> Mākena State Park,
  SJ-121 -> Cape Town, Venice Beach -> Venice, Los Angeles (the "Venice
  Beach" title is a disambiguation page).
- The scratch scripts that did all this lived in a temporary session folder
  and are gone. To change data now, edit `data/sand-jars.json` by hand and run
  the tests.

## Decisions (and why)

- **Plain HTML/CSS/JS, no build** (instead of nyc26's React + Vite): one map,
  one drawer, one button; Leaflet is already plain JavaScript. Libraries are
  copied into `vendor/` so the only outside requests are map tiles and the
  visit counter. Hence no `src/` or `assets/` folders, unlike the prompt's
  suggested layout, which allowed this choice.
- **Not-a-beach jars (12)**: the seven the prompt named (Valley of Fire, Mojave,
  Grand Canyon, Petroglyph, Haleakalā summit, Mendenhall Glacier, Zambezi) plus
  five whose labels name no beach: Kalkaska (inland town; "Kalkaska sand" is
  Michigan's state soil), Orlando (inland city), Roussillon (ochre cliffs),
  Santa Cruz Bolivia (inland city in a landlocked country), Theth National Park
  (mountains). Reclassify by changing `category` in the data if Jonas
  disagrees.
- **Country-only (3)**: Hawaii, Iceland, Nicaragua. Hawaii's `country` is
  United States so it is not counted as a separate country. Seychelles stays a
  beach with an approximate pin.
- **Territories counted on their own**: Hong Kong, Aruba, Cayman Islands, Turks
  and Caicos Islands.
- **SJ-047** says "Santa Domingo ... (Pacific side)"; Santo Domingo faces the
  Caribbean. The label is kept as written and the card notes it.
- **Colours** (Jonas, 2026-11-10): amber `#FDBA21` beach, purple `#BF63F3` not a
  beach, orange `#FE5517` approximate/uncertain, blue `#0066FF` controls, on the
  spiiira-ui greys. Shapes repeat the meaning so colour is never the only cue.
- **Cards for glancing** (Jonas, 2026-11-10: "less text, just interesting
  details"): highlight + three facts + Wikipedia up top; long text under More.

## Log

### 2026-11-10 — accent colours, glanceable cards, this file (Claude Code)

Jonas asked for: a different colour for not-a-beach pins with a key on the
map; easier-to-read cards with less text and Wikipedia links; accents from his
palette (#BF63F3, #FE5517, #FDBA21, #0066FF); and progress notes any AI tool can
read. Done: purple diamond pins and clusters for not-a-beach, a map key, the
four accents applied by meaning, cards rebuilt around a one-line highlight and
three quick facts, verified Wikipedia links for all 118 places, the long
research moved under "More", and this committed `STATUS.md`. Tried and dropped:
overlapping map tiles by half a pixel to hide seams (made them worse); the fix
was to paint the map background the same colour as the darkened sea.
Mid-session the repository was renamed from `jonasspira.github.io` to
`spiiira` (GitHub `jonasspira/spiiira`); the branch was moved onto the new
`main`.

### 2026-11-09/10 — v1 built (Claude Code)

From a detailed prompt by Jonas: a public, indexable map at /sand/ with a pin
per jar, a fly-in detail card about the sand, Random, Return to map, and live
stats; no backend, no login, no search or filters in v1. Built as described
above. The CSV attachment was missing, so Notion was used. Six research agents
wrote the sand profiles. Fixed during testing: the phone world view showed only
a third of the pins (allowed zooming further out); stacked duplicate jars stayed
hidden after Random (now fan out at once); Enter on a pin did nothing (added
keyboard handling).
