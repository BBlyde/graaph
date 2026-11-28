export const splitNames = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
export const segmentNames = ['overworld', 'nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra']

const dayMs = 24 * 60 * 60 * 1000

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : ''
}

function getRunTimestamp(run) {
  const timestamp = Date.parse(run.insertTime)
  if (Number.isFinite(timestamp)) return timestamp
  return Number.isFinite(run.lastUpdated) ? run.lastUpdated : undefined
}

function isEligibleRun(run) {
  return (run.nether > 120000 || run.end) && !(run.credits && !run.elytra)
}

function compareText(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function assignRanks(players, getValue, rankName, descending = false) {
  const eligible = players
    .map(player => ({ player, value: getValue(player) }))
    .filter(entry => Number.isFinite(entry.value))
    .sort((left, right) =>
      (descending ? right.value - left.value : left.value - right.value) ||
      compareText(normalizeName(left.player.nickname), normalizeName(right.player.nickname)) ||
      compareText(left.player.id, right.player.id)
    )

  eligible.forEach(({ player, value }, index) => {
    const rank = index > 0 && value === eligible[index - 1].value
      ? eligible[index - 1].player.splits[rankName.split][rankName.field]
      : index + 1
    player.splits[rankName.split][rankName.field] = rank
  })
}

export function buildSharedRankings(runs, {
  days,
  now = Date.now(),
  candidates = [],
  source = 'paceman-aa',
  unresolvedRunnerCount = 0
}) {
  if (![1, 7, 30, 9999].includes(days)) throw new Error('Unsupported ranking period')
  const cutoff = now - dayMs * days
  const players = new Map()
  const candidateNames = new Map()
  const candidateIds = new Set()

  const addPlayer = (id, nickname) => {
    if (!id || !normalizeName(nickname)) return null
    let player = players.get(id)
    if (!player) {
      player = {
        id,
        nickname: nickname.trim(),
        completions: {
          sum: 0,
          counter: 0,
          fastest: Infinity
        },
        segments: Object.fromEntries(segmentNames.map(segment => [segment, {
          counter: 0,
          fastest: Infinity
        }])),
        splits: Object.fromEntries(splitNames.map(split => [split, {
          sum: 0,
          counter: 0,
          fastest: Infinity
        }]))
      }
      players.set(id, player)
    } else {
      player.nickname = nickname.trim()
    }
    return player
  }

  candidates.forEach(candidate => {
    const uuid = typeof candidate.uuid === 'string' ? candidate.uuid.trim().toLowerCase() : ''
    const nickname = typeof candidate.nickname === 'string' ? candidate.nickname.trim() : ''
    const id = uuid || normalizeName(nickname)
    if (id) {
      candidateNames.set(id, nickname)
      candidateIds.add(id)
    }
    addPlayer(id, nickname)
  })

  for (const run of runs) {
    const timestamp = getRunTimestamp(run)
    if (!Number.isFinite(timestamp) || timestamp < cutoff) continue

    const nickname = typeof run.nickname === 'string' ? run.nickname.trim() : ''
    const uuid = typeof run.uuid === 'string' ? run.uuid.trim().toLowerCase() : ''
    const id = uuid || normalizeName(nickname)
    const eligibleRun = isEligibleRun(run)
    const hasCompletion = Number.isFinite(run.finish) && run.finish > 0
    if (!eligibleRun && !hasCompletion) continue
    const player = addPlayer(id, candidateNames.get(id) || nickname)
    if (!player) continue

    if (hasCompletion) {
      player.completions.sum += run.finish
      player.completions.counter++
      player.completions.fastest = Math.min(player.completions.fastest, run.finish)
    }

    if (!eligibleRun) continue
    for (const split of splitNames) {
      const time = run[split]
      if (!Number.isFinite(time) || time <= 0) continue
      const stats = player.splits[split]
      stats.sum += time
      stats.counter++
      stats.fastest = Math.min(stats.fastest, time)
    }
    for (let index = 0; index < segmentNames.length; index++) {
      const end = run[splitNames[index]]
      const start = index === 0 ? 0 : run[splitNames[index - 1]]
      if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) continue
      const stats = player.segments[segmentNames[index]]
      stats.counter++
      stats.fastest = Math.min(stats.fastest, end - start)
    }
  }

  const playerEntries = [...players.values()]
  for (const player of playerEntries) {
    const completions = player.completions
    if (completions.counter > 0) {
      completions.avg = completions.sum / completions.counter
      completions.conversion = player.splits.credits.counter > 0
        ? completions.counter / player.splits.credits.counter * 100
        : undefined
    } else {
      completions.avg = undefined
      completions.fastest = undefined
      completions.conversion = undefined
    }
  }

  const assignCompletionRank = (field, descending = false) => {
    const eligible = playerEntries
      .map(player => ({ player, value: player.completions[field] }))
      .filter(entry => Number.isFinite(entry.value) && entry.value > 0)
      .sort((left, right) =>
        (descending ? right.value - left.value : left.value - right.value) ||
        compareText(normalizeName(left.player.nickname), normalizeName(right.player.nickname)) ||
        compareText(left.player.id, right.player.id)
      )
    const rankField = `lb${field[0].toUpperCase()}${field.slice(1)}`
    eligible.forEach(({ player, value }, index) => {
      player.completions[rankField] = index > 0 && value === eligible[index - 1].value
        ? eligible[index - 1].player.completions[rankField]
        : index + 1
    })
  }

  assignCompletionRank('counter', true)
  assignCompletionRank('avg')
  assignCompletionRank('fastest')
  assignCompletionRank('conversion', true)

  for (const split of splitNames) {
    for (const player of playerEntries) {
      const stats = player.splits[split]
      if (stats.counter > 0) {
        stats.avg = stats.sum / stats.counter
      } else {
        stats.avg = undefined
        stats.fastest = undefined
      }
    }

    assignRanks(
      playerEntries,
      player => player.splits[split].counter > 0 ? player.splits[split].avg : undefined,
      { split, field: 'lbAvg' }
    )
    assignRanks(
      playerEntries,
      player => player.splits[split].counter > 0 ? player.splits[split].fastest : undefined,
      { split, field: 'lbFastest' }
    )
    assignRanks(
      playerEntries,
      player => player.splits[split].counter > 0 ? player.splits[split].counter : undefined,
      { split, field: 'lbCounter' },
      true
    )
  }

  for (const player of playerEntries) {
    segmentNames.forEach((segment, index) => {
      const currentAverage = player.splits[splitNames[index]].avg
      const previousAverage = index > 0 ? player.splits[splitNames[index - 1]].avg : 0
      const stats = player.segments[segment]
      stats.avg = Number.isFinite(currentAverage) && Number.isFinite(previousAverage)
        ? currentAverage - previousAverage
        : undefined
      stats.fastest = Number.isFinite(stats.fastest) ? stats.fastest : undefined
      stats.conversion = index > 0 && player.segments[segmentNames[index - 1]].counter > 0
        ? stats.counter / player.segments[segmentNames[index - 1]].counter * 100
        : undefined
    })
  }

  for (const segment of segmentNames) {
    const assignSegmentRank = (field, descending = false) => {
      const eligible = playerEntries
        .map(player => ({ player, value: player.segments[segment][field] }))
        .filter(entry => Number.isFinite(entry.value) && (field === 'conversion' || entry.value > 0))
        .sort((left, right) =>
          (descending ? right.value - left.value : left.value - right.value) ||
          compareText(normalizeName(left.player.nickname), normalizeName(right.player.nickname)) ||
          compareText(left.player.id, right.player.id)
        )
      const rankField = `lb${field[0].toUpperCase()}${field.slice(1)}`
      eligible.forEach(({ player, value }, index) => {
        player.segments[segment][rankField] = index > 0 && value === eligible[index - 1].value
          ? eligible[index - 1].player.segments[segment][rankField]
          : index + 1
      })
    }

    assignSegmentRank('avg')
    assignSegmentRank('fastest')
    assignSegmentRank('counter', true)
    assignSegmentRank('conversion', true)
  }

  splitNames.forEach((split, index) => {
    if (index === 0) return
    const previousSplit = splitNames[index - 1]
    for (const player of playerEntries) {
      const previousCounter = player.splits[previousSplit].counter
      const currentCounter = player.splits[split].counter
      player.splits[split].conversion = previousCounter > 0
        ? currentCounter / previousCounter * 100
        : undefined
    }
    assignRanks(
      playerEntries,
      player => player.splits[split].conversion,
      { split, field: 'lbConversion' },
      true
    )
  })

  return {
    days,
    updatedAt: new Date(now).toISOString(),
    source,
    playerCount: playerEntries.filter(player =>
      player.completions.counter > 0 ||
      splitNames.some(split => player.splits[split].counter > 0)
    ).length,
    candidateCount: candidateIds.size,
    unresolvedRunnerCount,
    players: Object.fromEntries(playerEntries.map(player => [
      player.id,
      {
        nickname: player.nickname,
        completions: (() => {
          const { sum, ...stats } = player.completions
          return stats
        })(),
        segments: player.segments,
        splits: Object.fromEntries(splitNames.map(split => {
          const { sum, ...stats } = player.splits[split]
          return [split, stats]
        }))
      }
    ]))
  }
}
