/* Sand jars: one world map, one card at a time. Plain JavaScript, no build.
   Everything shown comes from data/sand-jars.json; nothing is hardcoded. */
(function () {
  'use strict';

  var DATA_URL = 'data/sand-jars.json?v=4'; // bump ?v= in index.html and here after every change, so browsers fetch the new files
  var WORLD = L.latLngBounds([[-48, -170], [68, 165]]);
  var WIDE = window.matchMedia('(min-width: 721px)');
  var HOVER = window.matchMedia('(hover: hover)');

  // Country -> continent. If a jar's country is missing here, the continent
  // stat is left out rather than guessed.
  var CONTINENT = {
    'United States': 'North America', 'Bahamas': 'North America', 'Mexico': 'North America',
    'Belize': 'North America', 'Costa Rica': 'North America', 'Nicaragua': 'North America',
    'Dominican Republic': 'North America', 'Cuba': 'North America', 'Jamaica': 'North America',
    'Cayman Islands': 'North America', 'Turks and Caicos Islands': 'North America',
    'Saint Kitts and Nevis': 'North America', 'Aruba': 'North America',
    'Bolivia': 'South America',
    'Ireland': 'Europe', 'United Kingdom': 'Europe', 'France': 'Europe', 'Spain': 'Europe',
    'Portugal': 'Europe', 'Italy': 'Europe', 'Greece': 'Europe', 'Croatia': 'Europe',
    'Albania': 'Europe', 'North Macedonia': 'Europe', 'Iceland': 'Europe',
    'Seychelles': 'Africa', 'South Africa': 'Africa', 'Zambia': 'Africa',
    'United Arab Emirates': 'Asia', 'Qatar': 'Asia', 'Thailand': 'Asia',
    'South Korea': 'Asia', 'Hong Kong': 'Asia'
  };
  var CONFIDENCE_NOTE = {
    medium: 'Label partly cut off, so the place name is inferred.',
    low: 'Beach name unresolved: part of the label wraps out of sight.'
  };

  var $ = function (id) { return document.getElementById(id); };
  var drawer = $('drawer'), card = $('card'), worldBtn = $('world');
  var jars = [], pinned = [], markers = {}, byGroup = {};
  var current = null, lastFocus = null, map, cluster;

  // ---------- engagement (GoatCounter events) ----------
  // GoatCounter (the site's visit counter) already counts the page view. These
  // add named events, which appear under "sand-..." in the GoatCounter
  // dashboard. They carry no personal data: just the event name. GoatCounter
  // ignores localhost, so nothing is counted while previewing on the Mac.
  function track(name, title) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: 'sand-' + name, title: title || name, event: true });
      }
    } catch (e) { /* counting must never break the page */ }
  }

  // Time on page: counts only while the tab is visible, and sends one event
  // the first time each mark is passed (sand-time-30s, -1m, -2m, -5m, -10m).
  // "sand-time-2m: 40" in the dashboard means 40 visits stayed 2+ minutes.
  function trackTime() {
    var marks = [[30, '30s'], [60, '1m'], [120, '2m'], [300, '5m'], [600, '10m']];
    var seconds = 0;
    var timer = setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      seconds += 5;
      while (marks.length && seconds >= marks[0][0]) {
        var m = marks.shift();
        track('time-' + m[1], 'Stayed ' + m[1] + ' or more');
      }
      if (!marks.length) clearInterval(timer);
    }, 5000);
  }

  // ---------- small DOM helper ----------
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // ---------- map ----------
  function initMap() {
    map = L.map('map', { worldCopyJump: true, minZoom: 0, maxZoom: 17, zoomSnap: 0.25 });
    map.attributionControl.setPrefix(false); // drop the "Leaflet" label; the OpenStreetMap credit is required and stays
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    map.fitBounds(WORLD, { animate: false });
    map.on('zoomend moveend', updateWorldButton);
  }

  function worldZoom() { return map.getBoundsZoom(WORLD); }
  function updateWorldButton() {
    worldBtn.hidden = !drawer.hidden || map.getZoom() <= worldZoom() + 0.5;
  }

  function isNonBeach(jar) { return jar.category === 'not_a_beach'; }

  function pinIcon(jar, selected) {
    var cls = 'pin' + (isNonBeach(jar) ? ' nonbeach' : '') + (jar.approximate ? ' approx' : '') + (selected ? ' selected' : '');
    var size = jar.approximate ? 16 : 14;
    return L.divIcon({ className: cls, html: '<span></span>', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  function pinLabel(jar) {
    return jar.id + ', ' + jar.place + (isNonBeach(jar) ? ' (not a beach)' : '') + (jar.approximate ? ' (approximate location)' : '');
  }

  function addMarkers() {
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 38,
      spiderfyDistanceMultiplier: 1.6,
      // Amber for beaches; purple when every jar inside is not a beach; a
      // purple slice on the rim when the group mixes both.
      iconCreateFunction: function (c) {
        var kids = c.getAllChildMarkers();
        var non = kids.filter(function (k) { return k.options.nonBeach; }).length;
        var kind = non === kids.length ? ' nonbeach' : non ? ' mixed' : '';
        var n = c.getChildCount();
        var s = n < 5 ? 28 : n < 15 ? 34 : 40;
        return L.divIcon({ className: 'cluster' + kind, html: '<span><b>' + n + '</b></span>', iconSize: [s, s] });
      }
    });
    // Clusters are markers too: give them a readable label for keyboard and screen-reader users.
    cluster.on('animationend spiderfied unspiderfied', labelClusters);
    map.on('zoomend', labelClusters);

    pinned.forEach(function (jar) {
      var m = L.marker([jar.latitude, jar.longitude], {
        icon: pinIcon(jar, false), keyboard: true, alt: pinLabel(jar), riseOnHover: true,
        nonBeach: isNonBeach(jar)
      });
      // Name on hover (mouse only; on touch screens a tap opens the card straight away).
      if (HOVER.matches) m.bindTooltip(jar.place, { className: 'pin-tip', direction: 'top', offset: [0, -10] });
      m.on('click', function () { openJar(jar, { fly: true }); track('open-pin', 'Opened a jar from the map'); });
      m.on('add', function () { decorate(m, jar); });
      markers[jar.id] = m;
      cluster.addLayer(m);
    });
    map.addLayer(cluster);
    labelClusters();
  }

  function decorate(m, jar) {
    var node = m.getElement();
    if (!node) return;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', 'Open jar ' + pinLabel(jar));
    node.dataset.id = jar.id;
    if (current && current.id === jar.id) node.setAttribute('aria-pressed', 'true');
  }

  function labelClusters() {
    setTimeout(function () {
      document.querySelectorAll('.cluster').forEach(function (n) {
        var count = n.textContent.trim();
        n.setAttribute('role', 'button');
        n.setAttribute('tabindex', '0');
        n.setAttribute('aria-label', count + ' jars here. Zoom in to separate them.');
      });
    }, 0);
  }

  function setSelected(jar) {
    if (current && markers[current.id]) markers[current.id].setIcon(pinIcon(current, false)), decorate(markers[current.id], current);
    current = jar;
    if (jar && markers[jar.id]) {
      markers[jar.id].setIcon(pinIcon(jar, true));
      markers[jar.id].setZIndexOffset(1000);
      decorate(markers[jar.id], jar);
    }
  }

  // Fly so the pin lands in the part of the map the drawer does not cover.
  function offsetTarget(latlng, zoom) {
    var p = map.project(latlng, zoom);
    if (WIDE.matches) p = p.add([drawer.offsetWidth / 2 || 200, 0]);
    else p = p.add([0, (map.getSize().y * 0.64) / 2 - 20]);
    return map.unproject(p, zoom);
  }

  // If the pin is still inside a cluster after the flight, zoom further or fan
  // the cluster out (jars at the same beach share coordinates) until it shows.
  function revealMarker(jar) {
    var m = markers[jar.id];
    var parent = cluster.getVisibleParent(m);
    if (!parent || parent === m) return;
    var here = m.getLatLng();
    var stacked = parent.getAllChildMarkers().every(function (k) { return k.getLatLng().equals(here); });
    if (stacked) parent.spiderfy();
    else cluster.zoomToShowLayer(m, function () { decorate(m, jar); });
  }

  // ---------- card ----------
  function openJar(jar, opts) {
    opts = opts || {};
    if (drawer.hidden) lastFocus = document.activeElement;
    $('hint').hidden = true;
    if (markers[jar.id]) markers[jar.id].closeTooltip();
    setSelected(jar);
    renderCard(jar);
    drawer.hidden = false;
    document.querySelector('.stage').classList.add('card-open');
    updateWorldButton();
    if (jar.latitude != null && opts.fly) {
      var z = Math.max(jar.zoom || 12, 3);
      var target = offsetTarget(L.latLng(jar.latitude, jar.longitude), z);
      // Wait for the clusters to regroup at the new zoom before revealing the pin.
      map.once('moveend', function () { setTimeout(function () { if (current === jar) revealMarker(jar); }, 350); });
      map.flyTo(target, z, { duration: reduceMotion() ? 0 : 1.6 });
    } else if (jar.latitude != null) {
      revealMarker(jar);
    }
    card.scrollTop = 0;
    card.focus({ preventScroll: true });
  }

  function closeCard() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.querySelector('.stage').classList.remove('card-open');
    setSelected(null);
    updateWorldButton();
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function returnToWorld() {
    closeCard();
    cluster.unspiderfy();
    map.flyToBounds(WORLD, { duration: reduceMotion() ? 0 : 1.4 });
  }

  function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // The card reads top-down in a glance: photo, name, tags, one interesting
  // line, three quick facts, Wikipedia. Everything longer sits under "More".
  function renderCard(jar) {
    card.textContent = '';
    card.setAttribute('tabindex', '-1');
    card.className = 'drawer-body card' + (isNonBeach(jar) ? ' nonbeach' : '');

    if (jar.image) card.appendChild(renderPhoto(jar));

    var inner = el('div', { class: 'card-inner' });
    card.appendChild(inner);
    inner.appendChild(el('p', { class: 'card-meta', text: jar.id + (jar.country ? ' · ' + jar.country : '') }));
    inner.appendChild(el('h2', { class: 'card-title', id: 'card-title', text: jar.category === 'empty' ? 'Empty jar awaiting sand' : jar.place }));
    inner.appendChild(el('p', { class: 'label-quote' }, ['Label: ', el('q', { text: jar.label_as_written })]));

    var tags = el('ul', { class: 'tags', 'aria-label': 'About this jar' });
    if (jar.category === 'not_a_beach') tags.appendChild(el('li', { class: 'tag tag-nonbeach', text: 'Not a beach' }));
    if (jar.category === 'country_only') tags.appendChild(el('li', { class: 'tag', text: 'Country only' }));
    if (jar.category === 'empty') tags.appendChild(el('li', { class: 'tag', text: 'Empty jar' }));
    if (jar.approximate) tags.appendChild(el('li', { class: 'tag', text: 'Approximate place' }));
    if (jar.confidence === 'low') tags.appendChild(el('li', { class: 'tag', text: 'Name unresolved' }));
    else if (jar.confidence === 'medium') tags.appendChild(el('li', { class: 'tag', text: 'Label partly cut off' }));
    if (tags.children.length) inner.appendChild(tags);

    // One short caveat line at most; the full explanation is under More.
    var caveat = CONFIDENCE_NOTE[jar.confidence] || (jar.approximate ? jar.approx_note : '');
    if (jar.category === 'empty') caveat = 'Genuinely empty glass with no tag, so it has no pin on the map.';
    if (caveat) inner.appendChild(el('p', { class: 'caveat', text: caveat }));

    if (jar.sand) renderGlance(jar, inner);

    var group = jar.duplicate_group ? byGroup[jar.duplicate_group] : null;
    if (group && group.length > 1) {
      var list = el('ul');
      group.forEach(function (j) {
        var b = el('button', { type: 'button', class: 'btn', text: j.id });
        if (j.id === jar.id) b.setAttribute('aria-current', 'true');
        else b.addEventListener('click', function () { openJar(j, { fly: false }); track('open-sibling', 'Switched to another jar from the same beach'); });
        list.appendChild(el('li', null, [b]));
      });
      inner.appendChild(el('div', { class: 'dupes' }, [group.length + ' jars from this beach. Each has its own label:', list]));
    }

    inner.appendChild(renderMore(jar));
    inner.appendChild(el('p', { class: 'foot', text: [jar.shelf_group && 'Shelf ' + jar.shelf_group, jar.photo && 'Photo ' + jar.photo].filter(Boolean).join(' · ') }));
  }

  // Photo from Wikimedia Commons, credited as its licence requires.
  function renderPhoto(jar) {
    var im = jar.image;
    var img = el('img', { alt: im.caption || jar.place, loading: 'lazy', decoding: 'async', src: im.src, width: '960', height: '600' });
    if (im.srcset) { img.setAttribute('srcset', im.srcset); img.setAttribute('sizes', '(max-width: 720px) 100vw, 400px'); }
    var fig = el('figure', { class: 'photo' }, [img]);
    img.addEventListener('load', function () { img.classList.add('loaded'); });
    img.addEventListener('error', function () { fig.remove(); });
    var credit = el('span', null, ['Photo: ', el('a', { href: im.page, target: '_blank', rel: 'noopener', text: (im.artist || 'Wikimedia Commons') + ', ' + im.licence })]);
    fig.appendChild(el('figcaption', null, [im.caption || '', credit]));
    return fig;
  }

  function renderGlance(jar, inner) {
    var s = jar.sand;
    if (s.known && s.highlight) inner.appendChild(el('p', { class: 'highlight', text: s.highlight }));
    else inner.appendChild(el('p', { class: 'highlight unknown', text: 'What this sand is made of is not published. The jar is on the map from its label.' }));

    var g = s.glance || {};
    var rows = [['Colour', g.colour], ['Made of', g.made_of], ['From', g.from]].filter(function (r) { return r[1]; });
    if (rows.length) {
      var dl = el('dl', { class: 'glance' });
      rows.forEach(function (r) { dl.appendChild(el('div', null, [el('dt', { text: r[0] }), el('dd', { text: r[1] })])); });
      inner.appendChild(dl);
    }

    if (jar.wikipedia && /^https:\/\/en\.wikipedia\.org\//.test(jar.wikipedia.url)) {
      var a = el('a', { href: jar.wikipedia.url, target: '_blank', rel: 'noopener', text: 'Read about ' + jar.wikipedia.title + ' on Wikipedia ↗' });
      a.addEventListener('click', function () { track('wikipedia', 'Opened a Wikipedia link'); });
      inner.appendChild(el('p', { class: 'links' }, [a]));
    }
  }

  // Full research, sources and inventory notes, folded away.
  function renderMore(jar) {
    var d = el('details', { class: 'more' }, [el('summary', { text: jar.sand ? 'More about this ' + (isNonBeach(jar) ? 'material' : 'sand') : 'Inventory details' })]);
    d.addEventListener('toggle', function () { if (d.open) track('more', 'Opened More on a card'); });
    var s = jar.sand;
    if (s) {
      d.appendChild(el('p', { text: s.summary }));
      var facts = el('dl', { class: 'facts' });
      [['Why that colour', s.why_this_colour], ['Grain', s.grain]].forEach(function (r) {
        if (r[1] && r[1] !== 'not published') { facts.appendChild(el('dt', { text: r[0] })); facts.appendChild(el('dd', { text: r[1] })); }
      });
      if (facts.children.length) d.appendChild(facts);
    }
    var inv = el('dl', { class: 'facts' });
    [['Location', jar.approximate ? jar.approx_note : ''], ['Inventory note', jar.notes]].forEach(function (r) {
      if (r[1]) { inv.appendChild(el('dt', { text: r[0] })); inv.appendChild(el('dd', { text: r[1] })); }
    });
    if (inv.children.length) d.appendChild(inv);
    if (s && s.sources && s.sources.length) {
      var ul = el('ul');
      s.sources.forEach(function (u) {
        if (!/^https?:\/\//.test(u)) return;
        var host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
        ul.appendChild(el('li', null, [el('a', { href: u, target: '_blank', rel: 'noopener', text: host })]));
      });
      d.appendChild(el('div', { class: 'sources' }, ['Sources', ul]));
    }
    return d;
  }

  // ---------- stats (all computed from the data file) ----------
  function renderStats() {
    var places = {}, countries = {}, continents = {}, missing = false, notBeach = 0;
    jars.forEach(function (j) {
      if (j.place_key) places[j.place_key] = 1;
      if (j.country) {
        countries[j.country] = 1;
        if (CONTINENT[j.country]) continents[CONTINENT[j.country]] = 1; else missing = true;
      }
      if (j.category === 'not_a_beach') notBeach++;
    });
    var items = [
      [jars.length, 'jars'],
      [Object.keys(places).length, 'places'],
      [Object.keys(countries).length, 'countries & territories']
    ];
    if (!missing) items.push([Object.keys(continents).length, 'continents']);
    items.push([jars.length - notBeach - (jars.length - pinned.length), 'beaches'], [notBeach, 'not beaches']);
    var ul = $('stats');
    items.forEach(function (it) { ul.appendChild(el('li', null, [el('b', { text: String(it[0]) }), it[1]])); });
  }

  // ---------- random ----------
  function randomJar() {
    if (!pinned.length) return;
    var pick;
    do { pick = pinned[Math.floor(Math.random() * pinned.length)]; }
    while (pinned.length > 1 && current && pick.id === current.id);
    cluster.unspiderfy();
    openJar(pick, { fly: true });
    track('random', 'Pressed Random jar');
  }

  // ---------- wire up ----------
  function start(data) {
    jars = data;
    pinned = jars.filter(function (j) { return j.latitude != null && j.longitude != null; });
    jars.forEach(function (j) { if (j.duplicate_group) (byGroup[j.duplicate_group] = byGroup[j.duplicate_group] || []).push(j); });

    renderStats();
    initMap();
    addMarkers();

    // The key starts open on wide screens and folded on phones.
    if (WIDE.matches) $('legend').open = true;

    $('random').addEventListener('click', randomJar);
    $('back').addEventListener('click', returnToWorld);
    worldBtn.addEventListener('click', returnToWorld);
    $('close').addEventListener('click', closeCard);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCard();
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList) {
        // Enter or Space on a focused pin opens its card...
        if (e.target.classList.contains('pin') && e.target.dataset.id) {
          e.preventDefault();
          var jar = jars.filter(function (j) { return j.id === e.target.dataset.id; })[0];
          if (jar) openJar(jar, { fly: true });
        }
        // ...and on a focused cluster zooms into it.
        if (e.target.classList.contains('cluster')) {
          e.preventDefault();
          e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      }
    });
    trackTime();
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function () { $('load-error').hidden = false; });
})();
