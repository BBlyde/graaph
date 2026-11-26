////// GENERAL FUNCTIONS

const progressionSheetUrl = 'https://docs.google.com/spreadsheets/d/107ijqjELTQQ29KW4phUmtvYFTX9-pfHsjb18TKoWACk/gviz/tq?tqx=out:csv&gid=735237004'

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

  if (isQuoted) throw new Error('Invalid progression sheet CSV')
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
  const res = await fetch(`/api/getAllData/?days=9999`)
  if (!res.ok) throw new Error(`Paceman API error (${res.status})`)
  const json = await res.json()
  if (!Array.isArray(json.data)) throw new Error('Invalid Paceman API response')
  return json.data
}

export async function fetchPlayerRunHistory(nickname) {
  const playerParams = new URLSearchParams({ names: nickname })
  const playerResponse = await fetch(`/paceman-stats-api/getPlayerInfo/?${playerParams}`)
  if (!playerResponse.ok) throw new Error(`Paceman player API error (${playerResponse.status})`)
  const players = await playerResponse.json()
  if (!players || typeof players !== 'object' || Array.isArray(players)) {
    throw new Error('Invalid Paceman player API response')
  }

  const requestedNickname = nickname.trim().toLowerCase()
  const player = Object.values(players).find(entry =>
    typeof entry?.nick === 'string' && entry.nick.trim().toLowerCase() === requestedNickname
  )
  if (!player) return []
  if (typeof player.id !== 'string' || !player.id) {
    throw new Error('Invalid Paceman player identifier')
  }

  const rows = []
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

    rows.push(...page.rows)
    hasMore = page.hasMore
    if (hasMore) {
      if (!Number.isInteger(page.nextCursor) || seenCursors.has(page.nextCursor)) {
        throw new Error('Invalid Paceman run history pagination cursor')
      }
      beforeId = page.nextCursor
      seenCursors.add(beforeId)
    }
  }

  return rows.map(run => {
    if (!Number.isFinite(run.lastUpdated)) {
      throw new Error('Invalid Paceman run timestamp')
    }
    return {
      ...run,
      nickname,
      insertTime: new Date(run.lastUpdated).toISOString()
    }
  })
}

/* Trimming the data to only get the runs played X days ago */
export async function sanitizeData(data, day) {
  const now = new Date()
  const xDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000 * day)

  const res = []
  data.forEach(runObject => {
    // Only adding if (nether > 2m or player got elytra) and we verify if the run was played within x days
    if ((runObject.nether > 120000 || runObject.elytra) && runObject.insertTime >= xDayAgo.toISOString()) {
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

export async function getAllLeaderboardData(board = 'rsg') {
  if (!['rsg', 'thunderless'].includes(board)) {
    throw new Error('Invalid leaderboard board')
  }
  const response = await fetch(`/secure-api/api/leaderboard/all?cat=aa&board=${encodeURIComponent(board)}`)
  if (!response.ok) throw new Error(`Leaderboard API error (${response.status})`)
  const data = await response.json()
  if (!Array.isArray(data.runs)) throw new Error('Invalid leaderboard API response')

  return data.runs.map(run => {
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

/* Build the data for the said player as long as all the leaderboards for avgs, fastest and numbers */
export function getPlayerDataByDay(data, day) {
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const now = new Date()
  const xDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000 * day)
  const cutoff = xDayAgo.toISOString()

  const playersSplit = {}
  const playersStats = {}
  data.forEach(run => {
    const player = run.nickname.toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(playersSplit, player)) {
      playersSplit[player] = []
      playersStats[player] = {}
      splits.forEach(split => {
        playersSplit[player][split] = { run: [] }
        playersStats[player][split] = { sum: 0, fastest: Infinity, counter: 0 }
      })
    }

    if (!((run.nether > 120000 || run.elytra > 120000) && run.insertTime >= cutoff)) return

    splits.forEach(split => {
      const time = run[split]
      if (!time) return

      playersSplit[player][split].run.push(time)
      const stats = playersStats[player][split]
      stats.sum += time
      stats.fastest = Math.min(stats.fastest, time)
      stats.counter++
    })
  })

  for (const player in playersSplit) {
    splits.forEach(split => {
      const stats = playersStats[player][split]
      if (stats.counter > 0) {
        playersSplit[player][split].fastest = stats.fastest
        playersSplit[player][split].avg = stats.sum / stats.counter
        playersSplit[player][split].counter = stats.counter
      }
    })
  }

  /* Building the two arrays of avg and fastest time for each split and player, will be helpfull later to get leaderboard */
  const leaderboardAvg = []
  const leaderboardFastest = []
  const leaderboardCounter = []
  // Pathing each player
  Object.entries(playersSplit).map(([player, splits]) => {
    // Pathing each split
    Object.entries(splits).map(([split, splitTime]) => {
      // Initializing each object
      if (!leaderboardAvg[split]) {
        leaderboardAvg[split] = []
      }
      // Initializing each object
      if (!leaderboardFastest[split]) {
        leaderboardFastest[split] = []
      }
      // Initializing each object
      if (!leaderboardCounter[split]) {
        leaderboardCounter[split] = []
      }

      // Adding the corresponding time to both fastest/avg array
      Object.entries(splitTime).map(([cat, time]) => {
        if (cat == "avg") {
          leaderboardAvg[split][player] = time
        } else if (cat == "fastest") {
          leaderboardFastest[split][player] = time
        } else if (cat == "counter") {
          leaderboardCounter[split][player] = time
        }
      })
    })
  })

  /* Building the leaderboard Avg Array */
  const rankedAvg = {}
  for (const [split, player] of Object.entries(leaderboardAvg)) {
    const sorted = Object.entries(player)
      .sort((a, b) => a[1] - b[1])
      .map(([name, time], index) => ({
        name,
        split,
        time,
        position: index + 1
      }))
    rankedAvg[split] = sorted
  }

  /* Building the leaderboard Fastest Array */
  const rankedFastest = {}
  for (const [split, player] of Object.entries(leaderboardFastest)) {
    const sorted = Object.entries(player)
      .sort((a, b) => a[1] - b[1])
      .map(([name, time], index) => ({
        name,
        split,
        time,
        position: index + 1
      }))
    rankedFastest[split] = sorted
  }

  /* Building the leaderboard Fastest Array */
  const rankedCounter = {}
  for (const [split, player] of Object.entries(leaderboardCounter)) {
    const sorted = Object.entries(player)
      .sort((a, b) => b[1] - a[1])
      .map(([name, number], index) => ({
        name,
        split,
        number,
        position: index + 1
      }))
    rankedCounter[split] = sorted
  }
  return [playersSplit, rankedAvg, rankedFastest, rankedCounter]
}

/* Trimming the advanced datas */
export function trimAllDataByPlayerId(datas, id) {
  /* Defining player's properties */
  const nickname = id
  id = id.trim().toLowerCase()

  const getPlayerPositions = leaderboard => {
    const positions = {}
    for (const [split, entries] of Object.entries(leaderboard)) {
      for (const entry of entries) {
        if (entry.name == id && entry.split == split) positions[split] = entry.position
      }
    }
    return positions
  }
  const avgPositions = getPlayerPositions(datas[1])
  const fastestPositions = getPlayerPositions(datas[2])
  const counterPositions = getPlayerPositions(datas[3])

  const dataPlayer = []
  // Pathing the raw datas
  for (const [player, playerData] of Object.entries(datas[0])) {
    // Only getting the right player's data
    if (player == id) {
      // Accessing each split's data
      for (const [split, splitData] of Object.entries(playerData)) {
        dataPlayer[split] = splitData

        if (avgPositions[split] !== undefined) splitData.lbAvg = avgPositions[split]
        if (fastestPositions[split] !== undefined) splitData.lbFastest = fastestPositions[split]
        if (counterPositions[split] !== undefined) splitData.lbCounter = counterPositions[split]
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

/* Build the average data for the said player with all time periods */
export async function getPlayerDataForAllPeriod(data, nickname) {
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const periods = [
    { key: 'avg1d', days: 1 },
    { key: 'avg7d', days: 7 },
    { key: 'avg30d', days: 30 },
    { key: 'avgAT', days: 9999 }
  ]
  const player = nickname.trim().toLowerCase()
  const cutoffs = periods.map(({ days }) => {
    const now = new Date()
    return new Date(now.getTime() - 24 * 60 * 60 * 1000 * days).toISOString()
  })
  const periodStats = periods.map(() =>
    Object.fromEntries(splits.map(split => [split, { sum: 0, counter: 0 }]))
  )

  for (const run of data) {
    if (!(run.nether > 120000 || run.elytra)) continue
    const includedPeriods = cutoffs.map(cutoff => run.insertTime >= cutoff)
    if (!includedPeriods.some(Boolean)) continue

    const runNickname = run.nickname.toLowerCase()
    if (runNickname !== player) continue

    periods.forEach((period, periodIndex) => {
      if (!includedPeriods[periodIndex]) return

      splits.forEach(split => {
        const time = run[split]
        if (time) {
          const stats = periodStats[periodIndex][split]
          stats.sum += time
          stats.counter++
        }
      })
    })
  }

  const res = Object.fromEntries(splits.map(split => [
    split,
    Object.fromEntries(periods.map(({ key }, periodIndex) => {
      const { sum, counter } = periodStats[periodIndex][split]
      return [key, counter > 0 ? sum / counter : undefined]
    }))
  ]))
  return res
}

export function getPlayerSplitStatsForAllPeriods(data, nickname) {
  const checkpoints = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const segments = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']
  const periods = [
    { key: 'avg1d', days: 1 },
    { key: 'avg7d', days: 7 },
    { key: 'avg30d', days: 30 },
    { key: 'avgAT', days: 9999 }
  ]
  const requestedPlayer = nickname.trim().toLowerCase()
  const result = Object.fromEntries(segments.map(segment => [segment, {}]))

  periods.forEach(({ key, days }) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000 * days).toISOString()
    const playerStats = {}

    for (const run of data) {
      if (!(run.nether > 120000 || run.elytra) || !(run.insertTime >= cutoff)) continue

      const player = run.nickname.toLowerCase()
      if (!playerStats[player]) {
        playerStats[player] = {
          checkpoints: Object.fromEntries(checkpoints.map(checkpoint => [checkpoint, { sum: 0, counter: 0 }])),
          segments: Object.fromEntries(segments.map(segment => [segment, { counter: 0, fastest: Infinity }]))
        }
      }

      const stats = playerStats[player]
      checkpoints.forEach(checkpoint => {
        const time = run[checkpoint]
        if (!time) return

        stats.checkpoints[checkpoint].sum += time
        stats.checkpoints[checkpoint].counter++
      })

      segments.forEach((segment, index) => {
        const end = run[checkpoints[index]]
        const start = index === 0 ? 0 : run[checkpoints[index - 1]]
        if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) return

        const segmentStats = stats.segments[segment]
        const time = end - start
        segmentStats.counter++
        segmentStats.fastest = Math.min(segmentStats.fastest, time)
      })
    }

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

    segments.forEach(segment => {
      const rankings = [
        { field: 'avg', rank: 'lbAvg', descending: false },
        { field: 'fastest', rank: 'lbFastest', descending: false },
        { field: 'counter', rank: 'lbCounter', descending: true }
      ]

      rankings.forEach(({ field, rank, descending }) => {
        Object.entries(playerStats)
          .filter(([, stats]) => {
            const value = stats.segments[segment][field]
            return Number.isFinite(value) && value > 0
          })
          .sort(([, a], [, b]) => descending
            ? b.segments[segment][field] - a.segments[segment][field]
            : a.segments[segment][field] - b.segments[segment][field])
          .forEach(([player], index) => {
            playerStats[player].segments[segment][rank] = index + 1
          })
      })

      const playerSegmentStats = playerStats[requestedPlayer]?.segments[segment]
      if (playerSegmentStats) {
        result[segment][key] = {
          ...playerSegmentStats,
          fastest: Number.isFinite(playerSegmentStats.fastest) ? playerSegmentStats.fastest : undefined
        }
      } else {
        result[segment][key] = { counter: 0 }
      }
    })
  })

  return result
}

/* Individual segment times (one entry per run) of the player for each period, used for distributions */
export function getPlayerSegmentTimesForAllPeriods(data, nickname) {
  const checkpoints = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const segments = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']
  const periods = [
    { key: 'avg1d', days: 1 },
    { key: 'avg7d', days: 7 },
    { key: 'avg30d', days: 30 },
    { key: 'avgAT', days: 9999 }
  ]
  const requestedPlayer = nickname.trim().toLowerCase()
  const result = Object.fromEntries(segments.map(segment => [
    segment,
    Object.fromEntries(periods.map(({ key }) => [key, []]))
  ]))
  const cutoffs = periods.map(({ days }) => new Date(Date.now() - 24 * 60 * 60 * 1000 * days).toISOString())

  for (const run of data) {
    if (!(run.nether > 120000 || run.elytra)) continue
    if (typeof run.nickname !== 'string' || run.nickname.trim().toLowerCase() !== requestedPlayer) continue

    segments.forEach((segment, index) => {
      const end = run[checkpoints[index]]
      const start = index === 0 ? 0 : run[checkpoints[index - 1]]
      if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) return

      periods.forEach(({ key }, periodIndex) => {
        if (run.insertTime >= cutoffs[periodIndex]) result[segment][key].push(end - start)
      })
    })
  }
  return result
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
