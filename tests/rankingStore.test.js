import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RankingStore } from '../backend/store.js'

test('ranking store persists runner identities, history rows, and snapshots', () => {
  const directory = mkdtempSync(join(tmpdir(), 'graaph-rankings-'))
  const databasePath = join(directory, 'rankings.sqlite')
  let store = new RankingStore(databasePath)
  try {
    store.addRunner({ uuid: 'UUID-ONE', nickname: 'RunnerOne', source: 'aa' })
    store.addAlias('OldName', 'UUID-ONE')
    store.insertRuns('uuid-one', 'RunnerOne', [
      { id: 12, lastUpdated: 1_700_000_000_000, nether: 220_000 }
    ])
    store.saveSnapshot({
      days: 7,
      updatedAt: '2026-11-28T00:00:00.000Z',
      source: 'test',
      players: { 'uuid-one': { nickname: 'RunnerOne', splits: {} } }
    })

    store.close()
    store = new RankingStore(databasePath)
    assert.equal(store.getUuidByNickname('oldname'), 'uuid-one')
    assert.equal(store.hasRun('uuid-one', 12), true)
    assert.equal([...store.iterateRuns()][0].nickname, 'RunnerOne')
    assert.equal(store.getSnapshot(7).players['uuid-one'].nickname, 'RunnerOne')
    assert.throws(() => store.insertRuns('uuid-one', 'RunnerOne', [
      { id: 13, lastUpdated: 1_700_000_000_001, nether: 220_000 },
      { id: 'invalid', lastUpdated: 1_700_000_000_002 }
    ]), /Invalid AA run history row/)
    assert.equal(store.hasRun('uuid-one', 13), false)
  } finally {
    store.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
