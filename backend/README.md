# Shared AA rankings service

The service builds shared player rankings from Paceman AA data and stores its
runner histories and snapshots in SQLite. It requires Node.js 22.5 or newer
for the built-in `node:sqlite` module.

## Local development

Run the frontend and rankings service in separate terminals:

```sh
npm run rankings
npm run dev
```

The Vite development server proxies `/ranking-api` to the service on
`127.0.0.1:3001`. The first all-time refresh may take a while because it
resolves the Totorewa AA RSG roster to Paceman UUIDs, then paginates through
each runner's AA history. Check `http://127.0.0.1:3001/ranking-api/health` for
job status and snapshot readiness.

The service also resolves Minecraft profile names from UUIDs for leaderboard
runner identities. These names are cached for 24 hours, requests are
throttled, and rate-limit responses are retried according to Mojang's
`Retry-After` header when available.

Configure Totorewa credentials with `TOTOREWA_API_USERNAME` and
`TOTOREWA_API_PASSWORD`. For compatibility with the frontend's existing local
configuration, the service also accepts `VITE_API_USERNAME` and
`VITE_API_PASSWORD`. Do not commit credentials.

Optional settings:

- `RANKING_HOST` (default `127.0.0.1`)
- `RANKING_PORT` (default `3001`)
- `GRAAPH_RANKINGS_DB` (default `ranking-data/rankings.sqlite`)

## Data sources and refresh schedule

- 24-hour, 7-day, and 30-day snapshots use Paceman AA `getAllData` exports.
  Their refresh intervals are 5 minutes, 6 hours, and 6 hours respectively.
  The service rejects an export at the 10,000-row cap instead of publishing a
  potentially incomplete snapshot.
- All-time rankings use the union of UUIDs from the Paceman AA export and
  Totorewa's AA RSG runner roster. Totorewa names are resolved through Paceman
  `getPlayerInfo`; historical AA runs are fetched with `getAAPlayerRuns`.
  The snapshot refreshes daily, while recently discovered runs are synced
  during each refresh.
- Failed refreshes retry after at most 5 minutes. Existing snapshots remain
  available while a refresh is running or after a refresh fails.

All-time coverage is limited to runners discoverable through those two sources;
it is not a guarantee of every historical AA runner.

The `/ranking-api/player` response includes shared split checkpoint statistics,
segment statistics for the split-average chart, and completion statistics.
Ranks use shared scores across the same roster for each snapshot period.

## Production

Run `npm run rankings` as a persistent Node.js service on the VPS. Configure
the frontend's web server to proxy `/ranking-api/` to the service's local
address, and persist the SQLite directory across deployments. The Vite proxy
is for development only.
