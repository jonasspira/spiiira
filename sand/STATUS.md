---
# Keeps this file off www.spiiira.com. Jekyll skips pages marked unpublished.
published: false
---

# sand status

This file is committed on purpose so any AI tool (Claude Code, Codex, cloud
sessions) gets the full picture. The repo's other `STATUS.md` files stay on
Jonas's Mac only; this one is the exception (see `AGENTS.md`). Read
`AGENTS.md` first for the rules; this file is the history and the to-do list.

Last activity: 2026-11-12

## Now

**Live at www.spiiira.com/sand/** with the redesign (pushed 2026-11-12,
versions `?v=13`), plus the rarity page at www.spiiira.com/sand/rarity/.
No homepage card or README row, by design.

What a visitor sees:

- The page is called **Sand**; the mark is Unbounded (weight 625).
- **First visit only: an intro** over the map, which is dimmed and blurred
  behind it: "A note on the collection", the title, two short paragraphs about
  the collection (written only from what Jonas said; no names), the totals
  line (129 jars, 118 places, 33 countries and territories, computed), four
  one-line how-tos (pins, groups, Random jar, cards) and a blue "Explore the
  map" button. Closing it clears the blur and the pins sweep in west to east.
  "About" in the header reopens it.
- A full-screen dark map under a translucent header (the mark, subtitle and
  stats on wide screens, About and Random jar buttons). No lines between map
  tiles; Antarctica painted out in the sea colour.
- Pins, groups, key and card content as before. The card is now a floating
  rounded panel on wide screens and a draggable bottom sheet on phones;
  switching jars cross-fades it; one orange pulse marks the pin on arrival.
- The old "Click a pin..." hint is gone; the intro replaced it.

Checks on 2026-11-11 (headless Chrome at 1440x900, 390x844, 375x667): no page
errors; intro opens on first visit only, closes by button, Escape and About
reopens it; pins hidden behind it then sweep in; Random opens the right card
with the pin ringed and pulsed; repeated Random cross-fades; the phone sheet
drags to full and swipes closed; all 128 pins in the phone world view; on the
small phone the intro scrolls with the button kept on screen; no sideways
scroll. Data tests pass.

## Engagement: how to read it

Visits and engagement are counted by GoatCounter, the site's existing visit
counter, at https://spiiira.goatcounter.com (Jonas's login). Nothing else is
used: no cookies, no personal data. Nothing is counted until the page is live,
and local previews never count.

- **Visits**: the `/sand/` row, as for every page on the site.
- **Time on the page**: rows named `sand-time-30s`, `sand-time-1m`,
  `sand-time-2m`, `sand-time-5m`, `sand-time-10m`. Each counts visits that
  stayed at least that long with the tab visible. Example: 200 visits,
  `sand-time-1m` 80 and `sand-time-5m` 15 means 40% stayed a minute or more and
  7.5% stayed five or more. GoatCounter cannot give an exact average time per
  visit; these steps are the closest it gets.
- **Clicks**: `sand-open-pin` (a card opened from the map), `sand-random`
  (Random jar pressed), `sand-open-sibling` (switched between jars from the
  same beach), `sand-wikipedia` (a Wikipedia link opened), `sand-more` ("More"
  opened on a card).
- Events show in the same list as pages; set the dashboard's date range to see
  a period.

## Next

- **Open question for Jonas**: on the rarity page, keep "Volcanic and coral"
  (Hawaii, both Papagayo jars) as its own type, currently the rarest, or fold
  it into Volcanic?
- **Shelf codes assume left-to-right numbering**; confirm against one row.
1. ~~Jonas reviews the page locally, then merges and pushes.~~ Done
   2026-11-10; v1 is live.
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
6. **Photos to improve if better ones appear on Commons**: Koh Talu and
   St. Lucia have none (no verifiable photo of the place); Key Largo shows a
   rocky shore; Bimini and Great Blasket are seen from a distance; Kune shows
   the lagoon shore; Grand Isle shows the fishing pier; Santo Domingo is Boca
   Chica nearby; SJ-121 is a general Cape Town beach (Camps Bay), captioned so.
7. Natural round-2 ideas that v1 deliberately leaves out: search, filters, a
   list view. Only build them if Jonas asks.

## How to look at it

```
cd ~/Projects/"SPIIIRA Tools"/spiiira/.claude/worktrees/sand-map
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/sand/`. (If the branch has been merged, run the
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

### 2026-11-12 — intro fits the window, rose R and J (Claude Code)

From annotations 2 and 3: the intro was cut off in a short browser window;
it now scales to fit on wide screens (checked 1440x900 down to 800x500;
centring plus scaling overflowed at first, so a scaled intro starts at the
top). Shelf codes: rose and bold R/J were rejected ("red isn't it",
"mix of bold/unbold looks bizarre"); after a five-option sheet Jonas chose
monospace, regular weight, R and J in light blue, and the current jar's
button outlined in the same blue instead of orange.

### 2026-11-12 — rarity sub-page (Claude Code)

Built `rarity/index.html` (Jonas: keep it simple and low on tokens). Each
place's sand got a `sand.type`, assigned by hand from its researched
"made of" line: Quartz 40 jars, Shell and coral 29, Quartz and shell 16,
Volcanic 13, Rock and mineral 12, Soil and silt 4, Moved by people 4,
Volcanic and coral 3 (Hawaii, both Papagayo jars: labels covering both kinds
of beach), Not analysed 7 (unranked). The rarest "type" is that mixed group;
if Jonas would rather rank only single types, fold it into Volcanic. New
data check (12 now). Unused markercluster files deleted with Jonas's OK.

### 2026-11-12 — every jar a dot, clickable totals (Claude Code)

From Jonas's first annotated screenshot:
- **"More pins rather than groups... impactful that there are over 100."**
  Shrinking the grouping distance alone got only to 36 single pins (most
  jars really are within a few pixels at world view: 18 around Los Angeles,
  about 20 in Florida), and at its tightest the number bubbles overlapped.
  Jonas chose "every jar its own dot": markercluster is no longer loaded;
  `layoutPins()` packs touching dots side by side (simple collision pass, a
  gentle pull to each true spot, recomputed after every zoom, with a short
  glide). The phone's world view uses the smallest dots so the North America
  swarm doesn't spill over Mexico and South America. The key's "Group" row and
  the intro's "Groups" how-to were replaced (intro now: "Totals").
- **Clickable totals**: each header number opens a panel of the jars behind
  it; a jar opens its card. Beaches are A to Z (Jonas). Numbers are bigger;
  on screens under 1000px the totals move to a second header row, and the
  header height is measured into `--bar-h`. Also fixed: on mid-width screens
  the first totals were cut off and could not be scrolled to.
- **Next: the rarity sub-page.** Jonas: "I want the Rarity as a new
  sub-page. That's interesting data and info to explore." Approach agreed in
  principle: group each sand by what it is made of, from the researched
  profiles already in the data (no new claims), and rank by how few jars
  share its type: rarity within the collection, not worldwide. Details
  (address, layout, how types are named) still to settle with him.

### 2026-11-12 — shelf codes, card titles, green totals (Claude Code)

- **Shelf codes** (Jonas: "RXJX, from left to right"): new data field
  `shelf_code`, e.g. `R6J10`. Row = the number at the start of
  `shelf_group` (11 rows); J = the jar's place in its row, counted in
  inventory order. Assumed: the inventory was numbered left to right along
  each row (each row is named after its first jar, which fits), but nobody
  has checked this against the shelf. If a row turns out to be numbered right
  to left, reverse that row's codes in the data. Cards and the same-beach
  buttons show the code; the `SJ-` number moved to the card footer
  ("Inventory SJ-067") so the Notion inventory can still be matched. New data
  check for the codes (11 checks now).
- **Card place names** now use Unbounded 625 (22px, 20px on phones), like
  the mark.
- **Stats numbers** use a fifth accent, green `#2EE6A6`, whose one job is
  the collection's totals (header and the intro's line).

### 2026-11-12 — name, typeface, phone map (Claude Code)

Jonas reviewed the screenshots and approved the redesign except:
- **Wording**: he disliked "from vacations and from relatives" and "never
  catalogued, counted or mapped"; both dropped. The first paragraph is now
  "For decades, sand has come home in small jars. Until now it has existed
  only on a shelf."
- **Name**: "Sand", not "Sand jars" (tab title, header, intro).
- **Typefaces**: Instrument Serif looked "too clearly AI". Two option sheets
  (Archivo, Schibsted Grotesk, IBM Plex, Apple system; then EB Garamond,
  Spectral, Literata, Zilla Slab, Courier Prime, Alegreya Sans, Josefin Sans,
  Big Shoulders, Karla) were all rejected. Jonas chose Unbounded himself, at
  28px weight 625 for the header mark. Card titles and highlights moved to
  the system sans, so Instrument Serif is no longer used.
- **Phone map looked odd**: two causes fixed. Thin dark lines where tiles met
  came from the filter on the whole tile layer (moved onto each tile; tried
  and dropped first: overlapping tiles by 1px, and `mix-blend-mode`). The dark
  Antarctica slab is painted out in the sea colour from 60°S.
- Also fixed: a card with a single quick fact (e.g. Barcelona) left it in a
  third-width box; it now spans the row. The phone intro's button now sits
  at the bottom of the screen when the text is short.

### 2026-11-11 — intro and redesign (Claude Code)

Jonas asked for a landing intro (the story, then brief how-tos, quick to
dismiss), a more impressive and distinctive UI with purposeful motion, a dark
theme with bold accents, and a page that works well on phones. He said the
page need not follow spiiira-ui and asked to consult One Page Love for
references (used: Felix Haas's "letter" layout, Monolog's dimmed full-screen
background, April Leihuanani's serif title on near-black).

- Decided: no React or BoardUI. Both need React and a build step, which
  sand's rules forbid, and motion needs neither (CSS and `element.animate()`).
- Decided (Jonas): the intro shows on the first visit only; "About" reopens it.
- The story came from Jonas: a family member's decades-long collection, from
  vacations and relatives, kept only in jars on a shelf, never catalogued or
  mapped until now; the page is for exploring the places and what makes each
  sand distinctive. Text must be generic: no names, not addressed to anyone.
  Two word choices he was asked to confirm: "from vacations and from
  relatives" and "never catalogued, counted or mapped".
- Instrument Serif (OFL) added in `vendor/fonts/`, so the page still makes no
  new outside requests.
- Accents unchanged (Jonas was open to others; kept the four).
- Phones: the world view now fits the pins instead of the globe (about 20%
  larger, every pin still visible); the header drops subtitle and stats.

### 2026-11-10 — final revision and going live (Claude Code)

Jonas asked to drop the SJ-025 "empty jar awaiting sand" note from the key:
it does not need to be noted. Removed from the page (the jar stays in the data
and in the 129 count). Versions bumped to `?v=4`. Then pushed live at his
request.

### 2026-11-10 — calmer colours, photos, engagement, bigger key (Claude Code)

Jonas said the page looked better but the colours felt random and the UX was
a bit hard; asked how to track engagement and time on the page; asked for
shoreline photos on the cards; wanted a larger, clearer key; and asked whether
the Leaflet credit had to stay.

- Colours: each accent now has one job (amber beach, purple not a beach,
  orange the open jar, blue things you press); tags, numbers and captions are
  grey; the four-colour stripe under the header is gone.
- UX: pin names on hover, a first-visit hint, a subtitle, "Random jar" and
  "World map" labels, a calmer card with the photo on top.
- Key: bottom-right, one line per symbol with a plain explanation, includes
  "Open jar"; open on desktop, folded on phones, hidden while a card is open.
  A taller version covered pins in Central America and Thailand, so it was
  made compact.
- Map credit: the "Leaflet" label is removed; the OpenStreetMap credit is
  legally required and stays, at 10px.
- Engagement: GoatCounter events for clicks and visible time steps (see
  "Engagement: how to read it"). No new service.
- Photos: three agents searched Wikimedia Commons per place with a helper that
  keeps only free licences (CC BY, CC BY-SA, CC0, public domain) and landscape
  photos, looked at numbered contact sheets and picked one each. Rejected after
  review: Koh Talu (photo was of another Rayong beach), St. Lucia (location
  only guessed), and a Hawaiian "Sunset Beach" (the jar is Sunset Beach,
  Orange County; re-picked). Wikimedia now serves thumbnails from
  thumb.wikimedia.org with tracking tags, which are stripped.
- Version numbers bumped to `?v=3`.

### 2026-11-10 — "I'm not seeing any of the updates" (Claude Code)

Jonas's preview server (port 8080, in the worktree) was serving the new files
correctly; his browser was showing a saved copy of the old script and styles.
Fixed for good by adding version numbers to the file links (`?v=2`); the rule
to bump them after each change is in `AGENTS.md`. Not live yet either:
www.spiiira.com/sand/ is a 404 until the branch is merged and pushed.

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
