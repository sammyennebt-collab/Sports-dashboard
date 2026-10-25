"""Fetch public scoreboards into data.json.

ESPN scoreboards are fetched server-side so the phone page does not need a CORS proxy.
Rugby League World Cup comes from BBC Sport's public scores JSON (ESPN's rugby-league
board does not list it). SailGP is a checked-in weekend calendar because ESPN has no feed.
Feed paths are read from the FEEDS array in app.js, including names that contain apostrophes.
"""
import concurrent.futures, datetime, gzip, json, pathlib, re, sys, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DUBAI = datetime.timezone(datetime.timedelta(hours=4))
HDR = {'User-Agent': 'Mozilla/5.0 sports-dashboard/2.0', 'Accept': 'application/json', 'Accept-Encoding': 'gzip'}

def load_feeds():
    source = (ROOT / 'app.js').read_text(encoding='utf-8')
    match = re.search(r'const FEEDS = /\*feeds\*/(\[.*?\])/\*feeds\*/;', source, re.S)
    if not match:
        raise SystemExit('FEEDS JSON not found in app.js')
    feeds = json.loads(match.group(1))
    if not feeds:
        raise SystemExit('FEEDS list is empty')
    return feeds

def dubai_dates(now):
    day = now.astimezone(DUBAI).date()
    start = day - datetime.timedelta(days=2)
    end = day + datetime.timedelta(days=8)
    out = []
    cursor = start
    while cursor <= end:
        out.append(cursor.strftime('%Y%m%d'))
        cursor += datetime.timedelta(days=1)
    return out

def get(url):
    last = None
    for attempt in range(2):
        req = urllib.request.Request(url, headers=HDR)
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                raw = response.read()
            if raw[:2] == b'\x1f\x8b':
                raw = gzip.decompress(raw)
            return json.loads(raw)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 1:
                raise
        except Exception as exc:
            last = exc
            if attempt == 1:
                raise
        time.sleep(1.2)
    raise last

def link_of(node):
    for item in node.get('links') or []:
        href = item.get('href') or ''
        if href.startswith('https://www.espn.com/') and '/match' in href or href.startswith('https://www.espn.com/') and '/gameId/' in href:
            return href
    for item in node.get('links') or []:
        href = item.get('href') or ''
        if href.startswith('https://www.espn.com/'):
            return href
    return ''

def competitor(row):
    who = row.get('team') or row.get('athlete') or {}
    return {
        'name': who.get('displayName') or who.get('shortDisplayName') or 'Unknown',
        'id': who.get('id') or '',
        'score': '' if row.get('score') in (None, '') else str(row.get('score')),
        'winner': row.get('winner') is True,
        'place': row.get('order') or '',
        'homeAway': row.get('homeAway') or ''
    }

def cricket_score(row):
    parts = []
    for innings in row.get('linescores') or []:
        if innings.get('runs') is None:
            continue
        wickets = innings.get('wickets')
        text = f"{innings['runs']}/{wickets}" if wickets is not None else str(innings['runs'])
        if innings.get('isCurrent') and innings.get('overs') is not None:
            text += f" ({innings['overs']})"
        parts.append(text)
    if parts:
        return ' & '.join(parts)
    score = row.get('score')
    return '' if score in (None, '') else str(score)

def session_of(competition, event):
    kind = competition.get('type') or {}
    text = ' '.join([
        str(kind.get('abbreviation') or ''),
        str(kind.get('text') or ''),
        str(kind.get('name') or ''),
        str(event.get('name') or '')
    ]).lower()
    abbr = str(kind.get('abbreviation') or '').lower()
    if abbr.startswith('fp') or 'practice' in text:
        return 'practice'
    if 'sprint' in text:
        return 'sprint'
    if 'qual' in text:
        return 'qualifying'
    if abbr == 'race' or re.search(r'\brace\b', text):
        return 'race'
    return ''

def keep_blob(feed, name, text):
    blob = f'{name} {text}'.lower()
    policy = feed['policy']
    if policy == 'nba':
        return bool(re.search(r'nba finals|nba championship', blob)) and 'conference finals' not in blob
    if policy == 'nfl':
        return 'super bowl' in blob
    if policy == 'tennis':
        return bool(re.search(r'australian open|roland garros|french open|wimbledon|us open|u\.s\. open|atp finals|wta finals', blob))
    return True

def slim_competition(feed, event, competition, extra=None):
    extra = extra or {}
    status = ((competition.get('status') or event.get('status') or {}).get('type')) or {}
    paired = [(raw, competitor(raw)) for raw in competition.get('competitors') or []]
    if any(raw.get('homeAway') in ('home', 'away') for raw, _row in paired):
        order = {'home': 0, 'away': 1}
        paired.sort(key=lambda pair: order.get(pair[0].get('homeAway'), 2))
    rows = [row for _raw, row in paired]
    if feed['key'] == 'cricket':
        for raw, row in paired:
            row['score'] = cricket_score(raw)
    for row in rows:
        row.pop('homeAway', None)
        if (status.get('state') or 'pre') == 'pre' and row['score'] in ('0', '0.0'):
            row['score'] = ''
    kind = competition.get('class') or {}
    format_name = kind.get('generalClassCard') or kind.get('name') or ''
    description = ' '.join(str(part) for part in [
        competition.get('description') or event.get('description') or '',
        format_name,
        (competition.get('status') or {}).get('summary') or '',
        (competition.get('status') or {}).get('session') or ''
    ] if part)
    title = event.get('name') or 'Event'
    abbr = ((competition.get('type') or {}).get('abbreviation')) or ''
    if feed['policy'] == 'f1' and abbr:
        title = f'{title} — {abbr}'
    if feed['policy'] == 'ufc':
        weight = ((competition.get('type') or {}).get('abbreviation')) or ''
        names = [row['name'] for row in rows]
        title = ' vs '.join(names) if len(names) == 2 else title
        description = ' '.join(part for part in [event.get('name') or '', weight, status.get('shortDetail') or ''] if part)
    venue = ((competition.get('venue') or event.get('venue') or {}).get('fullName')) or ((competition.get('venue') or {}).get('displayName')) or ''
    short = status.get('shortDetail') or status.get('detail') or ''
    if re.match(r'\d{1,2}/\d{1,2}', short):
        short = ''
    detail = ' · '.join(part for part in [short, description, venue] if part)
    if feed['policy'] == 'ufc':
        weight = ((competition.get('type') or {}).get('abbreviation')) or ''
        if len(rows) == 2 and any(row['winner'] for row in rows):
            winner = next(row['name'] for row in rows if row['winner'])
            loser = next((row['name'] for row in rows if not row['winner']), '')
            detail = ' · '.join(part for part in [f'{winner} def. {loser}', weight, event.get('name') or ''] if part)
        else:
            detail = ' · '.join(part for part in [weight, event.get('name') or '', venue] if part)
    start = competition.get('date') or competition.get('startDate') or event.get('date')
    # A Grand Prix end date covers the whole weekend, so it must not become the finish of practice or qualifying.
    if feed['key'] == 'cricket':
        end = event.get('endDate') or competition.get('endDate')
        finish = None
    elif feed['policy'] == 'f1':
        end = None
        finish = None
    else:
        end = competition.get('endDate')
        finish = end
    session = session_of(competition, event) if feed['policy'] == 'f1' else extra.get('session', '')
    text = ' '.join(part for part in [event.get('name') or '', event.get('shortName') or '', description, format_name] if part)
    if not keep_blob(feed, title, text):
        return None
    item = {
        'id': f"{feed['key']}:{event.get('id')}:{competition.get('id') or start}",
        'feed': feed['key'],
        'league': feed['name'],
        'name': title,
        'start': start,
        'end': end if feed['key'] == 'cricket' else None,
        'finish': finish,
        'state': status.get('state') or 'pre',
        'completed': status.get('completed') is True,
        'detail': detail[:280],
        'competitors': rows,
        'headToHead': len(rows) == 2 and feed['policy'] != 'f1',
        'url': link_of(competition) or link_of(event),
        'cricket': feed['key'] == 'cricket',
        'format': format_name,
        'text': text[:400],
        'session': session,
        'mainCard': extra.get('mainCard', False),
        'mainEvent': extra.get('mainEvent', False),
        'side': extra.get('side', '')
    }
    return item

def competitions_of(event):
    found = list(event.get('competitions') or [])
    for group in event.get('groupings') or []:
        found.extend(group.get('competitions') or [])
    seen = set()
    unique = []
    for competition in found:
        key = str(competition.get('id') or id(competition))
        if key in seen:
            continue
        seen.add(key)
        unique.append(competition)
    return unique

def ufc_flags(event):
    competitions = competitions_of(event)
    if not competitions:
        return {}
    def stamp(competition):
        return competition.get('date') or competition.get('startDate') or ''
    latest = max(stamp(competition) for competition in competitions)
    main = [competition for competition in competitions if stamp(competition) == latest]
    if len(main) == len(competitions) and len(competitions) > 5:
        main = competitions[-5:]
    title = (event.get('name') or '').lower()
    billed = set()
    for competition in main:
        lasts = []
        for row in competition.get('competitors') or []:
            who = row.get('athlete') or row.get('team') or {}
            name = (who.get('displayName') or '').lower().strip()
            lasts.append(name.split()[-1] if name else '')
        if lasts and all(part and part in title for part in lasts):
            billed.add(id(competition))
    if not billed and main:
        billed.add(id(main[-1]))
    return {id(competition): {'mainCard': True, 'mainEvent': id(competition) in billed} for competition in main}

def slim_events(feed, payload):
    events = []
    for event in payload.get('events') or []:
        flags = ufc_flags(event) if feed['policy'] == 'ufc' else {}
        for competition in competitions_of(event):
            extra = flags.get(id(competition))
            if feed['policy'] == 'ufc' and not extra:
                continue
            item = slim_competition(feed, event, competition, extra or {})
            if item and item.get('start'):
                events.append(item)
    return events

def fetch_scoreboard(feed, date):
    url = f"https://site.api.espn.com/apis/site/v2/sports/{feed['path']}/scoreboard?dates={date}&limit=200"
    payload = get(url)
    if not isinstance(payload.get('events'), list):
        raise ValueError('Missing event list')
    return url, slim_events(feed, payload)

def fetch_cricket(feed):
    url = 'https://site.web.api.espn.com/apis/personalized/v2/scoreboard/header?sport=cricket&lang=en&region=us'
    head = get(url)
    ids = []
    for league in head['sports'][0]['leagues']:
        for event in league.get('events') or []:
            names = [(competitor.get('displayName') or '') for competitor in event.get('competitors') or []]
            if any(name in ('Australia', 'Australia Women') for name in names):
                ids.append(str(league.get('id')))
                break
    events = []
    sources = [url]
    errors = []
    for league_id in sorted(set(ids)):
        board = f'https://site.api.espn.com/apis/site/v2/sports/cricket/{league_id}/scoreboard'
        sources.append(board)
        try:
            events.extend(slim_events(feed, get(board)))
        except Exception as exc:
            errors.append(f'{league_id}:{type(exc).__name__}')
    note = '' if ids else 'No Australia series listed on the cricket header feed'
    if errors and not events and not ids:
        raise RuntimeError('; '.join(errors))
    return sources, events, errors, note

def fetch_rlwc(feed, now):
    day = now.astimezone(DUBAI).date()
    start = (day - datetime.timedelta(days=2)).isoformat()
    end = (day + datetime.timedelta(days=8)).isoformat()
    today = day.isoformat()
    url = ('https://www.bbc.com/wc-data/container/sport-data-scores-fixtures'
           f'?selectedEndDate={end}&selectedStartDate={start}&todayDate={today}'
           '&urn=urn:bbc:sportsdata:rugby-league')
    payload = get(url)
    events = []
    for group in payload.get('eventGroups') or []:
        label = group.get('displayLabel') or ''
        if "Men's World Cup" in label:
            side = 'men'
        elif "Women's World Cup" in label:
            side = 'women'
        else:
            continue
        for secondary in group.get('secondaryGroups') or []:
            for event in secondary.get('events') or []:
                home = event.get('home') or {}
                away = event.get('away') or {}
                names = [home.get('fullName') or '', away.get('fullName') or '']
                if 'Australia' not in names:
                    continue
                status = event.get('status') or ''
                state = {'PreEvent': 'pre', 'MidEvent': 'in', 'PostEvent': 'post'}.get(status, 'pre')
                def points(side_row):
                    if state == 'pre':
                        return ''
                    scores = side_row.get('runningScores') or {}
                    return '' if scores.get('fulltime') in (None, '') else str(scores.get('fulltime'))
                period = ((event.get('periodLabel') or {}).get('accessible')) or ((event.get('periodLabel') or {}).get('value')) or event.get('period') or ''
                venue = (event.get('venue') or {}).get('name') or ''
                nickname = 'Kangaroos' if side == 'men' else 'Jillaroos'
                detail = ' · '.join(part for part in [nickname, secondary.get('displayLabel') or '', period, venue] if part)
                href = event.get('onwardJourneyLink') or ''
                if isinstance(href, dict):
                    href = href.get('url') or href.get('href') or ''
                events.append({
                    'id': f"rlwc:{event.get('id')}",
                    'feed': 'rlwc',
                    'league': "Rugby League World Cup — " + nickname,
                    'name': f"{names[0]} vs {names[1]}",
                    'start': event.get('startDateTime'),
                    'end': None,
                    'finish': None,
                    'state': state,
                    'completed': state == 'post',
                    'detail': detail,
                    'competitors': [
                        {'name': names[0], 'id': home.get('id') or '', 'score': points(home), 'winner': False, 'place': ''},
                        {'name': names[1], 'id': away.get('id') or '', 'score': points(away), 'winner': False, 'place': ''}
                    ],
                    'headToHead': True,
                    'url': href if str(href).startswith('https://') else '',
                    'cricket': False,
                    'format': '',
                    'text': label,
                    'session': '',
                    'mainCard': False,
                    'mainEvent': False,
                    'side': side
                })
    return [url], [event for event in events if event.get('start')], [], ''

def fetch_sailgp(feed, now):
    calendar = json.loads((ROOT / 'sailgp.json').read_text(encoding='utf-8'))
    events = []
    for event in calendar.get('events') or []:
        start = datetime.datetime.fromisoformat(event['start'])
        end = datetime.datetime.fromisoformat(event['end'])
        if end <= now:
            state, completed = 'post', False
        elif start <= now <= end:
            state, completed = 'in', False
        else:
            state, completed = 'pre', False
        events.append({
            'id': 'sailgp:' + event['start'],
            'feed': 'sailgp',
            'league': 'SailGP',
            'name': event['name'],
            'start': event['start'],
            'end': event['end'],
            'finish': None,
            'state': state,
            'completed': completed,
            'detail': f"Static calendar, no live scores · {event.get('venue') or ''}".strip(' ·'),
            'competitors': [],
            'headToHead': False,
            'url': 'https://sailgp.com/calendar',
            'cricket': False,
            'format': '',
            'text': event.get('venue') or '',
            'session': '',
            'mainCard': False,
            'mainEvent': False,
            'side': ''
        })
    return ['sailgp.json'], events, [], 'Static weekend calendar; ESPN does not list SailGP'

def self_test():
    feeds = load_feeds()
    keys = {feed['key'] for feed in feeds}
    needed = {'epl', 'laliga', 'seriea', 'ucl', 'f1', 'ufc', 'rlwc', 'nrl', 'afl', 'aleague', 'saudi', 'superrugby', 'wallabies', 'socceroos', 'matildas', 'cricket', 'sailgp', 'nba', 'nfl'}
    missing = needed - keys
    if missing:
        raise SystemExit(f'missing feeds: {sorted(missing)}')
    by_key = {feed['key']: feed for feed in feeds}
    assert "men's" in by_key['socceroos']['name']
    assert "women's" in by_key['matildas']['name']
    assert by_key['nrl']['path'] == 'rugby-league/3'
    assert by_key['saudi']['path'] == 'soccer/ksa.1'
    assert by_key['superrugby']['path'] == 'rugby/242041'
    assert by_key['wallabies']['path'] == 'rugby/289234'
    assert by_key['ufc']['path'] == 'mma/ufc'
    source = (ROOT / 'app.js').read_text(encoding='utf-8')
    old = re.findall(r"\['(\w+)','[^']+','([^']+)','(\w+)'\]", source)
    assert old == []
    now = datetime.datetime(2026, 10, 25, 10, 50, tzinfo=datetime.timezone.utc)
    dates = dubai_dates(now)
    assert dates[0] == '20261023' and dates[-1] == '20261102' and len(dates) == 11
    calendar = json.loads((ROOT / 'sailgp.json').read_text(encoding='utf-8'))
    assert any('Dubai' in event['name'] and event['start'].startswith('2026-11-21') for event in calendar['events'])
    print(f'self-test ok: {len(feeds)} feeds, apostrophe names parsed, corrected paths present')

def main():
    if '--self-test' in sys.argv:
        self_test()
        return
    feeds = load_feeds()
    now = datetime.datetime.now(datetime.timezone.utc)
    dates = dubai_dates(now)
    results = {
        feed['key']: {'key': feed['key'], 'name': feed['name'], 'ok': False, 'events': [], 'error': None, 'warning': '', 'sources': []}
        for feed in feeds
    }
    jobs = []
    specials = []
    for feed in feeds:
        if feed['path'] == 'cricket/discover':
            specials.append(('cricket', feed))
        elif feed['path'] == 'bbc:rugby-league':
            specials.append(('rlwc', feed))
        elif feed['path'] == 'static:sailgp':
            specials.append(('sailgp', feed))
        else:
            for date in dates:
                jobs.append((feed, date))

    def run_job(job):
        feed, date = job
        try:
            url, events = fetch_scoreboard(feed, date)
            return feed['key'], date, url, events, None
        except Exception as exc:
            url = f"https://site.api.espn.com/apis/site/v2/sports/{feed['path']}/scoreboard?dates={date}&limit=200"
            return feed['key'], date, url, [], type(exc).__name__

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        for key, date, url, events, error in pool.map(run_job, jobs):
            row = results[key]
            row['sources'].append(url)
            if error:
                row.setdefault('errors', []).append(f'{date}:{error}')
            else:
                row['ok'] = True
                row['events'].extend(events)

    for kind, feed in specials:
        row = results[feed['key']]
        try:
            if kind == 'cricket':
                sources, events, errors, note = fetch_cricket(feed)
            elif kind == 'rlwc':
                sources, events, errors, note = fetch_rlwc(feed, now)
            else:
                sources, events, errors, note = fetch_sailgp(feed, now)
            row['sources'] = sources
            row['events'] = events
            row['ok'] = True
            if errors:
                row['warning'] = 'Partial: ' + ', '.join(errors)
            elif note:
                row['warning'] = note
        except Exception as exc:
            row['ok'] = False
            row['error'] = type(exc).__name__

    for row in results.values():
        errors = row.pop('errors', [])
        if row['ok']:
            deduped = []
            seen = set()
            for event in sorted(row['events'], key=lambda item: item.get('start') or ''):
                if event['id'] in seen:
                    continue
                seen.add(event['id'])
                deduped.append(event)
            row['events'] = deduped
            if errors:
                row['warning'] = (row['warning'] + '; ' if row['warning'] else '') + 'Some dates failed: ' + ', '.join(errors[:6])
        else:
            row['error'] = row['error'] or (', '.join(errors[:8]) if errors else 'unavailable')
            row['events'] = []
        row.pop('sources', None)

    ordered = [results[feed['key']] for feed in feeds]
    payload = {'generatedAt': now.isoformat(), 'timezone': 'Asia/Dubai', 'feeds': ordered}
    text = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    (ROOT / 'data.json').write_text(text, encoding='utf-8')
    print(f"{'FEED':<14}{'STATUS':<8}{'EVENTS':>7}  NOTE")
    failed = 0
    for row in ordered:
        status = 'ok' if row['ok'] else 'FAIL'
        if not row['ok']:
            failed += 1
        note = row['error'] or row['warning'] or ''
        print(f"{row['key']:<14}{status:<8}{len(row['events']):>7}  {note}")
    print(f"{len(ordered)} feeds, {failed} failed, {sum(len(row['events']) for row in ordered)} events, {len(text)} bytes")
    if failed == len(ordered):
        raise SystemExit('every feed failed')

if __name__ == '__main__':
    main()
