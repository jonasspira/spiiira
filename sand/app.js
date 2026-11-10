/* Sand jars: one world map, one card at a time. Plain JavaScript, no build.
   Everything shown comes from data/sand-jars.json; nothing is hardcoded. */
(function () {
  'use strict';

  var DATA_URL = 'data/sand-jars.json';
  var WORLD = L.latLngBounds([[-48, -160], [68, 165]]);
  var WIDE = window.matchMedia('(min-width: 721px)');

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
    medium: 'Part of this label is cut off or hard to read; the place name is inferred and not fully verified.',
    low: 'The place name on this label is unresolved. Part of the first word wraps around the jar and cannot be read yet, so the beach is not named here.'
  };

  var $ = function (id) { return document.getElementById(id); };
  var drawer = $('drawer'), card = $('card'), worldBtn = $('world');
  var jars = [], pinned = [], markers = {}, byGroup = {};
  var current = null, lastFocus = null, map, cluster;

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
    map = L.map('map', { worldCopyJump: true, minZoom: 0, maxZoom: 17, zoomSnap: 0.25, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.fitBounds(WORLD, { animate: false });
    map.on('zoomend moveend', updateWorldButton);
  }

  function worldZoom() { return map.getBoundsZoom(WORLD); }
  function updateWorldButton() {
    worldBtn.hidden = !drawer.hidden || map.getZoom() <= worldZoom() + 0.5;
  }

  function pinIcon(jar, selected) {
    var cls = 'pin' + (jar.approximate ? ' approx' : '') + (selected ? ' selected' : '');
    var size = jar.approximate ? 16 : 14;
    return L.divIcon({ className: cls, html: '<span></span>', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  function pinLabel(jar) {
    return jar.id + ', ' + jar.place + (jar.approximate ? ' (approximate location)' : '');
  }

  function addMarkers() {
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 38,
      spiderfyDistanceMultiplier: 1.6,
      iconCreateFunction: function (c) {
        var n = c.getChildCount();
        var s = n < 5 ? 28 : n < 15 ? 34 : 40;
        return L.divIcon({ className: 'cluster', html: '<span>' + n + '</span>', iconSize: [s, s] });
      }
    });
    cluster.on('clustermouseover', function () {});
    // Clusters are markers too: give them a readable label for keyboard and screen-reader users.
    cluster.on('animationend spiderfied unspiderfied', labelClusters);
    map.on('zoomend', labelClusters);

    pinned.forEach(function (jar) {
      var m = L.marker([jar.latitude, jar.longitude], {
        icon: pinIcon(jar, false), keyboard: true, title: pinLabel(jar), alt: pinLabel(jar), riseOnHover: true
      });
      m.on('click', function () { openJar(jar, { fly: true }); });
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
    else p = p.add([0, (map.getSize().y * 0.58) / 2 - 20]);
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

  function renderCard(jar) {
    card.textContent = '';
    card.setAttribute('tabindex', '-1');

    card.appendChild(el('p', { class: 'card-meta', text: jar.id + (jar.country ? ' · ' + jar.country : '') }));
    card.appendChild(el('h2', { class: 'card-title', id: 'card-title', text: jar.category === 'empty' ? 'Empty jar awaiting sand' : jar.place }));
    card.appendChild(el('p', { class: 'label-quote' }, ['Label: ', el('q', { text: jar.label_as_written })]));

    var tags = el('ul', { class: 'tags', 'aria-label': 'About this jar' });
    if (jar.category === 'not_a_beach') tags.appendChild(el('li', { class: 'tag tag-sand', text: 'Not a beach' }));
    if (jar.category === 'country_only') tags.appendChild(el('li', { class: 'tag tag-sand', text: 'Country only' }));
    if (jar.category === 'empty') tags.appendChild(el('li', { class: 'tag tag-sand', text: 'Empty jar' }));
    if (jar.approximate) tags.appendChild(el('li', { class: 'tag tag-warn', text: 'Approx. location' }));
    if (jar.confidence === 'low') tags.appendChild(el('li', { class: 'tag tag-warn', text: 'Name unresolved' }));
    tags.appendChild(el('li', { class: 'tag' + (jar.confidence === 'high' ? '' : ' tag-warn'), text: 'Confidence: ' + jar.confidence }));
    card.appendChild(tags);

    if (CONFIDENCE_NOTE[jar.confidence]) card.appendChild(el('p', { class: 'notice', text: CONFIDENCE_NOTE[jar.confidence] }));
    if (jar.approximate && jar.approx_note) {
      card.appendChild(el('p', { class: 'notice' }, [el('strong', { text: 'Approximate location. ' }), jar.approx_note]));
    }
    if (jar.category === 'empty') {
      card.appendChild(el('p', { class: 'notice', text: 'This jar is genuinely empty glass with no tag, so it has no place and no pin on the map.' }));
    }

    var group = jar.duplicate_group ? byGroup[jar.duplicate_group] : null;
    if (group && group.length > 1) {
      var list = el('ul');
      group.forEach(function (j) {
        var b = el('button', { type: 'button', class: 'btn', text: j.id });
        if (j.id === jar.id) b.setAttribute('aria-current', 'true');
        else b.addEventListener('click', function () { openJar(j, { fly: false }); });
        list.appendChild(el('li', null, [b]));
      });
      card.appendChild(el('div', { class: 'dupes' }, [group.length + ' jars from this beach. Each has its own label:', list]));
    }

    if (jar.sand) card.appendChild(renderSand(jar));

    var sec = el('dl');
    [['Shelf', jar.shelf_group], ['Photo', jar.photo], ['Inventory note', jar.notes]].forEach(function (r) {
      if (r[1]) { sec.appendChild(el('dt', { text: r[0] })); sec.appendChild(el('dd', { text: r[1] })); }
    });
    card.appendChild(el('div', { class: 'secondary' }, [sec]));
  }

  function renderSand(jar) {
    var s = jar.sand;
    var box = el('section', { class: 'sand', 'aria-label': 'The sand' }, [el('h3', { text: jar.category === 'not_a_beach' ? 'The material' : 'The sand' })]);
    box.appendChild(el('p', { text: s.summary }));
    if (s.known) {
      var facts = el('dl', { class: 'facts' });
      [['Colour', s.colour], ['Made of', s.composition], ['Comes from', s.origin], ['Why that colour', s.why_this_colour], ['Grain', s.grain]].forEach(function (r) {
        if (r[1]) { facts.appendChild(el('dt', { text: r[0] })); facts.appendChild(el('dd', { text: r[1] })); }
      });
      box.appendChild(facts);
    }
    if (s.sources && s.sources.length) {
      var ul = el('ul');
      s.sources.forEach(function (u) {
        if (!/^https?:\/\//.test(u)) return;
        var host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
        ul.appendChild(el('li', null, [el('a', { href: u, target: '_blank', rel: 'noopener', text: host })]));
      });
      box.appendChild(el('div', { class: 'sources' }, ['Sources', ul]));
    }
    return box;
  }

  // ---------- stats (all computed from the data file) ----------
  function renderStats() {
    var places = {}, countries = {}, continents = {}, missing = false, beach = 0, notBeach = 0;
    jars.forEach(function (j) {
      if (j.place_key) places[j.place_key] = 1;
      if (j.country) {
        countries[j.country] = 1;
        if (CONTINENT[j.country]) continents[CONTINENT[j.country]] = 1; else missing = true;
      }
      if (j.category === 'not_a_beach') notBeach++;
      else if (j.category === 'beach' || j.category === 'country_only') beach++;
    });
    var items = [
      [jars.length, 'jars'],
      [pinned.length, 'pins'],
      [Object.keys(places).length, 'places'],
      [Object.keys(countries).length, 'countries & territories']
    ];
    if (!missing) items.push([Object.keys(continents).length, 'continents']);
    items.push([beach, 'beaches'], [notBeach, 'not beaches']);
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
  }

  // ---------- wire up ----------
  function start(data) {
    jars = data;
    pinned = jars.filter(function (j) { return j.latitude != null && j.longitude != null; });
    jars.forEach(function (j) { if (j.duplicate_group) (byGroup[j.duplicate_group] = byGroup[j.duplicate_group] || []).push(j); });

    renderStats();
    initMap();
    addMarkers();

    var empty = jars.filter(function (j) { return j.category === 'empty'; });
    if (empty.length) {
      var b = $('empty-jar');
      b.textContent = empty.map(function (j) { return j.id; }).join(', ') + ': empty jar awaiting sand';
      b.hidden = false;
      b.addEventListener('click', function () { openJar(empty[0], { fly: false }); });
    }

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
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function () { $('load-error').hidden = false; });
})();
