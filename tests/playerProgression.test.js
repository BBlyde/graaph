import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchPlayerProgression } from '../src/services/playerService.js'

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
