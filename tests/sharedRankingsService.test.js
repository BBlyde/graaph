import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchSharedSplitStats } from '../src/services/playerService.js'

test('shared rankings request the selected runner and period', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl
  globalThis.fetch = async url => {
    requestedUrl = url
    return {
      ok: true,
      json: async () => ({
        days: 9999,
        updatedAt: '2026-11-28T00:00:00.000Z',
        completionStats: { counter: 2, avg: 223688, lbCounter: 1 },
        segments: { overworld: { counter: 1, avg: 223688, lbAvg: 1 } },
        stats: { nether: { counter: 2644, avg: 223688, lbAvg: 9 } }
      })
    }
  }

  try {
    const result = await fetchSharedSplitStats('coosh02', 9999)
    assert.equal(requestedUrl, '/ranking-api/player?nickname=coosh02&days=9999')
    assert.equal(result.stats.nether.lbAvg, 9)
    assert.equal(result.completionStats.lbCounter, 1)
    assert.equal(result.segments.overworld.lbAvg, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('shared rankings surface unavailable snapshots and malformed statistics', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => ({ ok: false, status: 503 })
    await assert.rejects(fetchSharedSplitStats('coosh02', 1), /API error \(503\)/)

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        days: 1,
        updatedAt: '2026-11-28T00:00:00.000Z',
        completionStats: { counter: 0 },
        segments: {},
        stats: { nether: { counter: -1 } }
      })
    })
    await assert.rejects(fetchSharedSplitStats('coosh02', 1), /Invalid shared AA split statistics/)

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        days: 1,
        updatedAt: '2026-11-28T00:00:00.000Z',
        completionStats: { counter: 1, lbCounter: 0 },
        segments: {},
        stats: {}
      })
    })
    await assert.rejects(fetchSharedSplitStats('coosh02', 1), /Invalid shared AA completion statistics/)

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        days: 1,
        updatedAt: '2026-11-28T00:00:00.000Z',
        completionStats: { counter: 0 },
        segments: { overworld: { counter: 1, lbAvg: 0 } },
        stats: {}
      })
    })
    await assert.rejects(fetchSharedSplitStats('coosh02', 1), /Invalid shared AA segment statistics/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
