import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSharedRankings } from '../backend/rankingMath.js'

test('shared rankings use one period, the AA eligibility filter, and shared tie ranks', () => {
  const now = Date.parse('2026-11-28T00:00:00.000Z')
  const recent = new Date(now - 60 * 60 * 1000).toISOString()
  const old = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
  const candidates = [
    { uuid: 'uuid-alpha', nickname: 'Alpha' },
    { uuid: 'uuid-target', nickname: 'Target' },
    { uuid: 'uuid-gamma', nickname: 'Gamma' },
    { uuid: 'uuid-dormant', nickname: 'Dormant' }
  ]
  const runs = [
    { uuid: 'uuid-alpha', nickname: 'OldAlpha', insertTime: recent, nether: 180000, bastion: 300000 },
    { uuid: 'uuid-alpha', nickname: 'OldAlpha', insertTime: recent, nether: 220000 },
    { uuid: 'uuid-target', nickname: 'Target', insertTime: recent, nether: 150000, bastion: 350000 },
    { uuid: 'uuid-gamma', nickname: 'Gamma', insertTime: recent, nether: 150000, bastion: 250000 },
    { uuid: 'uuid-target', nickname: 'Target', insertTime: recent, nether: 160000, credits: 900000 },
    { uuid: 'uuid-gamma', nickname: 'Gamma', insertTime: old, nether: 100000 }
  ]

  const snapshot = buildSharedRankings(runs, {
    days: 1,
    now,
    candidates,
    source: 'test'
  })

  assert.equal(snapshot.playerCount, 3)
  assert.equal(snapshot.candidateCount, 4)
  assert.equal(snapshot.players['uuid-target'].nickname, 'Target')
  assert.deepEqual(snapshot.players['uuid-target'].splits.nether, {
    counter: 1,
    fastest: 150000,
    avg: 150000,
    lbAvg: 1,
    lbFastest: 1,
    lbCounter: 2
  })
  assert.equal(snapshot.players['uuid-alpha'].splits.nether.lbAvg, 3)
  assert.equal(snapshot.players['uuid-gamma'].splits.nether.lbAvg, 1)
  assert.equal(snapshot.players['uuid-target'].splits.nether.lbAvg, snapshot.players['uuid-gamma'].splits.nether.lbAvg)
  assert.equal(snapshot.players['uuid-target'].splits.bastion.conversion, 100)
  assert.equal(snapshot.players['uuid-target'].splits.bastion.lbConversion, 1)
  assert.equal(snapshot.players['uuid-target'].splits.bastion.lbConversion, snapshot.players['uuid-gamma'].splits.bastion.lbConversion)
  assert.equal(snapshot.players['uuid-target'].segments.overworld.lbAvg, 1)
  assert.equal(snapshot.players['uuid-target'].segments.overworld.lbAvg, snapshot.players['uuid-gamma'].segments.overworld.lbAvg)
  assert.equal(snapshot.players['uuid-target'].segments.nether.avg, 200000)
  assert.equal(snapshot.players['uuid-target'].segments.nether.lbConversion, 1)
  assert.equal(snapshot.players['uuid-target'].segments.nether.lbConversion, snapshot.players['uuid-gamma'].segments.nether.lbConversion)
  assert.equal(snapshot.players['uuid-dormant'].splits.nether.counter, 0)
})

test('shared rankings reject unsupported periods', () => {
  assert.throws(() => buildSharedRankings([], { days: 365 }), /Unsupported ranking period/)
})

test('shared completion rankings rank counts, times, and completion conversion', () => {
  const now = Date.parse('2026-11-28T00:00:00.000Z')
  const insertTime = new Date(now - 60 * 60 * 1000).toISOString()
  const makeRuns = (uuid, nickname, credits, completions, finishTime) => [
    ...Array.from({ length: credits }, (_, index) => ({
      uuid,
      nickname,
      insertTime,
      nether: 180_000,
      elytra: 600_000,
      credits: 700_000,
      ...(index < completions ? { finish: finishTime } : {})
    }))
  ]
  const snapshot = buildSharedRankings([
    ...makeRuns('uuid-alpha', 'Alpha', 4, 3, 8_000_000),
    ...makeRuns('uuid-target', 'Target', 2, 2, 8_500_000),
    ...makeRuns('uuid-gamma', 'Gamma', 4, 2, 7_500_000),
    {
      uuid: 'uuid-old',
      nickname: 'OldRunner',
      insertTime: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      finish: 5_000_000
    }
  ], {
    days: 1,
    now,
    candidates: [
      { uuid: 'uuid-alpha', nickname: 'Alpha' },
      { uuid: 'uuid-target', nickname: 'Target' },
      { uuid: 'uuid-gamma', nickname: 'Gamma' },
      { uuid: 'uuid-dormant', nickname: 'Dormant' }
    ]
  })

  assert.deepEqual(snapshot.players['uuid-target'].completions, {
    counter: 2,
    fastest: 8_500_000,
    avg: 8_500_000,
    conversion: 100,
    lbCounter: 2,
    lbAvg: 3,
    lbFastest: 3,
    lbConversion: 1
  })
  assert.equal(snapshot.players['uuid-alpha'].completions.lbCounter, 1)
  assert.equal(snapshot.players['uuid-gamma'].completions.lbFastest, 1)
  assert.equal(snapshot.players['uuid-dormant'].completions.counter, 0)
  assert.equal(snapshot.players['uuid-dormant'].completions.lbCounter, undefined)
})
