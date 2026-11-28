import 'dotenv/config'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RankingStore } from './store.js'
import { buildSharedRankings } from './rankingMath.js'
import { getMinecraftProfileNameByUuid } from './minecraftProfile.js'

const periods = [1, 7, 30, 9999]
const dayMs = 24 * 60 * 60 * 1000
const pacemanRequestIntervalMs = 600
const nameResolutionTtlMs = 24 * 60 * 60 * 1000
const totorewaResolutionTtlMs = 30 * dayMs
const periodRefreshIntervals = new Map([
  [1, 5 * 60 * 1000],
  [7, 6 * 60 * 60 * 1000],
  [30, 6 * 60 * 60 * 1000],
  [9999, 24 * 60 * 60 * 1000]
])

const databasePath = process.env.GRAAPH_RANKINGS_DB
  ? resolve(process.env.GRAAPH_RANKINGS_DB)
  : resolve('ranking-data', 'rankings.sqlite')
const store = new RankingStore(databasePath)
const jobState = new Map()
let pacemanQueue = Promise.resolve()
let lastPacemanRequestAt = 0

const normalizeName = name => typeof name === 'string' ? name.trim().toLowerCase() : ''
const delay = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))

function requestPaceman(path) {
  const task = pacemanQueue.then(async () => {
    const wait = pacemanRequestIntervalMs - (Date.now() - lastPacemanRequestAt)
    if (wait > 0) await delay(wait)
    lastPacemanRequestAt = Date.now()

    const response = await fetch(new URL(path, 'https://paceman.gg'), {
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) throw new Error(`Paceman API error (${response.status})`)
    return response.json()
  })
  pacemanQueue = task.catch(() => {})
  return task
}

async function fetchAllAAData(days) {
  const payload = await requestPaceman(`/stats/aa/api/getAllData/?days=${days}`)
  if (!Array.isArray(payload.data)) throw new Error('Invalid Paceman AA data response')
  return payload.data
}

async function fetchAAPlayerRunsPage(uuid, beforeId) {
  const params = new URLSearchParams({ uuid, limit: '100' })
  if (beforeId !== null) params.set('beforeId', String(beforeId))
  const payload = await requestPaceman(`/stats/api/getAAPlayerRuns/?${params}`)
  if (!Array.isArray(payload.rows) || typeof payload.hasMore !== 'boolean') {
    throw new Error('Invalid Paceman AA run history response')
  }
  if (payload.hasMore && !Number.isInteger(payload.nextCursor)) {
    throw new Error('Invalid Paceman AA run history cursor')
  }
  if (payload.rows.some(row =>
    !Number.isInteger(row?.id) ||
    !Number.isFinite(row.lastUpdated)
  )) {
    throw new Error('Invalid Paceman AA run history row')
  }
  return payload
}

async function fetchTotorewaRunnerNames() {
  const username = process.env.TOTOREWA_API_USERNAME || process.env.VITE_API_USERNAME
  const password = process.env.TOTOREWA_API_PASSWORD || process.env.VITE_API_PASSWORD
  if (!username || !password) {
    throw new Error('Totorewa API credentials are not configured')
  }

  const authorization = Buffer.from(`${username}:${password}`).toString('base64')
  const response = await fetch(
    'https://mcsrapi.totorewa.com/api/leaderboard/all?cat=aa&board=rsg',
    {
      headers: { Authorization: `Basic ${authorization}` },
      signal: AbortSignal.timeout(30_000)
    }
  )
  if (!response.ok) throw new Error(`Totorewa leaderboard API error (${response.status})`)
  const payload = await response.json()
  if (!Array.isArray(payload.runs)) throw new Error('Invalid Totorewa leaderboard response')

  const names = new Set()
  for (const run of payload.runs) {
    if (!Array.isArray(run?.players) || run.players.some(player => typeof player !== 'string' || !player.trim())) {
      throw new Error('Invalid Totorewa leaderboard runner list')
    }
    run.players.forEach(player => names.add(player.trim()))
  }
  return [...names]
}

async function resolvePacemanRunner(nickname) {
  const payload = await requestPaceman(
    `/stats/api/getPlayerInfo/?names=${encodeURIComponent(nickname)}`
  )
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid Paceman player info response')
  }
  const player = Object.values(payload).find(entry =>
    typeof entry?.nick === 'string' && normalizeName(entry.nick) === normalizeName(nickname)
  )
  if (!player) return null
  if (typeof player.id !== 'string' || !player.id.trim()) {
    throw new Error('Invalid Paceman player UUID')
  }
  return { uuid: player.id, nickname: player.nick }
}

async function refreshCandidateRoster() {
  const aaData = await fetchAllAAData(9999)
  const aaRunners = new Map()
  const aaNicknameToUuid = new Map()

  for (const run of aaData) {
    const uuid = typeof run?.uuid === 'string' ? run.uuid.trim().toLowerCase() : ''
    const nickname = typeof run?.nickname === 'string' ? run.nickname.trim() : ''
    if (!uuid || !nickname) continue
    if (!aaRunners.has(uuid)) aaRunners.set(uuid, nickname)
    aaNicknameToUuid.set(normalizeName(nickname), uuid)
    store.addAlias(nickname, uuid)
  }
  for (const [uuid, nickname] of aaRunners) {
    store.addRunner({ uuid, nickname, source: 'aa' })
  }

  const totorewaNames = await fetchTotorewaRunnerNames()
  let unresolvedRunnerCount = 0
  for (const nickname of totorewaNames) {
    const nameKey = normalizeName(nickname)
    const aaUuid = aaNicknameToUuid.get(nameKey)
    if (aaUuid) {
      store.addRunner({ uuid: aaUuid, nickname, source: 'totorewa' })
      continue
    }

    const cachedResolution = store.getNameResolution(nickname)
    if (cachedResolution && Date.now() - cachedResolution.checked_at < nameResolutionTtlMs) {
      if (cachedResolution.uuid) {
        store.addRunner({ uuid: cachedResolution.uuid, nickname, source: 'totorewa' })
      } else {
        unresolvedRunnerCount++
      }
      continue
    }

    const identity = await resolvePacemanRunner(nickname)
    store.saveNameResolution(nickname, identity?.uuid ?? null, Date.now())
    if (!identity) {
      unresolvedRunnerCount++
      console.warn('[rankings] A Totorewa runner could not be resolved to a Paceman UUID')
      continue
    }
    store.addRunner({
      uuid: identity.uuid,
      nickname: identity.nickname,
      source: 'totorewa'
    })
    store.addAlias(nickname, identity.uuid)
  }

  return {
    runnerCount: store.getRunners().length,
    unresolvedRunnerCount
  }
}

function candidatesFromData(data) {
  const candidates = new Map()
  for (const run of data) {
    const uuid = typeof run?.uuid === 'string' ? run.uuid.trim().toLowerCase() : ''
    const nickname = typeof run?.nickname === 'string' ? run.nickname.trim() : ''
    if (!uuid || !nickname) continue
    if (!candidates.has(uuid)) {
      candidates.set(uuid, { uuid, nickname })
      store.addRunner({ uuid, nickname, source: 'aa' })
    }
    store.addAlias(nickname, uuid)
  }
  return [...candidates.values()]
}

async function refreshPeriodSnapshot(days) {
  const data = await fetchAllAAData(days)
  if (data.length >= 10_000) {
    throw new Error(`Paceman AA export reached its 10,000 row cap for ${days} days`)
  }

  candidatesFromData(data)
  const candidates = store.getRunners().map(runner => ({
    uuid: runner.uuid,
    nickname: runner.nickname
  }))
  const snapshot = buildSharedRankings(data, {
    days,
    candidates,
    source: 'paceman-aa-export',
    unresolvedRunnerCount: 0
  })
  store.saveSnapshot(snapshot)
  console.info(`[rankings] Refreshed ${days}-day snapshot (${data.length} AA runs)`)
}

async function backfillRunnerHistory(runner) {
  let current = store.getRunner(runner.uuid)
  while (!current.history_complete) {
    const beforeId = current.backfill_cursor === null
      ? null
      : Number(current.backfill_cursor)
    const page = await fetchAAPlayerRunsPage(runner.uuid, beforeId)
    store.insertRuns(runner.uuid, runner.nickname, page.rows)

    if (!page.hasMore) {
      store.updateBackfill(runner.uuid, null, true)
    } else {
      if (page.rows.length === 0 || String(page.nextCursor) === current.backfill_cursor) {
        throw new Error('Paceman AA history pagination did not advance')
      }
      store.updateBackfill(runner.uuid, page.nextCursor, false)
    }
    current = store.getRunner(runner.uuid)
  }
  store.markRunnerSynced(runner.uuid, Date.now())
}

async function syncRecentRunnerHistory(runner) {
  let beforeId = null
  while (true) {
    const page = await fetchAAPlayerRunsPage(runner.uuid, beforeId)
    const unseenRows = []
    let foundExistingRun = false
    for (const row of page.rows) {
      if (store.hasRun(runner.uuid, row.id)) {
        foundExistingRun = true
        break
      }
      unseenRows.push(row)
    }
    store.insertRuns(runner.uuid, runner.nickname, unseenRows)
    if (foundExistingRun || !page.hasMore) break
    beforeId = page.nextCursor
  }
  store.markRunnerSynced(runner.uuid, Date.now())
}

async function refreshAllTimeSnapshot() {
  const roster = await refreshCandidateRoster()
  const runners = store.getRunners()
  let incompleteCount = 0

  for (const runner of runners) {
    try {
      if (runner.history_complete) {
        await syncRecentRunnerHistory(runner)
      } else {
        await backfillRunnerHistory(runner)
      }
    } catch (error) {
      incompleteCount++
      console.error(`[rankings] AA history sync failed for ${runner.uuid}:`, error)
    }
  }

  const currentRunners = store.getRunners()
  incompleteCount += currentRunners.filter(runner => !runner.history_complete).length
  if (incompleteCount > 0) {
    throw new Error(`All-time snapshot is waiting for ${incompleteCount} runner histories`)
  }

  const snapshot = buildSharedRankings(store.iterateRuns(), {
    days: 9999,
    candidates: currentRunners.map(runner => ({
      uuid: runner.uuid,
      nickname: runner.nickname
    })),
    source: 'paceman-aa-player-histories',
    unresolvedRunnerCount: roster.unresolvedRunnerCount
  })
  store.saveSnapshot(snapshot)
  console.info(`[rankings] Refreshed all-time snapshot (${roster.runnerCount} runners)`)
}

function runScheduledJob(name, task, intervalMs) {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    jobState.set(name, { running: true, lastError: null })
    let nextIntervalMs = intervalMs
    try {
      await task()
      jobState.set(name, { running: false, lastError: null, lastSuccessAt: new Date().toISOString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown refresh error'
      console.error(`[rankings] ${name} refresh failed: ${message}`)
      jobState.set(name, { running: false, lastError: message })
      nextIntervalMs = Math.min(intervalMs, 5 * 60 * 1000)
    } finally {
      running = false
      setTimeout(run, nextIntervalMs)
    }
  }
  void run()
}

function sendJson(response, status, payload, cacheControl = 'no-store') {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'Content-Length': Buffer.byteLength(body)
  })
  response.end(body)
}

function handlePlayerRequest(url, response) {
  const nickname = url.searchParams.get('nickname')?.trim()
  const days = Number(url.searchParams.get('days'))
  if (!nickname || nickname.length > 64 || !periods.includes(days)) {
    sendJson(response, 400, { error: 'Invalid nickname or period' })
    return
  }

  const snapshot = store.getSnapshot(days)
  if (!snapshot) {
    sendJson(response, 503, { error: 'Ranking snapshot is not ready' })
    return
  }
  const uuid = store.getUuidByNickname(nickname)
  const player = uuid ? snapshot.players[uuid] : Object.values(snapshot.players).find(entry =>
    normalizeName(entry.nickname) === normalizeName(nickname)
  )
  if (!player) {
    sendJson(response, 404, { error: 'Runner is not in the shared ranking roster' })
    return
  }

  sendJson(response, 200, {
    days,
    updatedAt: snapshot.updatedAt,
    source: snapshot.source,
    candidateCount: snapshot.candidateCount,
    unresolvedRunnerCount: snapshot.unresolvedRunnerCount,
    completionStats: player.completions,
    segments: player.segments,
    stats: player.splits
  }, 'public, max-age=60, stale-while-revalidate=300')
}

async function handleMinecraftProfileRequest(url, response) {
  const uuid = url.searchParams.get('uuid')?.trim()
  if (!uuid || !/^(?:[0-9a-f]{32}|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(uuid)) {
    sendJson(response, 400, { error: 'Invalid Minecraft profile UUID' })
    return
  }

  try {
    const name = await getMinecraftProfileNameByUuid(uuid)
    sendJson(response, 200, { name }, 'public, max-age=3600')
  } catch (error) {
    console.error('[profiles] Minecraft UUID lookup failed:', error)
    sendJson(response, 502, { error: 'Minecraft profile lookup failed' })
  }
}

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' })
    } else if (url.pathname === '/ranking-api/health') {
      const snapshots = Object.fromEntries(periods.map(days => {
        const snapshot = store.getSnapshot(days)
        return [days, snapshot ? {
          updatedAt: snapshot.updatedAt,
          playerCount: snapshot.playerCount,
          candidateCount: snapshot.candidateCount,
          source: snapshot.source
        } : null]
      }))
      sendJson(response, 200, { ok: true, jobs: Object.fromEntries(jobState), snapshots })
    } else if (url.pathname === '/ranking-api/player') {
      handlePlayerRequest(url, response)
    } else if (url.pathname === '/ranking-api/minecraft-profile') {
      void handleMinecraftProfileRequest(url, response)
    } else {
      sendJson(response, 404, { error: 'Not found' })
    }
  } catch (error) {
    console.error('[rankings] Request failed:', error)
    if (!response.headersSent) sendJson(response, 500, { error: 'Ranking service request failed' })
    else response.end()
  }
})

export function startRankingServer() {
  const port = Number(process.env.RANKING_PORT || 3001)
  const host = process.env.RANKING_HOST || '127.0.0.1'
  server.listen(port, host, () => {
    console.info(`[rankings] Listening on http://${host}:${port}`)
  })

  runScheduledJob('period-1d', () => refreshPeriodSnapshot(1), periodRefreshIntervals.get(1))
  runScheduledJob('period-7d', () => refreshPeriodSnapshot(7), periodRefreshIntervals.get(7))
  runScheduledJob('period-30d', () => refreshPeriodSnapshot(30), periodRefreshIntervals.get(30))
  runScheduledJob('period-all-time', refreshAllTimeSnapshot, periodRefreshIntervals.get(9999))

  const shutdown = () => {
    server.close(() => {
      store.close()
      process.exit(0)
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startRankingServer()
}
