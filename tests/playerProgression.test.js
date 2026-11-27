import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchDataPacemanApi,
  fetchPlayerProgression,
  fetchPlayerRunHistory,
  getPlayerCompletionStatsByDay,
  getPlayerCompletionConversionRank,
  getPlayerDataByDay,
  trimAllDataByPlayerId,
  getPlayerStatsForAllPeriods,
  getPlayerSplitStatsForAllPeriods,
  getPlayerSegmentTimesForAllPeriods
} from '../src/services/playerService.js'

test('completion count includes only completed runs in the selected period', () => {
  const now = Date.parse('2025-01-31T12:00:00Z')
  const runs = [
    { insertTime: '2025-01-31T11:00:00Z', finish: 8_280_000 },
    { insertTime: '2025-01-31T10:00:00Z', finish: null },
    { insertTime: '2025-01-29T11:00:00Z', finish: 8_100_000 }
  ]

  assert.deepEqual(getPlayerCompletionStatsByDay(runs, 1, now), {
    counter: 1,
    fastest: 8_280_000,
    avg: 8_280_000
  })
  assert.deepEqual(getPlayerCompletionStatsByDay(runs, 7, now), {
    counter: 2,
    fastest: 8_100_000,
    avg: 8_190_000
  })
})

test('completion conversion rank compares completions with credit splits', () => {
  const now = Date.now()
  const insertTime = new Date(now - 60_000).toISOString()
  const completedRuns = (nickname, count, completions) =>
    Array.from({ length: count }, (_, index) => ({
      nickname,
      insertTime,
      nether: 180000,
      credits: 500000,
      ...(index < completions ? { finish: 600000 } : {})
    }))
  const runs = [
    ...completedRuns('Alpha', 4, 3),
    ...completedRuns('Target', 2, 2),
    ...completedRuns('Gamma', 4, 2)
  ]

  assert.equal(getPlayerCompletionConversionRank(runs, 1, 'target', now), 1)
  assert.equal(getPlayerCompletionConversionRank(runs, 1, 'unknown', now), undefined)
})

test('global Paceman data requests are shared and cached', async t => {
  let fetchCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCount++
    return new Response(JSON.stringify({ data: [] }))
  })

  const [first, second] = await Promise.all([
    fetchDataPacemanApi(),
    fetchDataPacemanApi()
  ])
  const third = await fetchDataPacemanApi()

  assert.equal(fetchCount, 1)
  assert.deepEqual(first, [])
  assert.deepEqual(second, [])
  assert.deepEqual(third, [])
})

test('player run history is cached by normalized nickname', async t => {
  let fetchCount = 0
  t.mock.method(globalThis, 'fetch', async input => {
    fetchCount++
    const { pathname } = new URL(input, 'http://localhost')
    if (pathname.endsWith('/getPlayerInfo/')) {
      return new Response(JSON.stringify({
        runner: { nick: 'CacheTester', id: 'cache-player-id' }
      }))
    }
    if (pathname.endsWith('/getAAPlayerRuns/')) {
      return new Response(JSON.stringify({
        rows: [{ lastUpdated: 1704067200000 }],
        hasMore: false
      }))
    }
    throw new Error(`Unexpected request: ${pathname}`)
  })

  const [first, second] = await Promise.all([
    fetchPlayerRunHistory('CacheTester'),
    fetchPlayerRunHistory('cachetester')
  ])

  assert.equal(fetchCount, 2)
  assert.equal(first[0].nickname, 'CacheTester')
  assert.equal(second[0].nickname, 'cachetester')
  assert.equal(first[0].insertTime, new Date(1704067200000).toISOString())
})

test('period rankings preserve positions and insertion order for ties', () => {
  const insertTime = new Date().toISOString()
  const runs = [
    { nickname: 'Alpha', insertTime, nether: 180000 },
    { nickname: 'Target', insertTime, nether: 180000 },
    { nickname: 'Gamma', insertTime, nether: 150000 }
  ]

  const playerData = getPlayerDataByDay(runs, 9999, 'target')
  const stats = playerData[0].target.nether
  const avgRank = playerData[1].nether[0].position
  const fastestRank = playerData[2].nether[0].position
  const counterRank = playerData[3].nether[0].position

  assert.equal(stats.avg, 180000)
  assert.equal(avgRank, 3)
  assert.equal(fastestRank, 3)
  assert.equal(counterRank, 2)
})

test('split conversion ranks compare each split count with the previous split count', () => {
  const insertTime = new Date().toISOString()
  const runs = [
    ...Array.from({ length: 4 }, () => ({ nickname: 'Alpha', insertTime, nether: 180000 })),
    ...Array.from({ length: 3 }, () => ({ nickname: 'Alpha', insertTime, nether: 180000, bastion: 300000 })),
    ...Array.from({ length: 2 }, () => ({ nickname: 'Target', insertTime, nether: 180000, bastion: 300000 })),
    ...Array.from({ length: 4 }, () => ({ nickname: 'Gamma', insertTime, nether: 180000 })),
    ...Array.from({ length: 2 }, () => ({ nickname: 'Gamma', insertTime, nether: 180000, bastion: 300000 }))
  ]

  const playerData = getPlayerDataByDay(runs, 9999, 'target')
  const advancedData = trimAllDataByPlayerId(playerData, 'target')

  assert.equal(advancedData.data.bastion.counter / advancedData.data.nether.counter, 1)
  assert.equal(advancedData.data.bastion.lbConversion, 1)
  assert.equal(advancedData.data.nether.lbConversion, undefined)
})

test('segment rankings preserve positions and insertion order for ties', () => {
  const insertTime = new Date().toISOString()
  const runs = [
    { nickname: 'Alpha', insertTime, nether: 180000, bastion: 300000 },
    { nickname: 'Target', insertTime, nether: 180000, bastion: 300000 },
    { nickname: 'Gamma', insertTime, nether: 150000, bastion: 250000 }
  ]

  const stats = getPlayerSplitStatsForAllPeriods(runs, 'target').overworld.avgAT

  assert.equal(stats.lbAvg, 3)
  assert.equal(stats.lbFastest, 3)
  assert.equal(stats.lbCounter, 2)
})

test('split average conversion ranks compare segment counts with the previous segment', () => {
  const insertTime = new Date().toISOString()
  const runs = [
    ...Array.from({ length: 4 }, () => ({ nickname: 'Alpha', insertTime, nether: 180000 })),
    ...Array.from({ length: 3 }, () => ({ nickname: 'Alpha', insertTime, nether: 180000, bastion: 300000 })),
    ...Array.from({ length: 2 }, () => ({ nickname: 'Target', insertTime, nether: 180000, bastion: 300000 })),
    ...Array.from({ length: 4 }, () => ({ nickname: 'Gamma', insertTime, nether: 180000 })),
    ...Array.from({ length: 2 }, () => ({ nickname: 'Gamma', insertTime, nether: 180000, bastion: 300000 }))
  ]

  const stats = getPlayerSplitStatsForAllPeriods(runs, 'target')

  assert.equal(stats.nether.avgAT.counter / stats.overworld.avgAT.counter, 1)
  assert.equal(stats.nether.avgAT.lbConversion, 1)
  assert.equal(stats.overworld.avgAT.lbConversion, undefined)
})

test('combined period stats retain each period’s averages and segment runs', () => {
  const now = Date.now()
  const runs = [
    { nickname: 'Target', insertTime: new Date(now - 60_000).toISOString(), nether: 180000, bastion: 300000 },
    { nickname: 'Target', insertTime: new Date(now - 10 * 86400000).toISOString(), nether: 200000, bastion: 320000 }
  ]

  const stats = getPlayerStatsForAllPeriods(runs, 'target')

  assert.deepEqual(stats.splitData.nether, {
    avg1d: 180000,
    avg7d: 180000,
    avg30d: 190000,
    avgAT: 190000
  })
  assert.deepEqual(stats.segmentTimes.overworld.avg1d, [180000])
  assert.deepEqual(stats.segmentTimes.overworld.avg30d, [180000, 200000])
  assert.equal(stats.segmentStats.overworld.avgAT.counter, 2)
  assert.equal(stats.segmentStats.overworld.avgAT.fastest, 180000)
})

test('progression keeps only strictly improving times in chronological order for each runner', async t => {
  const csv = [
    'Date,Runner,IGT,Link,Status',
    '05 Jan 2025,Alpha,1:30:00,,Verified',
    '01 Jan 2025,Alpha,2:00:00,,Verified',
    '04 Jan 2025,Alpha,1:45:00,,Verified',
    '02 Jan 2025,Alpha,2:30:00,,Verified',
    '03 Jan 2025,Alpha,1:45:00,,Verified',
    '06 Jan 2025,Alpha,1:40:00,,Verified',
    '01 Jan 2025,Beta,3:00:00,,Verified',
    '02 Jan 2025,Beta,3:00:00,,Verified',
    '03 Jan 2025,Beta,2:00:00,,Verified'
  ].join('\n')
  t.mock.method(globalThis, 'fetch', async () => new Response(csv))

  const alpha = await fetchPlayerProgression(' alpha ')
  const beta = await fetchPlayerProgression('BETA')
  const missing = await fetchPlayerProgression('unknown')

  assert.deepEqual(alpha.map(record => record.time), [7200000, 6300000, 5400000])
  assert.deepEqual(alpha.map(record => new Date(record.timestamp).getUTCDate()), [1, 3, 5])
  assert.deepEqual(beta.map(record => record.time), [10800000, 7200000])
  assert.deepEqual(missing, [])
})

test('segment distributions include each run’s Outer End time', () => {
  const runs = [
    { nickname: 'Alpha', insertTime: new Date().toISOString(), nether: 180000, end: 500000, elytra: 600000, credits: 900000 },
    { nickname: 'Alpha', insertTime: new Date().toISOString(), nether: 190000, end: 600000, elytra: 700000, credits: 1100000 }
  ]

  const segmentTimes = getPlayerSegmentTimesForAllPeriods(runs, 'alpha')

  assert.deepEqual(segmentTimes.elytra.avgAT, [300000, 400000])
  assert.deepEqual(segmentTimes.elytra.avg1d, [300000, 400000])
})
