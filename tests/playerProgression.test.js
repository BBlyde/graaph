import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchDataPacemanApi,
  fetchPlayerProgression,
  fetchPlayerRunHistory,
  getPlayerSegmentTimesForAllPeriods
} from '../src/services/playerService.js'

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
