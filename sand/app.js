/* Sand jars: one world map, one card at a time. Plain JavaScript, no build.
   Everything shown comes from data/sand-jars.json; nothing is hardcoded. */
(function () {
  'use strict';

  var DATA_URL = 'data/sand-jars.json?v=13'; // bump ?v= in index.html and here after every change, so browsers fetch the new files
  var WORLD = L.latLngBounds([[-48, -170], [68, 165]]);
  var pinBounds = null;  // phones fit the pins' own extent, so the map is as large as it can be with every pin in view
  var WIDE = window.matchMedia('(min-width: 721px)');
  var HOVER = window.matchMedia('(hover: hover)');
  var GAP = 12;          // matches --gap in style.css
  var SHEET = 0.6;       // the phone card's resting height, as a share of the screen (--sheet-h)
  var SEEN_KEY = 'sand-intro-seen';

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
  var drawer = $('drawer'), card = $('card'), worldBtn = $('world'), intro = $('intro');
  var stage = document.querySelector('.stage'), bar = document.querySelector('.bar');
  var jars = [], pinned = [], markers = {}, byGroup = {};
  var current = null, lastFocus = null, map;
  function worldBounds() { return WIDE.matches || !pinBounds ? WORLD : pinBounds; }
  var cardOpen = false, closing = null, swapToken = 0;

  function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function barHeight() { return bar.offsetHeight; }
  // The header's height changes with screen width (the stats wrap to a second
  // row on narrow screens); everything placed below it reads --bar-h.
  function syncBar() { document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px'); }
  function canAnimate(n) { return !reduceMotion() && n && typeof n.animate === 'function'; }

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

  // A shelf code in monospace with its R and J in light blue: R6J10 = row 6, jar 10.
  function codeEl(code) {
    var n = el('span', { class: 'code' });
    String(code).split(/([RJ])/).forEach(function (part) {
      if (part === 'R' || part === 'J') n.appendChild(el('b', { class: 'rj', text: part }));
      else if (part) n.appendChild(document.createTextNode(part));
    });
    return n;
  }

  // ---------- intro ----------
  // Shown on a visitor's first visit only. The browser remembers that it was
  // seen in its own local storage (on the visitor's device; never sent
  // anywhere). If storage is blocked, the intro simply shows each visit.
  function seenIntro() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* fine */ } }

  // A link like sand/#R6J10 (from the rarity page) opens that jar straight away, without the intro.
  var deepLink = /^#R\d+J\d+$/i.test(location.hash);
  var firstVisit = !seenIntro() && !deepLink;
  var pinsWaiting = firstVisit && !reduceMotion(); // pins stay hidden until the intro closes, then sweep in
  var markersReady = false, sweepPending = false;

  function openIntro() {
    if (intro.open) return;
    intro.classList.remove('closing');
    if (typeof intro.showModal === 'function') intro.showModal();
    else intro.setAttribute('open', '');
    fitIntro();
  }

  // On wide screens the whole intro must fit in the window, nothing below the
  // fold (Jonas, 2026-11-12): if it is taller than the window, it is scaled
  // down to fit. Phones scroll instead, with the button pinned at the bottom.
  var introPanel = intro.querySelector('.intro-panel');
  function fitIntro() {
    if (!intro.open) return;
    introPanel.style.setProperty('--z', '1');
    introPanel.classList.remove('fitted');
    if (!WIDE.matches) return;
    introPanel.style.minHeight = '0';
    var need = introPanel.scrollHeight;
    introPanel.style.minHeight = '';
    var z = Math.min(1, window.innerHeight / need);
    if (z < 1) { introPanel.classList.add('fitted'); introPanel.style.setProperty('--z', String(Math.max(0.6, z))); }
  }
  window.addEventListener('resize', fitIntro);

  function dismissIntro() {
    if (!intro.open || intro.classList.contains('closing')) return;
    markSeen();
    intro.classList.add('closing'); // fades the panel and clears the blur (style.css)
    setTimeout(function () {
      if (typeof intro.close === 'function') intro.close(); else intro.removeAttribute('open');
      intro.classList.remove('closing');
    }, reduceMotion() ? 0 : 480);
    if (pinsWaiting) { if (markersReady) sweepPins(); else sweepPending = true; }
  }

  // The one signature moment: on the first visit the pins appear in a quick
  // sweep from west to east, showing the collection spread across the world.
  function sweepPins() {
    pinsWaiting = false;
    var box = map.getContainer().getBoundingClientRect();
    var icons = map.getContainer().querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon');
    map.getContainer().classList.remove('pins-hidden');
    if (!icons.length || !canAnimate(icons[0])) return;
    icons.forEach(function (n) {
      var r = n.getBoundingClientRect();
      var t = Math.min(Math.max((r.left + r.width / 2 - box.left) / box.width, 0), 1);
      n.animate([{ opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1 }], {
        duration: 520, delay: 160 + t * 760 + Math.random() * 60,
        easing: 'cubic-bezier(.2,.8,.3,1.15)', fill: 'backwards'
      });
    });
  }

  // ---------- map ----------
  function initMap() {
    map = L.map('map', { worldCopyJump: true, minZoom: 0, maxZoom: 17, zoomSnap: 0.25 });
    map.attributionControl.setPrefix(false); // drop the "Leaflet" label; the OpenStreetMap credit is required and stays
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    // Antarctica (no jars) is painted over in the sea colour: in this projection
    // it is a huge dark slab that made the zoomed-out map, especially on phones,
    // look cut off. It sits above the tiles and below the pins, and ignores clicks.
    map.createPane('cover').style.zIndex = 250;
    L.rectangle([[-89, -900], [-60, 900]], { pane: 'cover', stroke: false, fillColor: '#2F3231', fillOpacity: 1, interactive: false }).addTo(map);
    if (pinsWaiting) map.getContainer().classList.add('pins-hidden');
    // The header floats over the map, so the world is fitted below it.
    map.fitBounds(worldBounds(), { paddingTopLeft: [0, barHeight()], animate: false });
    map.on('zoomend moveend', updateWorldButton);
    // Zoomed out, pins are drawn a little smaller so more of them fit side by side.
    var setFar = function () {
      var z = map.getZoom(), c = map.getContainer().classList;
      c.toggle('far', z < 3 && z >= 1.5);
      c.toggle('farthest', z < 1.5); // the phone's world view: smallest dots, so packed groups stay near their real places
    };
    map.on('zoomend', setFar); setFar();
  }

  function worldZoom() { return map.getBoundsZoom(worldBounds(), false, L.point(0, barHeight())); }
  function updateWorldButton() {
    worldBtn.hidden = cardOpen || map.getZoom() <= worldZoom() + 0.5;
  }

  function isNonBeach(jar) { return jar.category === 'not_a_beach'; }

  function pinIcon(jar, selected) {
    var cls = 'pin' + (isNonBeach(jar) ? ' nonbeach' : '') + (jar.approximate ? ' approx' : '') + (selected ? ' selected' : '');
    var size = jar.approximate ? 16 : 14;
    return L.divIcon({ className: cls, html: '<span></span>', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }

  function pinLabel(jar) {
    return jar.shelf_code + ', ' + jar.place + (isNonBeach(jar) ? ' (not a beach)' : '') + (jar.approximate ? ' (approximate location)' : '');
  }

  // Every jar is its own dot (Jonas, 2026-11-12: landing on the map should
  // show that there are over a hundred). Where jars are closer than a dot's
  // width, their dots are nudged apart just enough to sit side by side around
  // the true spot; zooming in spreads them back to their exact places.
  function addMarkers() {
    pinned.forEach(function (jar) {
      var m = L.marker([jar.latitude, jar.longitude], {
        icon: pinIcon(jar, false), keyboard: true, alt: pinLabel(jar), riseOnHover: true
      });
      // Name on hover (mouse only; on touch screens a tap opens the card straight away).
      if (HOVER.matches) m.bindTooltip(jar.place, { className: 'pin-tip', direction: 'top', offset: [0, -10] });
      m.on('click', function () { openJar(jar, { fly: true }); track('open-pin', 'Opened a jar from the map'); });
      m.on('add', function () { decorate(m, jar); });
      markers[jar.id] = m;
      m.addTo(map);
    });
    layoutPins(false);
    map.on('zoomend', function () { layoutPins(true); });
    markersReady = true;
    if (sweepPending) requestAnimationFrame(sweepPins);
  }

  function dotScale(z) { return z < 1.5 ? 0.5 : z < 3 ? 0.72 : 1; } // matches .farthest / .far in style.css
  function dotRadius(jar, z) { return (jar.approximate ? 16 : 14) * dotScale(z) / 2; }

  function layoutPins(animate) {
    var z = map.getZoom(), GAP_PX = 1.5;
    var pts = pinned.map(function (jar, i) {
      var a = map.project([jar.latitude, jar.longitude], z);
      var ang = i * 2.399963; // jars at exactly the same spot start on a tiny spiral so they can separate
      return { jar: jar, ax: a.x, ay: a.y, x: a.x + Math.cos(ang) * 0.5, y: a.y + Math.sin(ang) * 0.5, r: dotRadius(jar, z) };
    });
    for (var it = 0; it < 160; it++) {
      var moved = false;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var p = pts[i], q = pts[j], dx = q.x - p.x, dy = q.y - p.y, min = p.r + q.r + GAP_PX;
          if (dx >= min || dx <= -min || dy >= min || dy <= -min) continue;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (dist >= min) continue;
          var push = (min - dist) / 2, ux = dx / dist, uy = dy / dist;
          p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push;
          moved = true;
        }
      }
      // A gentle pull back toward each true spot keeps the packed groups tight;
      // the last rounds only separate, so no two dots end up overlapping.
      if (it < 120) pts.forEach(function (t) { t.x += (t.ax - t.x) * 0.03; t.y += (t.ay - t.y) * 0.03; });
      else if (!moved) break;
    }
    var box = map.getContainer();
    if (animate && !reduceMotion()) {
      box.classList.add('settling');
      clearTimeout(layoutPins.t);
      layoutPins.t = setTimeout(function () { box.classList.remove('settling'); }, 360);
    }
    pts.forEach(function (t) { markers[t.jar.id].setLatLng(map.unproject([t.x, t.y], z)); });
  }

  function decorate(m, jar) {
    var node = m.getElement();
    if (!node) return;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', 'Open jar ' + pinLabel(jar));
    node.dataset.id = jar.id;
    if (current && current.id === jar.id) node.setAttribute('aria-pressed', 'true');
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

  // Fly so the pin lands in the part of the map that the header and the card
  // do not cover.
  function offsetTarget(latlng, zoom) {
    var p = map.project(latlng, zoom);
    var top = barHeight();
    if (WIDE.matches) p = p.add([((drawer.offsetWidth || 400) + GAP) / 2, -top / 2]);
    else p = p.add([0, (map.getSize().y * SHEET - top) / 2]);
    return map.unproject(p, zoom);
  }

  // One orange pulse around the pin when the map arrives, so the eye finds it.
  function pulse(jar) {
    var m = markers[jar.id], n = m && m.getElement();
    if (!n || current !== jar || reduceMotion()) return;
    n.classList.remove('arrive');
    void n.offsetWidth; // restart the animation
    n.classList.add('arrive');
    setTimeout(function () { n.classList.remove('arrive'); }, 1100);
  }

  function revealMarker(jar) { pulse(jar); }

  // ---------- card ----------
  function openJar(jar, opts) {
    opts = opts || {};
    var wasOpen = cardOpen && !drawer.hidden && !closing;
    if (closing) { closing.cancel(); closing = null; }
    if (!cardOpen) lastFocus = document.activeElement;
    cardOpen = true;
    if (markers[jar.id]) markers[jar.id].closeTooltip();
    setSelected(jar);
    if (wasOpen) swapCard(jar);
    else { renderCard(jar); drawer.hidden = false; card.scrollTop = 0; }
    stage.classList.add('card-open');
    updateWorldButton();
    if (jar.latitude != null && opts.fly) {
      var z = Math.max(jar.zoom || 12, 3);
      var target = offsetTarget(L.latLng(jar.latitude, jar.longitude), z);
      // Pulse the pin once the dots have settled at the new zoom.
      map.once('moveend', function () { setTimeout(function () { if (current === jar) revealMarker(jar); }, 350); });
      map.flyTo(target, z, { duration: reduceMotion() ? 0 : 1.6 });
    } else if (jar.latitude != null) {
      revealMarker(jar);
    }
    card.focus({ preventScroll: true });
  }

  // Switching jars while the card is open: the old content fades up and out,
  // the new one settles in, instead of an abrupt swap.
  function swapCard(jar) {
    var token = ++swapToken;
    if (!canAnimate(card)) { renderCard(jar); card.scrollTop = 0; return; }
    card.getAnimations().forEach(function (a) { a.cancel(); });
    var out = card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }],
      { duration: 130, easing: 'ease-in', fill: 'forwards' });
    out.onfinish = function () {
      if (token !== swapToken) return; // a newer jar was picked meanwhile
      renderCard(jar);
      card.scrollTop = 0;
      out.cancel();
      card.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
    };
  }

  function closeCard() {
    if (!cardOpen) return;
    cardOpen = false;
    stage.classList.remove('card-open');
    setSelected(null);
    updateWorldButton();
    var finish = function () {
      if (cardOpen) return;
      drawer.hidden = true;
      drawer.style.height = '';
      stage.classList.remove('sheet-full');
    };
    if (!canAnimate(drawer)) finish();
    else {
      var kf = WIDE.matches
        ? [{ transform: 'none', opacity: 1 }, { transform: 'translateX(28px)', opacity: 0 }]
        : [{ transform: 'none' }, { transform: 'translateY(100%)' }];
      var anim = drawer.animate(kf, { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      closing = anim;
      anim.onfinish = function () { if (closing === anim) { closing = null; finish(); anim.cancel(); } };
    }
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function returnToWorld() {
    closeCard();
    map.flyToBounds(worldBounds(), { paddingTopLeft: [0, barHeight()], duration: reduceMotion() ? 0 : 1.4 });
  }

  // Phones: the card is a bottom sheet. Drag its handle up to read more, down
  // to close; a tap on the handle switches between half and full height.
  function initSheetDrag() {
    var head = $('drawer-head');
    var startY = 0, startH = 0, lastY = 0, lastT = 0, vel = 0, dragging = false, moved = false;
    head.addEventListener('pointerdown', function (e) {
      if (WIDE.matches || e.button > 0 || e.target.closest('button')) return;
      dragging = true; moved = false; vel = 0;
      startY = lastY = e.clientY; lastT = e.timeStamp; startH = drawer.offsetHeight;
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = e.clientY - startY;
      if (!moved && Math.abs(dy) < 6) return;
      if (!moved) { moved = true; drawer.classList.add('dragging'); }
      vel = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = e.clientY; lastT = e.timeStamp;
      var max = stage.clientHeight - barHeight() - 8;
      drawer.style.height = Math.max(60, Math.min(max, startH - dy)) + 'px';
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      drawer.classList.remove('dragging');
      if (!moved) { stage.classList.toggle('sheet-full'); return; }
      var H = stage.clientHeight, half = H * SHEET, full = H - barHeight() - 8;
      var projected = drawer.offsetHeight - vel * 220; // a quick flick carries further
      var stops = [[0, 'close'], [half, 'half'], [full, 'full']];
      var pick = stops.reduce(function (a, b) { return Math.abs(b[0] - projected) < Math.abs(a[0] - projected) ? b : a; });
      if (pick[1] === 'close') { closeCard(); return; } // keeps its dragged height while it slides away
      drawer.style.height = '';
      stage.classList.toggle('sheet-full', pick[1] === 'full');
    }
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }

  // The card reads top-down in a glance: photo, name, tags, one interesting
  // line, three quick facts, Wikipedia. Everything longer sits under "More".
  function renderCard(jar) {
    card.textContent = '';
    card.setAttribute('tabindex', '-1');
    card.className = 'drawer-body card' + (isNonBeach(jar) ? ' nonbeach' : '');

    if (jar.image) card.appendChild(renderPhoto(jar));

    var inner = el('div', { class: 'card-inner' });
    card.appendChild(inner);
    // The jar's shelf code: R = row, J = jar in that row, counting from the left.
    inner.appendChild(el('p', { class: 'card-meta' }, [codeEl(jar.shelf_code), jar.country ? ' · ' + jar.country : '']));
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
        var b = el('button', { type: 'button', class: 'btn' }, [codeEl(j.shelf_code)]);
        if (j.id === jar.id) b.setAttribute('aria-current', 'true');
        else b.addEventListener('click', function () { openJar(j, { fly: false }); track('open-sibling', 'Switched to another jar from the same beach'); });
        list.appendChild(el('li', null, [b]));
      });
      inner.appendChild(el('div', { class: 'dupes' }, [group.length + ' jars from this beach. Each has its own label:', list]));
    }

    inner.appendChild(renderMore(jar));
    inner.appendChild(el('p', { class: 'foot', text: ['Inventory ' + jar.id, jar.shelf_group && 'Row ' + jar.shelf_group, jar.photo && 'Photo ' + jar.photo].filter(Boolean).join(' · ') }));
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
  // Each number in the header is a button that opens a small panel listing
  // the jars behind it (Jonas, 2026-11-12). Every jar listed opens its card.
  var panel = $('panel'), openPanelKey = null;

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
    var nPlaces = Object.keys(places).length, nCountries = Object.keys(countries).length;
    var items = [[jars.length, 'jars', 'jars'], [nPlaces, 'places', 'places'], [nCountries, 'countries & territories', 'countries']];
    if (!missing) items.push([Object.keys(continents).length, 'continents', 'continents']);
    items.push([jars.length - notBeach - (jars.length - pinned.length), 'beaches', 'beaches'], [notBeach, 'not beaches', 'nonbeach']);
    var ul = $('stats');
    items.forEach(function (it) {
      var b = el('button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'panel' }, [el('b', { text: String(it[0]) }), it[1]]);
      b.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(it[2], it[0], it[1], b); });
      ul.appendChild(el('li', null, [b]));
    });

    // The intro's line: jars, places, countries.
    var line = $('intro-stats');
    [[jars.length, 'jars'], [nPlaces, 'places'], [nCountries, 'countries and territories']].forEach(function (it, i) {
      if (i) line.appendChild(el('span', { class: 'dot', 'aria-hidden': 'true', text: '·' }));
      line.appendChild(el('span', null, [el('b', { text: String(it[0]) }), ' ' + it[1]]));
    });
  }

  function togglePanel(key, count, label, btn) {
    if (openPanelKey === key) { closePanel(); return; }
    closePanel();
    panel.textContent = '';
    var close = el('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Close list', text: '×' });
    close.addEventListener('click', function () { closePanel(); btn.focus(); });
    panel.appendChild(el('div', { class: 'panel-head' }, [el('h2', { class: 'panel-title' }, [el('b', { text: String(count) }), ' ' + label]), close]));
    PANELS[key](panel);
    panel.hidden = false;
    panel.scrollTop = 0;
    btn.setAttribute('aria-expanded', 'true');
    openPanelKey = key;
    if (WIDE.matches) {
      var r = btn.getBoundingClientRect();
      panel.style.left = Math.max(GAP, Math.min(window.innerWidth - panel.offsetWidth - GAP, r.left)) + 'px';
    } else panel.style.left = '';
    track('panel-' + key, 'Opened the ' + label + ' list');
  }

  function closePanel() {
    if (!openPanelKey) return;
    panel.hidden = true;
    var b = document.querySelector('.stats [aria-expanded="true"]');
    if (b) b.setAttribute('aria-expanded', 'false');
    openPanelKey = null;
  }

  // One jar in a list: its place, an optional detail line, and its shelf code.
  function listRow(jar, name, detail) {
    var b = el('button', { type: 'button', class: 'row' }, [
      el('span', { class: 'row-name', text: name || jar.place }),
      el('span', { class: 'row-code' }, [codeEl(jar.shelf_code)]),
      detail ? el('span', { class: 'row-detail', text: detail }) : null
    ]);
    b.addEventListener('click', function () { closePanel(); openJar(jar, { fly: true }); track('open-list', 'Opened a jar from a list'); });
    return b;
  }
  function byPlace(a, b) { return a.place.localeCompare(b.place); }
  function note(text) { return el('p', { class: 'panel-note', text: text }); }
  // A folding group: a name, how many jars, and the jars inside.
  function group(name, list, detailFn) {
    var d = el('details', { class: 'panel-group' }, [el('summary', null, [el('span', { text: name }), el('span', { class: 'row-code', text: list.length + (list.length === 1 ? ' jar' : ' jars') })])]);
    list.forEach(function (j) { d.appendChild(listRow(j, null, detailFn ? detailFn(j) : '')); });
    return d;
  }
  function groupBy(list, keyFn) {
    var out = {};
    list.forEach(function (j) { var k = keyFn(j); (out[k] = out[k] || []).push(j); });
    return out;
  }
  function bySize(groups) {
    return Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length || a.localeCompare(b); });
  }

  var PANELS = {
    jars: function (p) {
      p.appendChild(note('The shelf, row by row. R is the row, J the jar counting from the left.'));
      var rows = groupBy(pinned, function (j) { return parseInt(j.shelf_group, 10); });
      Object.keys(rows).sort(function (a, b) { return a - b; }).forEach(function (r) {
        var list = rows[r].sort(function (a, b) { return a.id.localeCompare(b.id); });
        p.appendChild(el('h3', { class: 'panel-group-title', text: 'Row ' + list[0].shelf_group.replace(/^\d+\s*-\s*/, r + ' · ') }));
        list.forEach(function (j) { p.appendChild(listRow(j)); });
      });
    },
    places: function (p) {
      p.appendChild(note('A to Z. Some places have more than one jar.'));
      var g = groupBy(pinned, function (j) { return j.place_key; });
      Object.keys(g).map(function (k) { return g[k].sort(function (a, b) { return a.id.localeCompare(b.id); }); })
        .sort(function (a, b) { return byPlace(a[0], b[0]); })
        .forEach(function (list) { p.appendChild(listRow(list[0], null, list.length > 1 ? list.length + ' jars' : '')); });
    },
    countries: function (p) {
      p.appendChild(note('Most jars first. Open a country to see its jars.'));
      var g = groupBy(pinned, function (j) { return j.country; });
      bySize(g).forEach(function (c) { p.appendChild(group(c, g[c].sort(byPlace))); });
    },
    continents: function (p) {
      var g = groupBy(pinned, function (j) { return CONTINENT[j.country]; });
      bySize(g).forEach(function (c) {
        p.appendChild(group(c, g[c].sort(function (a, b) { return a.country.localeCompare(b.country) || byPlace(a, b); }), function (j) { return j.country; }));
      });
    },
    beaches: function (p) {
      p.appendChild(note('A to Z.'));
      pinned.filter(function (j) { return !isNonBeach(j); }).sort(byPlace).forEach(function (j) { p.appendChild(listRow(j)); });
    },
    nonbeach: function (p) {
      p.appendChild(note('Sand and soil from places that are not beaches: deserts and canyons, a volcano summit, a glacier, a river, ochre cliffs, mountains and inland towns. They are purple diamonds on the map.'));
      pinned.filter(isNonBeach).sort(byPlace).forEach(function (j) {
        p.appendChild(listRow(j, null, j.sand && j.sand.glance && j.sand.glance.made_of));
      });
    }
  };

  // ---------- random ----------
  function randomJar() {
    if (!pinned.length) return;
    var pick;
    do { pick = pinned[Math.floor(Math.random() * pinned.length)]; }
    while (pinned.length > 1 && current && pick.id === current.id);
    openJar(pick, { fly: true });
    track('random', 'Pressed Random jar');
  }

  // ---------- wire up ----------
  // The intro and its buttons work before the data arrives.
  $('intro-go').addEventListener('click', dismissIntro);
  $('about').addEventListener('click', openIntro);
  intro.addEventListener('cancel', function (e) { e.preventDefault(); dismissIntro(); }); // Escape
  intro.addEventListener('click', function (e) { if (e.target === intro) dismissIntro(); }); // a click beside the text
  if (firstVisit) openIntro();

  function start(data) {
    jars = data;
    pinned = jars.filter(function (j) { return j.latitude != null && j.longitude != null; });
    if (pinned.length) pinBounds = L.latLngBounds(pinned.map(function (j) { return [j.latitude, j.longitude]; })).pad(0.04);
    jars.forEach(function (j) { if (j.duplicate_group) (byGroup[j.duplicate_group] = byGroup[j.duplicate_group] || []).push(j); });

    renderStats();
    syncBar();
    window.addEventListener('resize', syncBar);
    initMap();
    addMarkers();
    initSheetDrag();

    // The key starts open on wide screens and folded on phones.
    if (WIDE.matches) $('legend').open = true;

    $('random').addEventListener('click', randomJar);
    $('back').addEventListener('click', returnToWorld);
    worldBtn.addEventListener('click', returnToWorld);
    $('close').addEventListener('click', closeCard);
    // A click anywhere outside an open list closes it.
    document.addEventListener('click', function (e) {
      if (openPanelKey && !panel.contains(e.target) && !e.target.closest('.stats')) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (intro.open) return; // the intro handles its own keys
      if (e.key === 'Escape') { if (openPanelKey) closePanel(); else closeCard(); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList) {
        // Enter or Space on a focused pin opens its card.
        if (e.target.classList.contains('pin') && e.target.dataset.id) {
          e.preventDefault();
          var jar = jars.filter(function (j) { return j.id === e.target.dataset.id; })[0];
          if (jar) openJar(jar, { fly: true });
        }
      }
    });
    trackTime();
    if (deepLink) {
      var code = location.hash.slice(1).toUpperCase();
      var hit = pinned.filter(function (j) { return j.shelf_code === code; })[0];
      if (hit) openJar(hit, { fly: true });
    }
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function (err) { console.error(err); $('load-error').hidden = false; });
})();
