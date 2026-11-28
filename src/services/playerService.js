const progressionSheetUrl = 'https://docs.google.com/spreadsheets/d/107ijqjELTQQ29KW4phUmtvYFTX9-pfHsjb18TKoWACk/gviz/tq?tqx=out:csv&gid=735237004'
const leaderboardRunnersSheetUrl = 'https://docs.google.com/spreadsheets/d/1b_ophpRolFOpeHrlG8xbiRieSYFTAGJcY9UrvE5Uxd4/export?format=csv&gid=0'
const responseCache = new Map()
const responseCacheTtlMs = 5 * 60_000
const responseCacheDatabaseName = 'graaph-api-cache'
const responseCacheStoreName = 'responses'
let responseCacheDatabasePromise = null

function hasReachedNetherOrEnd(run) {
  return (run.nether > 120000 || run.end) && !(run.credits && !run.elytra)
}

function openResponseCacheDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (responseCacheDatabasePromise) return responseCacheDatabasePromise

  responseCacheDatabasePromise = new Promise((resolve, reject) => {
    let settled = false
    const request = indexedDB.open(responseCacheDatabaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      const store = database.objectStoreNames.contains(responseCacheStoreName)
        ? request.transaction.objectStore(responseCacheStoreName)
        : database.createObjectStore(responseCacheStoreName, { keyPath: 'key' })
      if (!store.indexNames.contains('expiresAt')) store.createIndex('expiresAt', 'expiresAt')
    }
    request.onsuccess = () => {
      const database = request.result
      if (settled) {
        database.close()
        return
      }
      settled = true
      database.onversionchange = () => {
        database.close()
        responseCacheDatabasePromise = null
      }
      resolve(database)
    }
    request.onerror = () => {
      if (settled) return
      settled = true
      reject(request.error ?? new Error('Unable to open persistent API cache'))
    }
    request.onblocked = () => {
      if (settled) return
      settled = true
      reject(new Error('Persistent API cache database is blocked'))
    }
  }).catch(error => {
    responseCacheDatabasePromise = null
    throw error
  })

  return responseCacheDatabasePromise
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error ?? new Error('Persistent API cache transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Persistent API cache transaction was aborted'))
  })
}

async function readPersistentResponseCache(key) {
  const database = await openResponseCacheDatabase()
  if (!database) return null

  const transaction = database.transaction(responseCacheStoreName, 'readwrite')
  const transactionComplete = waitForTransaction(transaction)
  const store = transaction.objectStore(responseCacheStoreName)
  let cachedRecord = null
  const request = store.get(key)
  request.onsuccess = () => {
    const record = request.result
    if (record && record.expiresAt > Date.now()) cachedRecord = record
  }
  const cleanupRequest = store.index('expiresAt').openCursor(IDBKeyRange.upperBound(Date.now()))
  cleanupRequest.onsuccess = () => {
    const cursor = cleanupRequest.result
    if (!cursor) return
    cursor.delete()
    cursor.continue()
  }

  await transactionComplete
  return cachedRecord
}

async function writePersistentResponseCache(key, value, expiresAt) {
  const database = await openResponseCacheDatabase()
  if (!database) return

  const transaction = database.transaction(responseCacheStoreName, 'readwrite')
  const transactionComplete = waitForTransaction(transaction)
  transaction.objectStore(responseCacheStoreName).put({ key, value, expiresAt })
  await transactionComplete
}

function getCachedRequest(key, request) {
  const cachedEntry = responseCache.get(key)
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) return cachedEntry.promise

  const entry = { expiresAt: Infinity, promise: null }
  entry.promise = Promise.resolve().then(async () => {
    let persistentRecord
    try {
      persistentRecord = await readPersistentResponseCache(key)
    } catch (error) {
      console.warn('Unable to read persistent API cache; fetching fresh data:', error)
    }

    if (persistentRecord) {
      if (responseCache.get(key) === entry) entry.expiresAt = persistentRecord.expiresAt
      return persistentRecord.value
    }

    const value = await request()
    const expiresAt = Date.now() + responseCacheTtlMs
    if (responseCache.get(key) === entry) entry.expiresAt = expiresAt
    writePersistentResponseCache(key, value, expiresAt).catch(error => {
      console.warn('Unable to write persistent API cache:', error)
    })
    return value
  }).catch(error => {
    if (responseCache.get(key) === entry) responseCache.delete(key)
    throw error
  })
  responseCache.set(key, entry)
  return entry.promise
}

function parseCsvRows(csv) {
  const rows = []
  let row = []
  let cell = ''
  let isQuoted = false

  for (let index = 0; index < csv.length; index++) {
    const character = csv[index]
    if (character === '"') {
      if (isQuoted && csv[index + 1] === '"') {
        cell += '"'
        index++
      } else {
        isQuoted = !isQuoted
      }
    } else if (character === ',' && !isQuoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !isQuoted) {
      if (character === '\r' && csv[index + 1] === '\n') index++
      row.push(cell)
      if (row.some(value => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (isQuoted) throw new Error('Invalid sheet CSV')
  if (cell || row.length) {
    row.push(cell)
    if (row.some(value => value.trim())) rows.push(row)
  }
  return rows
}

function parseSheetDate(value) {
  const match = value.replace(/\u00a0/g, ' ').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return null

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months.findIndex(name => name.toLowerCase() === match[2].toLowerCase())
  if (month < 0) return null

  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])))
  return date.getUTCDate() === Number(match[1]) ? date.getTime() : null
}

function parseSheetDuration(value) {
  const match = value.trim().match(/^(\d+):([0-5]?\d):([0-5]?\d)$/)
  if (!match) return null
  return (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000
}

export async function fetchPlayerProgression(nickname) {
  const response = await fetch(progressionSheetUrl)
  if (!response.ok) throw new Error(`Progression sheet error (${response.status})`)

  const rows = parseCsvRows(await response.text())
  const headers = rows.shift()?.map(value => value.trim())
  if (!headers) throw new Error('Invalid progression sheet response')

  const columns = Object.fromEntries(['Date', 'Runner', 'IGT', 'Link', 'Status'].map(name => [
    name,
    headers.indexOf(name)
  ]))
  if (Object.values(columns).some(index => index < 0)) {
    throw new Error('Invalid progression sheet columns')
  }

  const requestedPlayer = nickname.trim().toLowerCase()
  let bestTime = Infinity
  return rows
    .filter(row => row[columns.Runner]?.trim().toLowerCase() === requestedPlayer)
    .map(row => {
      const timestamp = parseSheetDate(row[columns.Date] ?? '')
      const time = parseSheetDuration(row[columns.IGT] ?? '')
      if (timestamp === null || time === null) {
        throw new Error('Invalid run in progression sheet')
      }
      return {
        timestamp,
        time,
        link: row[columns.Link]?.trim() ?? '',
        status: row[columns.Status]?.trim() || 'Unknown'
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(record => {
      if (record.time >= bestTime) return false
      bestTime = record.time
      return true
    })
}

/* Calling the Paceman API */
export async function fetchDataPacemanApi() {
  return getCachedRequest('paceman:all-data:9999', async () => {
    const res = await fetch(`/api/getAllData/?days=9999`)
    if (!res.ok) throw new Error(`Paceman API error (${res.status})`)
    const json = await res.json()
    if (!Array.isArray(json.data)) throw new Error('Invalid Paceman API response')
    return json.data
  })
}

export async function fetchSharedSplitStats(nickname, day) {
  const params = new URLSearchParams({ nickname, days: String(day) })
  const response = await fetch(`/ranking-api/player?${params}`)
  if (!response.ok) throw new Error(`Shared AA rankings API error (${response.status})`)
  const payload = await response.json()
  if (
    payload?.days !== day ||
    typeof payload.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(payload.updatedAt)) ||
    !payload.stats ||
    typeof payload.stats !== 'object' ||
    Array.isArray(payload.stats) ||
    !payload.completionStats ||
    typeof payload.completionStats !== 'object' ||
    Array.isArray(payload.completionStats) ||
    !payload.segments ||
    typeof payload.segments !== 'object' ||
    Array.isArray(payload.segments)
  ) {
    throw new Error('Invalid shared AA rankings response')
  }
  for (const stats of Object.values(payload.stats)) {
    if (
      !stats ||
      !Number.isFinite(stats.counter) ||
      stats.counter < 0 ||
      ['avg', 'fastest', 'conversion'].some(field =>
        stats[field] !== undefined && !Number.isFinite(stats[field])
      ) ||
      ['lbAvg', 'lbFastest', 'lbCounter', 'lbConversion'].some(field =>
        stats[field] !== undefined && (!Number.isInteger(stats[field]) || stats[field] < 1)
      )
    ) {
      throw new Error('Invalid shared AA split statistics')
    }
  }
  for (const stats of Object.values(payload.segments)) {
    if (
      !stats ||
      !Number.isFinite(stats.counter) ||
      stats.counter < 0 ||
      ['avg', 'fastest', 'conversion'].some(field =>
        stats[field] !== undefined && !Number.isFinite(stats[field])
      ) ||
      ['lbAvg', 'lbFastest', 'lbCounter', 'lbConversion'].some(field =>
        stats[field] !== undefined && (!Number.isInteger(stats[field]) || stats[field] < 1)
      )
    ) {
      throw new Error('Invalid shared AA segment statistics')
    }
  }
  const completionStats = payload.completionStats
  if (
    !Number.isFinite(completionStats.counter) ||
    completionStats.counter < 0 ||
    ['avg', 'fastest', 'conversion'].some(field =>
      completionStats[field] !== undefined && !Number.isFinite(completionStats[field])
    ) ||
    ['lbAvg', 'lbFastest', 'lbCounter', 'lbConversion'].some(field =>
      completionStats[field] !== undefined &&
      (!Number.isInteger(completionStats[field]) || completionStats[field] < 1)
    )
  ) {
    throw new Error('Invalid shared AA completion statistics')
  }
  return payload
}

export async function fetchPlayerRunHistory(nickname) {
  const requestedNickname = nickname.trim().toLowerCase()
  const rows = await getCachedRequest(`paceman:player-runs:${requestedNickname}`, async () => {
    const playerParams = new URLSearchParams({ names: nickname })
    const playerResponse = await fetch(`/paceman-stats-api/getPlayerInfo/?${playerParams}`)
    if (!playerResponse.ok) throw new Error(`Paceman player API error (${playerResponse.status})`)
    const players = await playerResponse.json()
    if (!players || typeof players !== 'object' || Array.isArray(players)) {
      throw new Error('Invalid Paceman player API response')
    }

    const player = Object.values(players).find(entry =>
      typeof entry?.nick === 'string' && entry.nick.trim().toLowerCase() === requestedNickname
    )
    if (!player) return []
    if (typeof player.id !== 'string' || !player.id) {
      throw new Error('Invalid Paceman player identifier')
    }

    const playerRows = []
    const seenCursors = new Set()
    let beforeId
    let hasMore = true

    while (hasMore) {
      const params = new URLSearchParams({ uuid: player.id, limit: '100' })
      if (beforeId !== undefined) params.set('beforeId', String(beforeId))

      const response = await fetch(`/paceman-stats-api/getAAPlayerRuns/?${params}`)
      if (!response.ok) throw new Error(`Paceman run history API error (${response.status})`)
      const page = await response.json()
      if (!Array.isArray(page.rows) || typeof page.hasMore !== 'boolean') {
        throw new Error('Invalid Paceman run history API response')
      }

      playerRows.push(...page.rows)
      hasMore = page.hasMore
      if (hasMore) {
        if (!Number.isInteger(page.nextCursor) || seenCursors.has(page.nextCursor)) {
          throw new Error('Invalid Paceman run history pagination cursor')
        }
        beforeId = page.nextCursor
        seenCursors.add(beforeId)
      }
    }

    return playerRows.map(run => {
      if (!Number.isFinite(run.lastUpdated)) {
        throw new Error('Invalid Paceman run timestamp')
      }
      return {
        ...run,
        insertTime: new Date(run.lastUpdated).toISOString()
      }
    })
  })

  return rows.map(run => ({
    ...run,
    nickname
  }))
}

/* Trimming the data to only get the runs played X days ago */
export async function sanitizeData(data, day) {
  const now = new Date()
  const xDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000 * day)

  const res = []
  data.forEach(runObject => {
    if (hasReachedNetherOrEnd(runObject) && runObject.insertTime >= xDayAgo.toISOString()) {
      res.push(runObject)
    }
  });

  return res
}

/* Get the leaderboard datas from totorewa's api */
async function fetchLeaderboardSearchResults(nickname) {
  const response = await fetch(`/secure-api/api/leaderboard/search?cat=aa&board=rsg&name=${encodeURIComponent(nickname)}`)
  if (!response.ok) throw new Error(`Leaderboard API error (${response.status})`)
  const data = await response.json()
  if (!Array.isArray(data.results)) throw new Error('Invalid leaderboard API response')
  for (const result of data.results) {
    const players = result?.run?.players
    if (!Array.isArray(players) || players.some(player => typeof player !== 'string')) {
      throw new Error('Invalid leaderboard runner list')
    }
  }
  return data.results
}

async function fetchLeaderboardRunnerMappings() {
  return getCachedRequest('leaderboard:runner-mappings', async () => {
    const response = await fetch(leaderboardRunnersSheetUrl)
    if (!response.ok) throw new Error(`Leaderboard runners sheet error (${response.status})`)

    const rows = parseCsvRows(await response.text())
    const headers = rows.shift()?.map(value => value.trim())
    if (!headers) throw new Error('Invalid leaderboard runners sheet response')

    const normalizeHeader = value => value.replace(/^\uFEFF/, '').trim().toLowerCase()
    if (
      normalizeHeader(headers[0] ?? '') !== 'input api toto' ||
      normalizeHeader(headers[2] ?? '') !== 'uuid'
    ) {
      throw new Error('Invalid leaderboard runners sheet columns')
    }

    const mappings = new Map()
    for (const row of rows) {
      const name = row[0]?.trim()
      const uuid = row[2]?.trim()
      if (!name || !uuid) throw new Error('Invalid runner in leaderboard runners sheet')
      if (!/^(?:[0-9a-f]{32}|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i.test(uuid)) {
        throw new Error('Invalid runner UUID in leaderboard runners sheet')
      }
      mappings.set(name.toLowerCase(), { uuid })
    }
    return mappings
  })
}

export async function getMinecraftProfileNameByUuid(uuid) {
  const params = new URLSearchParams({ uuid })
  const response = await fetch(`/ranking-api/minecraft-profile?${params}`)
  if (!response.ok) throw new Error(`Minecraft profile API error (${response.status})`)
  const profile = await response.json()
  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    throw new Error('Invalid Minecraft profile API response')
  }
  return profile.name.trim()
}

export async function getAllLeaderboardData(board = 'aa') {
  if (!['aa', 'thunderless'].includes(board)) {
    throw new Error('Invalid leaderboard board')
  }
  const apiBoard = board === 'aa' ? 'rsg' : board
  const [response, runnerMappings] = await Promise.all([
    fetch(`/secure-api/api/leaderboard/all?cat=aa&board=${encodeURIComponent(apiBoard)}`),
    fetchLeaderboardRunnerMappings()
  ])
  if (!response.ok) throw new Error(`Leaderboard API error (${response.status})`)
  const data = await response.json()
  if (!Array.isArray(data.runs)) throw new Error('Invalid leaderboard API response')

  const runs = data.runs.map(run => {
    if (!Number.isFinite(run?.place) || run.place < 1) {
      throw new Error('Invalid leaderboard place')
    }
    if (!Array.isArray(run.players) || run.players.some(player => typeof player !== 'string' || !player.trim())) {
      throw new Error('Invalid leaderboard runner list')
    }
    if (typeof run.completionTime !== 'string' || !run.completionTime.trim()) {
      throw new Error('Invalid leaderboard completion time')
    }
    return {
      place: run.place,
      players: run.players,
      completionTime: run.completionTime
    }
  })

  const matchedUuids = new Set(runs.flatMap(run =>
    run.players
      .map(player => runnerMappings.get(player.trim().toLowerCase())?.uuid)
      .filter(Boolean)
  ))
  const currentNames = new Map(await Promise.all(
    [...matchedUuids].map(async uuid => [uuid, await getMinecraftProfileNameByUuid(uuid)])
  ))

  return runs.map(run => ({
    ...run,
    players: run.players.map(player => {
      const uuid = runnerMappings.get(player.trim().toLowerCase())?.uuid
      return uuid ? currentNames.get(uuid) : player
    })
  }))
}

export async function getDataLeaderboardByPlayer(nickname) {
  const results = await fetchLeaderboardSearchResults(nickname)
  if (results.length === 0) return null

  const requestedPlayer = nickname.trim().toLowerCase()
  const matchingResult = results.find(result =>
    result.run.players.some(player => player.trim().toLowerCase() === requestedPlayer)
  )
  if (!matchingResult) return null

  const run = matchingResult.run
  const place = run?.place
  if (place == null) throw new Error('Invalid leaderboard result')
  if (typeof run.completionTime !== 'string' || !run.completionTime.trim()) {
    throw new Error('Invalid leaderboard completion time')
  }
  return {
    place,
    completionTime: run.completionTime
  }
}

export async function getMinecraftProfileName(nickname) {
  const response = await fetch(`/minecraft-api/minecraft/profile/lookup/name/${encodeURIComponent(nickname)}`)
  if (!response.ok) throw new Error(`Minecraft profile API error (${response.status})`)
  const profile = await response.json()
  if (typeof profile.name !== 'string' || !profile.name.trim()) {
    throw new Error('Invalid Minecraft profile API response')
  }
  return profile.name
}

export function getRunnerHeadUrl(nickname) {
  return `https://mcsr-game.com/helm/${encodeURIComponent(nickname)}/64.png`
}

////// FUNCTIONS TO MAKE THE GRAPHS

/* Build per-player split statistics; comparative ranks come from the shared ranking service. */
export function getPlayerDataByDay(data, day, nickname = '') {
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const requestedPlayer = nickname.trim().toLowerCase()
  const now = new Date()
  const xDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000 * day)
  const cutoff = xDayAgo.toISOString()

  const playersStats = {}
  const playersSplit = {}
  data.forEach(run => {
    const player = run.nickname.toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(playersStats, player)) {
      playersStats[player] = {}
      splits.forEach(split => {
        playersStats[player][split] = { sum: 0, fastest: Infinity, counter: 0 }
      })
    }
    if (player === requestedPlayer && !Object.prototype.hasOwnProperty.call(playersSplit, player)) {
      playersSplit[player] = []
      splits.forEach(split => {
        playersSplit[player][split] = { run: [] }
      })
    }

    if (!(hasReachedNetherOrEnd(run) && run.insertTime >= cutoff)) return

    splits.forEach(split => {
      const time = run[split]
      if (!time) return

      if (player === requestedPlayer) playersSplit[player][split].run.push(time)
      const stats = playersStats[player][split]
      stats.sum += time
      stats.fastest = Math.min(stats.fastest, time)
      stats.counter++
    })
  })

  for (const [player, playerStats] of Object.entries(playersStats)) {
    splits.forEach(split => {
      const stats = playerStats[split]
      if (stats.counter > 0) {
        stats.avg = stats.sum / stats.counter
        if (player === requestedPlayer) {
          Object.assign(playersSplit[player][split], {
            fastest: stats.fastest,
            avg: stats.avg,
            counter: stats.counter
          })
        }
      }
    })
  }

  return [playersSplit, {}, {}, {}, {}]
}

export function getPlayerCompletionStatsByDay(data, day, now = Date.now()) {
  const cutoff = now - 24 * 60 * 60 * 1000 * day
  const finishTimes = data
    .filter(run => {
      const timestamp = Date.parse(run?.insertTime)
      return Number.isFinite(timestamp) &&
        timestamp >= cutoff &&
        Number.isFinite(run?.finish) &&
        run.finish > 0
    })
    .map(run => run.finish)

  return {
    counter: finishTimes.length,
    fastest: finishTimes.length ? Math.min(...finishTimes) : undefined,
    avg: finishTimes.length
      ? finishTimes.reduce((total, time) => total + time, 0) / finishTimes.length
      : undefined
  }
}

/* Trimming the advanced datas */
export function trimAllDataByPlayerId(datas, id) {
  /* Defining player's properties */
  const nickname = id
  id = id.trim().toLowerCase()

  const dataPlayer = []
  // Pathing the raw datas
  for (const [player, playerData] of Object.entries(datas[0])) {
    // Only getting the right player's data
    if (player == id) {
      // Accessing each split's data
      for (const [split, splitData] of Object.entries(playerData)) {
        dataPlayer[split] = splitData
      }
    }
  }

  // Somehow sanitazing the final object because js sucks or im bad idk
  const data = {
    "nether": dataPlayer.nether,
    "bastion": dataPlayer.bastion,
    "fortress": dataPlayer.fortress,
    "stronghold": dataPlayer.stronghold,
    "end": dataPlayer.end,
    "elytra": dataPlayer.elytra,
    "credits": dataPlayer.credits,
  }
  return {
    nickname,
    data
  }
}

export function getPlayerStatsForAllPeriods(data, nickname) {
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const checkpoints = splits
  const segments = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']
  const periods = [
    { key: 'avg1d', days: 1 },
    { key: 'avg7d', days: 7 },
    { key: 'avg30d', days: 30 },
    { key: 'avgAT', days: 9999 }
  ]
  const requestedPlayer = nickname.trim().toLowerCase()
  const cutoffs = periods.map(({ days }) =>
    new Date(Date.now() - 24 * 60 * 60 * 1000 * days).toISOString()
  )
  const periodStats = periods.map(() => ({}))
  const segmentTimes = Object.fromEntries(segments.map(segment => [
    segment,
    Object.fromEntries(periods.map(({ key }) => [key, []]))
  ]))

  for (const run of data) {
    if (!hasReachedNetherOrEnd(run)) continue
    const runNickname = run.nickname.toLowerCase()
    const isTargetForDistribution = typeof run.nickname === 'string' &&
      run.nickname.trim().toLowerCase() === requestedPlayer
    const includedPeriodIndexes = []
    cutoffs.forEach((cutoff, index) => {
      if (run.insertTime >= cutoff) includedPeriodIndexes.push(index)
    })
    if (!includedPeriodIndexes.length) continue

    const checkpointTimes = checkpoints.map(checkpoint => run[checkpoint])
    const runSegmentTimes = segments.map((_, index) => {
      const end = checkpointTimes[index]
      const start = index === 0 ? 0 : checkpointTimes[index - 1]
      return Number.isFinite(end) && Number.isFinite(start) && end > start
        ? end - start
        : undefined
    })

    includedPeriodIndexes.forEach(periodIndex => {
      const period = periods[periodIndex]

      let stats = periodStats[periodIndex][runNickname]
      if (!stats) {
        stats = {
          checkpoints: Object.fromEntries(checkpoints.map(checkpoint => [
            checkpoint,
            { sum: 0, counter: 0 }
          ])),
          segments: Object.fromEntries(segments.map(segment => [
            segment,
            { counter: 0, fastest: Infinity }
          ]))
        }
        periodStats[periodIndex][runNickname] = stats
      }

      checkpoints.forEach((split, checkpointIndex) => {
        const time = checkpointTimes[checkpointIndex]
        if (time) {
          stats.checkpoints[split].sum += time
          stats.checkpoints[split].counter++
        }
      })

      segments.forEach((segment, segmentIndex) => {
        const segmentTime = runSegmentTimes[segmentIndex]
        if (segmentTime === undefined) return
        const segmentStats = stats.segments[segment]
        segmentStats.counter++
        segmentStats.fastest = Math.min(segmentStats.fastest, segmentTime)
        if (isTargetForDistribution) {
          segmentTimes[segment][period.key].push(segmentTime)
        }
      })
    })
  }

  const splitData = Object.fromEntries(splits.map(split => [
    split,
    Object.fromEntries(periods.map(({ key }, periodIndex) => {
      const checkpointStats = periodStats[periodIndex][requestedPlayer]?.checkpoints[split]
      const { sum = 0, counter = 0 } = checkpointStats ?? {}
      return [key, counter > 0 ? sum / counter : undefined]
    }))
  ]))

  periodStats.forEach((playerStats, periodIndex) => {
    for (const stats of Object.values(playerStats)) {
      segments.forEach((segment, index) => {
        const currentCheckpoint = stats.checkpoints[checkpoints[index]]
        const currentAverage = currentCheckpoint.counter > 0
          ? currentCheckpoint.sum / currentCheckpoint.counter
          : undefined
        const previousCheckpoint = index > 0 ? stats.checkpoints[checkpoints[index - 1]] : null
        const previousAverage = previousCheckpoint?.counter > 0
          ? previousCheckpoint.sum / previousCheckpoint.counter
          : undefined

        if (Number.isFinite(currentAverage) && (index === 0 || Number.isFinite(previousAverage))) {
          stats.segments[segment].avg = currentAverage - (previousAverage ?? 0)
        }
      })
    }
  })

  const segmentStatsByPeriod = Object.fromEntries(segments.map(segment => [segment, {}]))
  periods.forEach(({ key }, periodIndex) => {
    const playerStats = periodStats[periodIndex][requestedPlayer]
    segments.forEach(segment => {
      const stats = playerStats?.segments[segment]
      segmentStatsByPeriod[segment][key] = stats
        ? {
          ...stats,
          fastest: Number.isFinite(stats.fastest) ? stats.fastest : undefined
        }
        : { counter: 0 }
    })
  })

  return { splitData, segmentStats: segmentStatsByPeriod, segmentTimes }
}

export async function getPlayerDataForAllPeriod(data, nickname) {
  return getPlayerStatsForAllPeriods(data, nickname).splitData
}

export function getPlayerSplitStatsForAllPeriods(data, nickname) {
  return getPlayerStatsForAllPeriods(data, nickname).segmentStats
}

export function getPlayerSegmentTimesForAllPeriods(data, nickname) {
  return getPlayerStatsForAllPeriods(data, nickname).segmentTimes
}

/* Build each average data array for one specifid time period */
export async function getAllDataByPlayerAndDay(data, player, day) {
  const trimData = await sanitizeData(data, day)
  player = player.trim().toLowerCase()

  /* Building the player's data array  */
  let playersData = []
  playersData[player] = []
  trimData.forEach(run => {
    const nickname = run.nickname.toLowerCase()
    // If it's a new player we create the cell, if not we insert into the corresponding username
    if (nickname == player) {
      playersData[nickname].push(run)
    }
  })

  /* Building the player's split array */
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']

  let playersSplit = {}
  for (const player in playersData) {
    // Initializing each player into the final array
    playersSplit[player] = []

    // Initializing each split for this player
    splits.forEach(split => {
      playersSplit[player][split] = { run: [] }
    })

    const runs = playersData[player]
    // Pathing into each run of each player
    runs.forEach(run => {
      // Pathing all splits
      splits.forEach(split => {
        // Only adding the split if it was played
        if (run[split]) {
          playersSplit[player][split]["run"].push(run[split])
        }
      })
    })

    // Pathing threw each split to get additional datas like number of each split played and fastest and avg time of the said split
    splits.forEach(split => {
      const values = playersSplit[player][split].run
      if (values.length > 0) {
        const fastest = Math.min(...values)
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / values.length

        playersSplit[player][split].fastest = fastest
        playersSplit[player][split].avg = avg
        playersSplit[player][split].counter = values.length
      }
    })
  }
  return [playersSplit]
}

/* Build the unique time of each split for all periods */
export function uniqueSplitTimeAllPeriods(playerDataAllPeriod) {
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const splitsRename = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']
  const result = {}

  // We iterate threw each split starting with last one
  for (let i = splits.length - 1; i >= 0; i--) {
    const current = splits[i]
    const currentData = playerDataAllPeriod[current]
    const newName = splitsRename[i]
    result[newName] = {}

    // Not touching to the first split (nether)
    if (i === 0) {
      result[newName] = { ...currentData }
    } else {
      const previous = playerDataAllPeriod[splits[i - 1]]
      // Substracting each split with the sum of all previous splits
      for (const key in currentData) {
        if (Number.isFinite(currentData[key]) && Number.isFinite(previous[key])) {
          result[newName][key] = currentData[key] - previous[key]
        }
      }
    }
  }
  return result
}
