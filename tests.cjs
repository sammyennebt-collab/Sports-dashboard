const assert = require('assert');
const fs = require('fs');
const {dayKey, addDays, inToday, inResults, inUpcoming, selected, isHeadline, bucket, FEEDS} = require('./app.js');

const now = Date.parse('2026-10-10T16:00:00+04:00');
const feed = key => FEEDS.find(item => item.key === key);
const ev = (key, name, extra = {}) => Object.assign({
  feed: key,
  name,
  start: '2026-10-10T12:00:00Z',
  state: 'pre',
  completed: false,
  competitors: [],
  session: '',
  mainCard: false,
  side: '',
  text: '',
  detail: '',
  format: ''
}, extra);
const sides = names => names.map(name => ({name}));

assert.equal(dayKey('2026-10-09T21:00:00Z'), '2026-10-10');
assert.equal(addDays('2026-10-10', 7), '2026-10-17');
assert.equal(addDays('2026-10-30', 3), '2026-11-02');

assert(inToday(ev('epl', 'x', {state: 'pre', start: '2026-10-10T19:59:59Z'}), now));
assert(!inToday(ev('epl', 'x', {state: 'pre', start: '2026-10-10T20:00:00Z'}), now));
assert(!inToday(ev('epl', 'x', {state: 'post', start: '2026-10-10T10:00:00Z'}), now));
assert(inToday(ev('cricket', 'x', {state: 'in', start: '2026-10-09T07:30:00Z', cricket: true, end: '2026-10-14T23:59:00Z'}), now));
assert(inToday(ev('cricket', 'x', {state: 'pre', start: '2026-10-09T07:30:00Z', cricket: true, end: '2026-10-14T23:59:00Z'}), now));

assert(inResults(ev('epl', 'x', {state: 'post', completed: true, start: '2026-10-09T12:00:00Z'}), now));
assert(!inResults(ev('epl', 'x', {state: 'post', completed: true, start: '2026-10-09T11:59:59Z'}), now));
assert(!inResults(ev('epl', 'x', {state: 'post', completed: true, start: '2026-10-11T12:00:00Z'}), now));
assert(!inResults(ev('epl', 'x', {state: 'post', completed: false, start: '2026-10-09T12:00:00Z'}), now));
assert(inResults(ev('cricket', 'x', {state: 'post', completed: true, cricket: true, start: '2026-10-08T08:00:00Z', end: '2026-10-10T10:00:00Z'}), now));
assert(!inResults(ev('cricket', 'x', {state: 'post', completed: true, cricket: true, start: '2026-10-01T08:00:00Z', end: '2026-10-05T10:00:00Z'}), now));
assert(inResults(ev('f1', 'Qualifying', {state: 'post', completed: true, session: 'qualifying', start: '2026-10-10T06:00:00Z', finish: '2026-10-10T20:00:00Z'}), now));

assert(inUpcoming(ev('epl', 'x', {state: 'pre', start: '2026-10-11T10:00:00Z'}), now));
assert(!inUpcoming(ev('epl', 'x', {state: 'pre', start: '2026-10-10T18:00:00Z'}), now));
assert(inUpcoming(ev('epl', 'x', {state: 'pre', start: '2026-10-17T19:00:00Z'}), now));
assert(!inUpcoming(ev('epl', 'x', {state: 'pre', start: '2026-10-17T20:30:00Z'}), now));
assert(!inUpcoming(ev('epl', 'x', {state: 'in', start: '2026-10-12T10:00:00Z'}), now));
assert(!inUpcoming(ev('epl', 'x', {state: 'post', start: '2026-10-12T10:00:00Z', completed: true}), now));

const nba = feed('nba');
const nfl = feed('nfl');
const cricket = feed('cricket');
const wallabies = feed('wallabies');
assert(!selected(ev('nba', 'Brooklyn Nets vs Lakers'), nba));
assert(selected(ev('nba', 'NBA Finals'), nba));
assert(!selected(ev('nba', 'Eastern Conference Finals'), nba));
assert(selected(ev('nfl', 'Super Bowl LX'), nfl));
assert(!selected(ev('nfl', 'Week 8: Bills vs Chiefs'), nfl));
assert(selected(ev('cricket', 'South Africa v Australia', {competitors: sides(['South Africa', 'Australia']), format: 'Test', text: '1st Test'}), cricket));
assert(!selected(ev('cricket', 'Western Australia v Queensland', {competitors: sides(['Western Australia', 'Queensland']), format: 'Sheffield Shield'}), cricket));
assert(!selected(ev('cricket', 'Australia A v India A', {competitors: sides(['Australia A', 'India A']), format: 'Test'}), cricket));
assert(selected(ev('cricket', 'Australia Women v England Women', {competitors: sides(['Australia Women', 'England Women']), format: 'T20', text: '2nd T20I'}), cricket));
assert(selected(ev('wallabies', 'x', {competitors: sides(['Australia', 'New Zealand'])}), wallabies));
assert(!selected(ev('wallabies', 'x', {competitors: sides(['Australia Women', 'New Zealand Women'])}), wallabies));
assert(selected(ev('matildas', 'x', {competitors: sides(['Australia Women', 'England'])}), feed('matildas')));
assert(!selected(ev('matildas', 'x', {competitors: sides(['Australia', 'England'])}), feed('matildas')));
assert(selected(ev('socceroos', 'x', {competitors: sides(['Australia', 'Japan'])}), feed('socceroos')));
assert(!selected(ev('socceroos', 'x', {competitors: sides(['Brazil', 'Japan'])}), feed('socceroos')));

assert(selected(ev('nrl', 'Bulldogs vs Roosters', {competitors: sides(['Bulldogs', 'Roosters'])}), feed('nrl')));
assert(selected(ev('nrl', 'x', {competitors: [{name: 'Canterbury-Bankstown', id: '289197'}, {name: 'Storm'}]}), feed('nrl')));
assert(!selected(ev('nrl', 'Western Bulldogs vs Sydney Swans', {competitors: sides(['Western Bulldogs', 'Sydney Swans'])}), feed('nrl')));
assert(!selected(ev('nrl', 'Raiders vs Eels', {competitors: sides(['Canberra Raiders', 'Eels'])}), feed('nrl')));
assert(selected(ev('afl', 'Sydney Swans vs Carlton', {competitors: sides(['Sydney Swans', 'Carlton'])}), feed('afl')));
assert(!selected(ev('afl', 'Western Bulldogs vs Geelong', {competitors: sides(['Western Bulldogs', 'Geelong'])}), feed('afl')));
assert(selected(ev('aleague', 'Sydney FC vs Adelaide', {competitors: [{name: 'Sydney FC', id: '5327'}]}), feed('aleague')));
assert(!selected(ev('aleague', 'Western Sydney Wanderers vs Melbourne City', {competitors: sides(['Western Sydney Wanderers FC', 'Melbourne City FC'])}), feed('aleague')));
assert(selected(ev('saudi', 'Al Hilal vs Al Nassr', {competitors: [{name: 'Al Hilal', id: '929'}, {name: 'Al Nassr'}]}), feed('saudi')));
assert(!selected(ev('saudi', 'Al Nassr vs Al Ittihad', {competitors: sides(['Al Nassr', 'Al Ittihad'])}), feed('saudi')));
assert(selected(ev('superrugby', 'Brumbies vs Waratahs', {competitors: [{name: 'New South Wales Waratahs', id: '227'}]}), feed('superrugby')));
assert(!selected(ev('superrugby', 'Crusaders vs Reds', {competitors: sides(['Crusaders', 'Queensland Reds'])}), feed('superrugby')));
assert(selected(ev('uel', 'Tottenham vs Roma', {competitors: sides(['Tottenham Hotspur', 'AS Roma'])}), feed('uel')));
assert(!selected(ev('uel', 'AZ vs Roma', {competitors: sides(['AZ Alkmaar', 'AS Roma'])}), feed('uel')));

assert(selected(ev('rlwc', 'Australia vs Fiji', {side: 'men', competitors: sides(['Australia', 'Fiji'])}), feed('rlwc')));
assert(selected(ev('rlwc', 'Australia vs England', {side: 'women', competitors: sides(['Australia', 'England'])}), feed('rlwc')));
assert(!selected(ev('rlwc', 'Samoa vs France', {side: 'men', competitors: sides(['Samoa', 'France'])}), feed('rlwc')));
assert(!selected(ev('rlwc', 'Australia vs France', {side: 'wheelchair', competitors: sides(['Australia', 'France'])}), feed('rlwc')));
assert(selected(ev('ufc', 'Volkanovski vs Evloev', {mainCard: true}), feed('ufc')));
assert(!selected(ev('ufc', 'Prelim fight', {mainCard: false}), feed('ufc')));
assert(selected(ev('tennis', 'Wimbledon'), feed('tennis')));
assert(!selected(ev('tennis', 'European Open'), feed('tennis')));
assert(selected(ev('sailgp', 'Dubai Sail Grand Prix'), feed('sailgp')));

const arsenalLiverpool = ev('epl', 'Arsenal vs Liverpool', {competitors: sides(['Arsenal', 'Liverpool']), start: '2026-10-17T14:00:00Z'});
const bournemouth = ev('epl', 'Bournemouth vs Wolves', {competitors: sides(['AFC Bournemouth', 'Wolverhampton Wanderers']), start: '2026-10-17T14:00:00Z'});
const spurs = ev('epl', 'Tottenham vs Bournemouth', {competitors: sides(['Tottenham Hotspur', 'AFC Bournemouth']), start: '2026-10-17T14:00:00Z'});
const sevilla = ev('laliga', 'Sevilla vs Getafe', {competitors: sides(['Sevilla', 'Getafe']), start: '2026-10-17T14:00:00Z'});
const race = ev('f1', 'United States Grand Prix — Race', {session: 'race', start: '2026-10-17T19:00:00Z'});
const practice = ev('f1', 'United States Grand Prix — FP1', {session: 'practice', start: '2026-10-17T15:00:00Z', state: 'post', completed: true});
assert(isHeadline(arsenalLiverpool));
assert(!isHeadline(bournemouth));
assert(isHeadline(spurs));
assert(isHeadline(sevilla));
assert(isHeadline(race));
assert(!isHeadline(practice));

const grouped = bucket([
  ev('epl', 'Today match', {competitors: sides(['Arsenal', 'Chelsea']), start: '2026-10-10T18:00:00Z'}),
  ev('f1', 'Qualifying', {session: 'qualifying', state: 'post', completed: true, start: '2026-10-10T06:00:00Z'}),
  practice,
  race,
  bournemouth,
  spurs,
  ev('ufc', 'Main event', {mainCard: true, mainEvent: true, start: '2026-10-17T18:00:00Z'}),
  ev('ufc', 'Co-main', {mainCard: true, mainEvent: false, start: '2026-10-17T18:00:00Z'})
], now);
assert.equal(grouped.today.length, 1);
assert(grouped.results.some(item => item.name === 'Qualifying'));
assert(!grouped.results.some(item => item.session === 'practice'));
assert(grouped.upcoming.some(item => item.name.startsWith('United States')));
assert(grouped.upcoming.some(item => item.name.includes('Tottenham')));
assert(!grouped.upcoming.some(item => item.name.includes('Bournemouth vs Wolves')));
assert(grouped.upcoming.some(item => item.name === 'Main event'));
assert(!grouped.upcoming.some(item => item.name === 'Co-main'));

const source = fs.readFileSync('app.js', 'utf8');
const parsed = JSON.parse(source.match(/const FEEDS = \/\*feeds\*\/(\[.*?\])\/\*feeds\*\//s)[1]);
assert.equal(parsed.length, FEEDS.length);
assert(parsed.some(item => item.key === 'socceroos' && item.name.includes("men's") && item.path === 'soccer/fifa.friendly'));
assert(parsed.some(item => item.key === 'matildas' && item.name.includes("women's") && item.path === 'soccer/fifa.friendly.w'));
assert(parsed.some(item => item.key === 'nrl' && item.path === 'rugby-league/3'));
assert(parsed.some(item => item.key === 'saudi' && item.path === 'soccer/ksa.1'));
assert(parsed.some(item => item.key === 'superrugby' && item.path === 'rugby/242041'));
assert(parsed.some(item => item.key === 'ufc' && item.path === 'mma/ufc'));
assert(parsed.some(item => item.key === 'rlwc' && item.path === 'bbc:rugby-league'));
assert.equal(source.match(/\['(\w+)','[^']+','([^']+)','(\w+)'\]/g), null);

if (process.argv.includes('--snapshot')) {
  const snapshot = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  assert(Date.now() - Date.parse(snapshot.generatedAt) < 2 * 60 * 60 * 1000, 'snapshot is stale');
  const byKey = new Map((snapshot.feeds || []).map(item => [item.key, item]));
  for (const item of FEEDS) {
    const row = byKey.get(item.key);
    assert(row, 'missing feed ' + item.key);
    assert.equal(typeof row.ok, 'boolean');
    assert(Array.isArray(row.events));
    if (!row.ok) assert(row.error, 'failed feed without an error: ' + item.key);
  }
  assert(fs.statSync('data.json').size < 2_000_000, 'data.json is too large to republish');
  for (const event of (byKey.get('rlwc') || {}).events || []) {
    assert((event.competitors || []).some(c => c.name === 'Australia'));
    assert(event.side === 'men' || event.side === 'women');
  }
}

console.log('assertions passed');
