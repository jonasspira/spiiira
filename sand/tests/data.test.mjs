// Checks the rules sand/AGENTS.md says must not change. Run from the repo root:
//   node --test sand/tests/data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const jars = JSON.parse(fs.readFileSync(new URL('../data/sand-jars.json', import.meta.url), 'utf8'));
const pinned = jars.filter(j => j.latitude != null);
const byId = Object.fromEntries(jars.map(j => [j.id, j]));
const CATEGORIES = new Set(['beach', 'not_a_beach', 'country_only', 'empty']);

test('all 129 jars, SJ-001 to SJ-129, each once', () => {
  assert.equal(jars.length, 129);
  jars.forEach((j, i) => assert.equal(j.id, 'SJ-' + String(i + 1).padStart(3, '0')));
});

test('confidence totals match the inventory', () => {
  const c = {};
  jars.forEach(j => { c[j.confidence] = (c[j.confidence] || 0) + 1; });
  assert.deepEqual(c, { high: 117, medium: 11, low: 1 });
});

test('118 distinct places once label variants are merged', () => {
  assert.equal(new Set(jars.filter(j => j.place_key).map(j => j.place_key)).size, 118);
});

test('SJ-025 is the only jar with no pin', () => {
  assert.equal(pinned.length, 128);
  const e = byId['SJ-025'];
  assert.equal(e.category, 'empty');
  assert.equal(e.latitude, null);
  assert.equal(e.sand, null);
});

test('SJ-121 stays unresolved, low confidence and approximate', () => {
  const z = byId['SJ-121'];
  assert.equal(z.confidence, 'low');
  assert.equal(z.approximate, true);
  assert.match(z.place, /^\[\?\]/);
});

test('every pinned jar has real-looking coordinates, a source and a sand profile', () => {
  for (const j of pinned) {
    assert.ok(CATEGORIES.has(j.category), j.id);
    assert.ok(Math.abs(j.latitude) <= 90 && Math.abs(j.longitude) <= 180, j.id);
    assert.match(j.geocode.osm, /^(node|way|relation)\/\d+$/, j.id);
    assert.ok(j.country, j.id);
    assert.ok(j.sand && j.sand.summary, j.id + ' has no sand summary');
    if (j.sand.known) assert.ok(j.sand.sources.length > 0, j.id + ' claims a known composition with no source');
    if (j.approximate) assert.ok(j.approx_note, j.id + ' is approximate with no explanation');
  }
});

test('duplicate groups match the inventory', () => {
  const g = {};
  jars.forEach(j => { if (j.duplicate_group) g[j.duplicate_group] = (g[j.duplicate_group] || 0) + 1; });
  assert.deepEqual(g, { daytona: 2, pensacola: 2, nassau: 2, barcelona: 2, manhattan: 2, santamonica: 2, venice: 3, eleuthera: 2, papagayo: 2 });
  assert.notEqual(byId['SJ-053'].sand.summary, byId['SJ-060'].sand.summary, 'the two Santorini sands must differ');
});

test('cards have a short highlight, quick facts and a Wikipedia link', () => {
  for (const j of pinned) {
    const s = j.sand;
    if (s.known) assert.ok(s.highlight, j.id + ' has no highlight');
    else assert.equal(s.highlight, '', j.id + ' has a highlight but no published composition');
    if (s.highlight) assert.ok(s.highlight.split(/\s+/).length <= 26, j.id + ' highlight is too long to glance at');
    assert.ok(s.glance && 'colour' in s.glance && 'made_of' in s.glance && 'from' in s.glance, j.id);
    for (const v of Object.values(s.glance)) assert.ok(v.split(/\s+/).length <= 8, j.id + ' quick fact too long: ' + v);
    assert.ok(j.wikipedia === null || /^https:\/\/en\.wikipedia\.org\/wiki\//.test(j.wikipedia.url), j.id);
  }
});

test('card photos come from Wikimedia Commons with a free licence and a credit', () => {
  for (const j of pinned) {
    if (!j.image) continue;
    const im = j.image;
    assert.match(im.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^?]+$/, j.id);
    assert.match(im.page, /^https:\/\/commons\.wikimedia\.org\//, j.id);
    assert.match(im.licence, /^(CC BY|CC0|Public domain|PD)/i, j.id + ' licence: ' + im.licence);
    assert.doesNotMatch(im.licence, /NC|ND/, j.id + ' licence forbids reuse: ' + im.licence);
    assert.ok(im.caption && im.caption.split(/\s+/).length <= 12, j.id + ' caption');
  }
});

test('the country-only jars are Hawaii, Iceland and Nicaragua', () => {
  assert.deepEqual(jars.filter(j => j.category === 'country_only').map(j => j.id), ['SJ-054', 'SJ-057', 'SJ-091']);
});
