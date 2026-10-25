'use strict';
const TZ = 'Asia/Dubai';

const FEEDS = /*feeds*/[
  {"key":"epl","name":"Premier League","path":"soccer/eng.1","policy":"all"},
  {"key":"laliga","name":"La Liga","path":"soccer/esp.1","policy":"all"},
  {"key":"seriea","name":"Serie A","path":"soccer/ita.1","policy":"all"},
  {"key":"ucl","name":"Champions League","path":"soccer/uefa.champions","policy":"all"},
  {"key":"uel","name":"Europa League","path":"soccer/uefa.europa","policy":"teams"},
  {"key":"uecl","name":"Conference League","path":"soccer/uefa.europa.conf","policy":"teams"},
  {"key":"f1","name":"Formula 1","path":"racing/f1","policy":"f1"},
  {"key":"ufc","name":"UFC","path":"mma/ufc","policy":"ufc"},
  {"key":"rlwc","name":"Rugby League World Cup","path":"bbc:rugby-league","policy":"kangaroos"},
  {"key":"nrl","name":"NRL — Bulldogs","path":"rugby-league/3","policy":"teams"},
  {"key":"afl","name":"AFL — Sydney Swans","path":"australian-football/afl","policy":"teams"},
  {"key":"aleague","name":"A-League — Sydney FC","path":"soccer/aus.1","policy":"teams"},
  {"key":"saudi","name":"Saudi Pro League — Al Hilal","path":"soccer/ksa.1","policy":"teams"},
  {"key":"superrugby","name":"Super Rugby — Waratahs","path":"rugby/242041","policy":"teams"},
  {"key":"wallabies","name":"Wallabies","path":"rugby/289234","policy":"national"},
  {"key":"socceroos","name":"Socceroos (men's friendlies)","path":"soccer/fifa.friendly","policy":"national"},
  {"key":"matildas","name":"Matildas (women's friendlies)","path":"soccer/fifa.friendly.w","policy":"national"},
  {"key":"socceroosq","name":"Socceroos (World Cup qualifying)","path":"soccer/fifa.worldq.afc","policy":"national"},
  {"key":"asiancup","name":"Socceroos (Asian Cup)","path":"soccer/afc.asian.cup","policy":"national"},
  {"key":"worldcup","name":"Socceroos (World Cup)","path":"soccer/fifa.world","policy":"national"},
  {"key":"wwc","name":"Matildas (Women's World Cup)","path":"soccer/fifa.wwc","policy":"national"},
  {"key":"wasian","name":"Matildas (Women's Asian Cup)","path":"soccer/afc.w.asian.cup","policy":"national"},
  {"key":"wolympics","name":"Matildas (Olympics)","path":"soccer/fifa.w.olympics","policy":"national"},
  {"key":"cricket","name":"Australia cricket","path":"cricket/discover","policy":"cricket"},
  {"key":"sailgp","name":"SailGP","path":"static:sailgp","policy":"sailgp"},
  {"key":"tennis","name":"Tennis — slams and tour finals","path":"tennis/atp","policy":"tennis"},
  {"key":"wta","name":"Tennis — WTA slams and finals","path":"tennis/wta","policy":"tennis"},
  {"key":"nba","name":"NBA Finals","path":"basketball/nba","policy":"nba"},
  {"key":"nfl","name":"Super Bowl","path":"football/nfl","policy":"nfl"}
]/*feeds*/;

const BIG = {
  epl: ['arsenal', 'manchester city', 'liverpool', 'chelsea', 'manchester united', 'tottenham', 'newcastle'],
  laliga: ['real madrid', 'barcelona', 'atlético', 'atletico', 'sevilla'],
  seriea: ['internazionale', 'inter', 'juventus', 'ac milan', 'napoli', 'as roma', 'roma'],
  ucl: ['real madrid', 'barcelona', 'atlético', 'atletico', 'manchester city', 'manchester united', 'liverpool', 'arsenal', 'chelsea', 'bayern', 'paris saint', 'juventus', 'internazionale', 'inter', 'ac milan', 'napoli', 'tottenham', 'dortmund', 'sevilla']
};
const HEADLINE_LEAGUES = new Set(['epl', 'laliga', 'seriea', 'ucl']);
const MENS = new Set(['wallabies', 'socceroos', 'socceroosq', 'asiancup', 'worldcup']);
const WOMENS = new Set(['matildas', 'wwc', 'wasian', 'wolympics']);

const dayKey = d => new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(d));
const addDays = (day, n) => dayKey(Date.parse(day + 'T00:00:00+04:00') + n * 86400000);
const timeText = d => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(d));
const clockText = d => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(d));
const dayLabel = d => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short'}).format(new Date(d));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

function feedByKey(key) { return FEEDS.find(f => f.key === key); }
function namesOf(e) { return (e.competitors || []).map(c => c.name || ''); }
function blob(e) { return [e.name, e.text, e.detail, e.format].filter(Boolean).join(' ').toLowerCase(); }
function low(s) { return String(s || '').toLowerCase(); }

function isBulldogs(c) {
  if (String(c.id || '') === '289197') return true;
  const n = low(c.name);
  return (n === 'bulldogs' || n.includes('canterbury') || n.includes('bankstown')) && !n.includes('western');
}
function isSwans(c) {
  if (String(c.id || '') === '4') return true;
  return low(c.name).includes('sydney swans');
}
function isSydneyFC(c) {
  if (String(c.id || '') === '5327') return true;
  const n = low(c.name);
  return n.includes('sydney fc') && !n.includes('western sydney');
}
function isHilal(c) {
  if (String(c.id || '') === '929') return true;
  return low(c.name).includes('hilal');
}
function isWaratahs(c) {
  if (String(c.id || '') === '227') return true;
  return low(c.name).includes('waratahs');
}
function isEuropeanClub(c) {
  const n = low(c.name);
  return n.includes('tottenham') || n.includes('spurs') || n.includes('manchester city') || n.includes('man city') || n.includes('ac milan') || n.includes('sevilla');
}
function isHisClub(c) {
  return isBulldogs(c) || isSwans(c) || isSydneyFC(c) || isHilal(c) || isWaratahs(c) || isEuropeanClub(c);
}
function isAustraliaA(name) {
  return /\baustralia a\b|\baustralian a\b|\bu-?19\b|\bemerging\b|\bxi\b/i.test(name);
}
function isMensNational(name) {
  const n = low(name).trim();
  if (isAustraliaA(n)) return false;
  return n === 'australia' || n === 'socceroos' || n === 'wallabies' || n === 'kangaroos';
}
function isWomensNational(name) {
  const n = low(name).trim();
  if (isAustraliaA(n)) return false;
  return n === 'australia women' || n === 'australia w' || n === 'matildas' || n === 'jillaroos';
}

function selected(e, feed) {
  if (!e || !feed) return false;
  const policy = feed.policy;
  const text = blob(e);
  const comps = e.competitors || [];
  if (policy === 'all' || policy === 'f1' || policy === 'sailgp') return true;
  if (policy === 'nba') return /nba finals|nba championship/.test(text) && !/conference finals/.test(text);
  if (policy === 'nfl') return /super bowl/.test(text);
  if (policy === 'tennis') return /australian open|roland garros|french open|wimbledon|us open|u\.s\. open|atp finals|wta finals/.test(text);
  if (policy === 'ufc') return e.mainCard === true;
  if (policy === 'kangaroos') {
    return (e.side === 'men' || e.side === 'women') && comps.some(c => low(c.name).trim() === 'australia');
  }
  if (policy === 'national') {
    if (MENS.has(feed.key)) return comps.some(c => isMensNational(c.name));
    if (WOMENS.has(feed.key)) return comps.some(c => isWomensNational(c.name));
    return false;
  }
  if (policy === 'cricket') {
    const wanted = comps.some(c => {
      const n = low(c.name).trim();
      return (n === 'australia' || n === 'australia women') && !isAustraliaA(c.name);
    });
    if (!wanted) return false;
    if (comps.some(c => isAustraliaA(c.name))) return false;
    if (/\b(sheffield|shield|big bash|bbl|wbbl)\b/i.test(text)) return false;
    return /test|odi|t20|one-day|twenty20/i.test(text);
  }
  if (policy === 'teams') {
    const fn = {nrl: isBulldogs, afl: isSwans, aleague: isSydneyFC, saudi: isHilal, superrugby: isWaratahs, uel: isEuropeanClub, uecl: isEuropeanClub}[feed.key];
    return fn ? comps.some(fn) : false;
  }
  return false;
}

function isBigSide(feedKey, name) {
  return (BIG[feedKey] || []).some(b => low(name).includes(b));
}
function isHeadline(e) {
  const feed = feedByKey(e.feed);
  if (!feed || !selected(e, feed)) return false;
  if (e.session === 'practice') return false;
  if (HEADLINE_LEAGUES.has(feed.key)) {
    const comps = e.competitors || [];
    if (comps.some(isHisClub)) return true;
    return comps.length >= 2 && comps.every(c => isBigSide(feed.key, c.name));
  }
  return true;
}

function inToday(e, now) {
  const start = Date.parse(e.start);
  if (e.state === 'post' || !Number.isFinite(start)) return false;
  if (e.state === 'in') return true;
  const end = Date.parse(e.end || e.endDate || e.start);
  if (e.cricket && start <= now && end >= now) return true;
  return dayKey(e.start) === dayKey(now);
}
function inResults(e, now) {
  if (e.cricket && e.state === 'post' && e.completed) {
    const end = Date.parse(e.end || e.endDate || e.start);
    const st = Date.parse(e.start);
    return end <= now ? end >= now - 86400000 : st >= now - 5 * 86400000 && st <= now;
  }
  let stamp = e.finish || e.start;
  if (e.state === 'post' && e.finish && Date.parse(e.finish) > now) stamp = e.start;
  const t = Date.parse(stamp);
  return e.state === 'post' && e.completed && t >= now - 86400000 && t <= now;
}
function inUpcoming(e, now) {
  if (e.state === 'in' || e.state === 'post') return false;
  if (!Number.isFinite(Date.parse(e.start))) return false;
  const today = dayKey(now);
  const key = dayKey(e.start);
  return key > today && key <= addDays(today, 7);
}
function bucket(events, now, enabledSet) {
  const on = enabledSet || new Set(FEEDS.map(f => f.key));
  const keep = (events || []).filter(e => on.has(e.feed) && selected(e, feedByKey(e.feed)));
  const byStart = (a, b) => Date.parse(a.start) - Date.parse(b.start);
  return {
    today: keep.filter(e => inToday(e, now)).sort((a, b) => (a.state === 'in' ? -1 : 0) - (b.state === 'in' ? -1 : 0) || byStart(a, b)),
    results: keep.filter(e => inResults(e, now) && e.session !== 'practice').sort((a, b) => Date.parse(b.finish || b.start) - Date.parse(a.finish || a.start) || (b.mainEvent === true) - (a.mainEvent === true)),
    upcoming: keep.filter(e => inUpcoming(e, now) && isHeadline(e) && (e.feed !== 'ufc' || e.mainEvent)).sort(byStart)
  };
}

function safeUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x.href : '';
  } catch { return ''; }
}
function scoreOf(c, state) {
  if (!c || c.score == null || c.score === '') return '';
  if (state === 'pre' && (c.score === '0' || c.score === '0.0')) return '';
  return String(c.score);
}
function card(e) {
  const live = e.state === 'in';
  const when = e.state === 'in' ? 'LIVE' : e.state === 'post' ? 'FINAL' : timeText(e.start) + ' DUBAI';
  const comps = e.competitors || [];
  const head = e.headToHead && comps.length >= 2;
  const scored = head && (scoreOf(comps[0], e.state) || scoreOf(comps[1], e.state));
  let body = '';
  if (head && e.state !== 'pre' && scored) {
    const mark = live ? 'LIVE' : 'FT';
    body = '<div class="scoreline"><div class="side"><span>' + esc(comps[0].name) + '</span><b>' + esc(scoreOf(comps[0], e.state) || '0') + '</b></div><div class="mark">' + esc(mark) + '</div><div class="side away"><b>' + esc(scoreOf(comps[1], e.state) || '0') + '</b><span>' + esc(comps[1].name) + '</span></div></div>';
  } else if (head) {
    body = '<div class="scoreline pre"><div class="side"><span>' + esc(comps[0].name) + '</span></div><div class="mark">' + esc(e.state === 'post' ? 'FT' : timeText(e.start)) + '</div><div class="side away"><span>' + esc(comps[1].name) + '</span></div></div>';
  } else if (e.state !== 'pre' && comps.length) {
    body = '<div class="places">' + comps.slice(0, 3).map((p, i) => esc((p.place || (i + 1)) + '. ' + p.name + (scoreOf(p, e.state) ? ' (' + scoreOf(p, e.state) + ')' : ''))).join(' · ') + '</div>';
  }
  const whenLine = e.state === 'pre'
    ? dayLabel(e.start) + ' · ' + timeText(e.start) + ' Dubai'
    : (e.finish || e.start ? dayLabel(e.finish || e.start) + ' · ' + timeText(e.finish || e.start) + ' Dubai' : '');
  const finishNote = e.state === 'post'
    ? (e.cricket ? 'Finish time unavailable; recently completed' : e.finish ? '' : 'Time shown is the start; finish time unavailable')
    : '';
  const url = safeUrl(e.url);
  return '<article class="sport-card' + (live ? ' is-live' : e.state === 'post' ? ' is-ft' : '') + '"><div class="sport-label' + (live ? ' live-label' : '') + '">' + (live ? '<i class="dot"></i>' : '') + '<span>' + esc(e.league || feedByKey(e.feed)?.name || e.feed) + ' · ' + esc(when) + '</span></div>' + (head ? '' : '<h3 class="sport-title">' + esc(e.name) + '</h3>') + body + (e.detail ? '<p class="sport-detail">' + esc(e.detail) + '</p>' : '') + (whenLine ? '<p class="sport-detail">' + esc(whenLine) + (finishNote ? ' · ' + esc(finishNote) : '') + '</p>' : '') + (url ? '<a class="sport-action" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Scores</a>' : '') + '</article>';
}

const STORE = 'sports-selection-v2';
let enabled;
function readEnabled() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && Array.isArray(saved.keys)) return new Set(saved.keys);
  } catch {}
  return new Set(FEEDS.map(f => f.key));
}
function writeEnabled() {
  try { localStorage.setItem(STORE, JSON.stringify({keys: [...enabled]})); } catch {}
}

let busy = false;
function render(snapshot, failures, now) {
  const events = [];
  for (const batch of snapshot.feeds || []) {
    if (!enabled.has(batch.key)) continue;
    if (!batch.ok) { failures.add(batch.name || batch.key); continue; }
    for (const event of batch.events || []) events.push(event);
  }
  const view = bucket(events, now, enabled);
  const empty = failures.size
    ? 'No matching events loaded. Some feeds failed, so this is not a full schedule.'
    : 'Nothing in this window for the sports you have on.';
  const paint = (id, list) => {
    document.getElementById(id).innerHTML = list.map(card).join('') || '<div class="empty">' + esc(empty) + '</div>';
  };
  paint('today', view.today);
  paint('results', view.results);
  const upcoming = document.getElementById('upcoming');
  if (!view.upcoming.length) upcoming.innerHTML = '<div class="empty">' + esc(empty) + '</div>';
  else {
    let html = '';
    let last = '';
    for (const e of view.upcoming) {
      const key = dayKey(e.start);
      if (key !== last) {
        const tomorrow = addDays(dayKey(now), 1);
        html += '<h3 class="day-head">' + esc(key === tomorrow ? 'Tomorrow · ' + dayLabel(e.start) : dayLabel(e.start)) + '</h3>';
        last = key;
      }
      html += card(e);
    }
    upcoming.innerHTML = html;
  }
  const age = now - Date.parse(snapshot.generatedAt);
  const stale = !Number.isFinite(age) || age > 90 * 60 * 1000;
  if (stale) failures.add('Snapshot is over 90 minutes old');
  const stamp = Number.isFinite(Date.parse(snapshot.generatedAt)) ? timeText(snapshot.generatedAt) : 'unavailable';
  document.getElementById('status').textContent = 'Updated ' + stamp + ' Dubai · ' + view.today.length + ' today · ' + view.results.length + ' results · ' + view.upcoming.length + ' upcoming' + (failures.size ? ' · Check: ' + [...failures].join(', ') : '');
  document.body.classList.toggle('has-live', view.today.some(e => e.state === 'in'));
}

async function load() {
  if (busy) return;
  busy = true;
  const button = document.getElementById('refresh');
  if (button) button.disabled = true;
  const now = Date.now();
  const failures = new Set();
  document.getElementById('status').textContent = 'Updating…';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const response = await fetch('data.json?v=' + now, {cache: 'no-store', signal: ctrl.signal});
    if (!response.ok) throw new Error('Snapshot unavailable');
    render(await response.json(), failures, now);
  } catch {
    failures.add('Sports data snapshot');
    render({feeds: []}, failures, now);
  } finally {
    clearTimeout(timer);
    if (button) button.disabled = false;
    busy = false;
  }
}

function tick() {
  const now = new Date();
  const clock = document.getElementById('clock');
  const day = document.getElementById('day');
  if (clock) clock.textContent = clockText(now);
  if (day) day.textContent = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long'}).format(now);
}

function init() {
  enabled = readEnabled();
  const choices = document.getElementById('choices');
  choices.innerHTML = FEEDS.map(f => '<label><input type="checkbox" value="' + esc(f.key) + '"' + (enabled.has(f.key) ? ' checked' : '') + '>' + esc(f.name) + '</label>').join('');
  choices.addEventListener('change', event => {
    if (!event.target || event.target.type !== 'checkbox') return;
    if (event.target.checked) enabled.add(event.target.value);
    else enabled.delete(event.target.value);
    writeEnabled();
    load();
  });
  document.getElementById('refresh').onclick = load;
  tick();
  setInterval(tick, 1000);
  load();
  setInterval(load, 300000);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/Sports-dashboard/sw.js', {scope: '/Sports-dashboard/'}).catch(() => {});
  }
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = {FEEDS, dayKey, addDays, inToday, inResults, inUpcoming, selected, isHeadline, bucket, isBulldogs, isSwans, isSydneyFC, isHilal, isWaratahs};
