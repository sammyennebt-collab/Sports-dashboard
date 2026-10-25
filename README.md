# Sammy's Sports

A phone home-screen app for Sammy's teams and leagues. Open it and you get live scores, results from the last 24 hours, and headline events for the next 7 days. Every time is Asia/Dubai.

Premier League, La Liga, Serie A and the Champions League are full slates for today and the last day. The week ahead keeps your clubs, the big matches, Formula 1 qualifying and the race, UFC main cards, the Kangaroos and Jillaroos, the Wallabies, Australia cricket, and SailGP.

Clubs: Sydney Swans, Canterbury-Bankstown Bulldogs, Tottenham, Manchester City, AC Milan, Sevilla, Al Hilal, Sydney FC, NSW Waratahs. National teams: Socceroos, Matildas, Wallabies, Australia men and women in Tests, ODIs and T20Is. Tennis is Grand Slams and tour finals. NBA is the Finals. NFL is the Super Bowl.

## Data

`scripts/update.py` reads the feed list from `app.js` (so names like men's and women's friendlies are not dropped) and writes `data.json`. That file is generated during the GitHub Pages deploy. It is not stored in git, because a raw ESPN snapshot is several megabytes and would bloat the history.

Most boards are ESPN's public scoreboard. No API key.

| What | Source |
| --- | --- |
| NRL / Bulldogs | `rugby-league/3` (the old `rugby-league/nrl` path returns HTTP 400). Bulldogs team id 289197. |
| Al Hilal | `soccer/ksa.1` (the old `soccer/sau.1` path returns HTTP 400). Team id 929. |
| Waratahs | `rugby/242041` Super Rugby Pacific. Team id 227. This feed was missing before. |
| Wallabies | `rugby/289234` international tests. |
| Rugby League World Cup | BBC Sport scores JSON. ESPN's rugby-league board does not list the tournament. Kangaroos and Jillaroos only. |
| UFC | `mma/ufc`, main card only. |
| SailGP | Checked-in weekend calendar in `sailgp.json`. ESPN does not cover it, and there is no free live feed. Times are approximate local afternoons. |
| Australia cricket | ESPN's cricket header, then each Australia series scoreboard. |

Team schedule endpoints were not used. They were returning HTTP 500.

GitHub Actions (`.github/workflows/pages.yml`) runs the updater about every 30 minutes and publishes the site plus a fresh `data.json` to GitHub Pages. Schedules only run from the default branch, and GitHub can start them late. The page says so when the snapshot is older than 90 minutes. While the app is open it re-reads the snapshot every 5 minutes.

## Install on a phone

The site is a standalone web app: `manifest.json`, 192 and 512 icons, and `apple-touch-icon.png`. On an iPhone, open the site in Safari, tap Share, then Add to Home Screen. It opens without the browser chrome. Android can install it from the browser menu.

## Run locally

Python 3 and Node are enough. No packages to install.

    python3 scripts/update.py --self-test
    node tests.cjs
    python3 scripts/update.py
    node tests.cjs --snapshot
    python3 -m http.server 8000

Then open http://localhost:8000. Opening `index.html` as a file will not load `data.json`.

## Limits

SailGP has no live scores. Super Rugby and the NRL season can sit outside the 7-day window, so the Waratahs or Bulldogs card is empty until a match is close; the feed itself still has to succeed. Cricket only appears when ESPN lists an Australia series on its header, and a finished Test uses the scheduled end date. Women's World Cup qualifying for Asia is not a separate ESPN board (friendlies, the Women's Asian Cup, the Women's World Cup and the Olympics are). Wheelchair Rugby League World Cup matches are not shown. ESPN and BBC data is unofficial and can lag.
