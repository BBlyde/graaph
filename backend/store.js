import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export class RankingStore {
  constructor(databasePath = resolve('ranking-data', 'rankings.sqlite')) {
    mkdirSync(dirname(databasePath), { recursive: true })
    this.database = new DatabaseSync(databasePath)
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS runners (
        uuid TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        source_aa INTEGER NOT NULL DEFAULT 0,
        source_totorewa INTEGER NOT NULL DEFAULT 0,
        history_complete INTEGER NOT NULL DEFAULT 0,
        backfill_cursor TEXT,
        last_sync_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS runner_aliases (
        nickname_key TEXT PRIMARY KEY,
        uuid TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS name_resolutions (
        nickname_key TEXT PRIMARY KEY,
        uuid TEXT,
        checked_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS run_history (
        uuid TEXT NOT NULL,
        run_id TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        run_json TEXT NOT NULL,
        PRIMARY KEY (uuid, run_id)
      );
      CREATE INDEX IF NOT EXISTS run_history_last_updated ON run_history(last_updated);
      CREATE TABLE IF NOT EXISTS ranking_snapshots (
        days INTEGER PRIMARY KEY,
        updated_at INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
    `)
  }

  close() {
    this.database.close()
  }

  addRunner({ uuid, nickname, source }) {
    const normalizedUuid = String(uuid).trim().toLowerCase()
    const normalizedNickname = String(nickname).trim()
    if (!normalizedUuid || !normalizedNickname) throw new Error('Invalid runner identity')

    this.database.prepare(`
      INSERT INTO runners (uuid, nickname, source_aa, source_totorewa)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        nickname = excluded.nickname,
        source_aa = MAX(runners.source_aa, excluded.source_aa),
        source_totorewa = MAX(runners.source_totorewa, excluded.source_totorewa)
    `).run(
      normalizedUuid,
      normalizedNickname,
      source === 'aa' ? 1 : 0,
      source === 'totorewa' ? 1 : 0
    )
    this.addAlias(normalizedNickname, normalizedUuid)
  }

  addAlias(nickname, uuid) {
    const nicknameKey = String(nickname).trim().toLowerCase()
    if (!nicknameKey) return
    this.database.prepare(`
      INSERT INTO runner_aliases (nickname_key, uuid)
      VALUES (?, ?)
      ON CONFLICT(nickname_key) DO UPDATE SET uuid = excluded.uuid
    `).run(nicknameKey, String(uuid).trim().toLowerCase())
  }

  getUuidByNickname(nickname) {
    const nicknameKey = String(nickname).trim().toLowerCase()
    return this.database.prepare(
      'SELECT uuid FROM runner_aliases WHERE nickname_key = ?'
    ).get(nicknameKey)?.uuid
  }

  getNameResolution(nickname) {
    const nicknameKey = String(nickname).trim().toLowerCase()
    return this.database.prepare(`
      SELECT uuid, checked_at
      FROM name_resolutions
      WHERE nickname_key = ?
    `).get(nicknameKey)
  }

  saveNameResolution(nickname, uuid, checkedAt) {
    const nicknameKey = String(nickname).trim().toLowerCase()
    this.database.prepare(`
      INSERT INTO name_resolutions (nickname_key, uuid, checked_at)
      VALUES (?, ?, ?)
      ON CONFLICT(nickname_key) DO UPDATE SET
        uuid = excluded.uuid,
        checked_at = excluded.checked_at
    `).run(nicknameKey, uuid ? String(uuid).trim().toLowerCase() : null, checkedAt)
  }

  getRunners() {
    return this.database.prepare(`
      SELECT uuid, nickname, source_aa, source_totorewa,
        history_complete, backfill_cursor, last_sync_at
      FROM runners
      ORDER BY uuid
    `).all()
  }

  getRunner(uuid) {
    return this.database.prepare(`
      SELECT uuid, nickname, source_aa, source_totorewa,
        history_complete, backfill_cursor, last_sync_at
      FROM runners
      WHERE uuid = ?
    `).get(String(uuid).trim().toLowerCase())
  }

  updateBackfill(uuid, cursor, complete) {
    this.database.prepare(`
      UPDATE runners
      SET backfill_cursor = ?, history_complete = ?
      WHERE uuid = ?
    `).run(cursor === null ? null : String(cursor), complete ? 1 : 0, String(uuid).trim().toLowerCase())
  }

  markRunnerSynced(uuid, timestamp) {
    this.database.prepare(`
      UPDATE runners SET last_sync_at = ? WHERE uuid = ?
    `).run(timestamp, String(uuid).trim().toLowerCase())
  }

  hasRun(uuid, runId) {
    return Boolean(this.database.prepare(`
      SELECT 1 AS found FROM run_history WHERE uuid = ? AND run_id = ?
    `).get(String(uuid).trim().toLowerCase(), String(runId)))
  }

  insertRuns(uuid, nickname, rows) {
    const statement = this.database.prepare(`
      INSERT INTO run_history (uuid, run_id, last_updated, run_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(uuid, run_id) DO UPDATE SET
        last_updated = excluded.last_updated,
        run_json = excluded.run_json
    `)
    this.database.exec('BEGIN')
    try {
      let inserted = 0
      for (const row of rows) {
        const runId = row?.id
        if (!Number.isInteger(runId) || !Number.isFinite(row.lastUpdated)) {
          throw new Error('Invalid AA run history row')
        }
        const run = { ...row, uuid, nickname }
        const result = statement.run(uuid, String(runId), row.lastUpdated, JSON.stringify(run))
        inserted += Number(result.changes)
      }
      this.database.exec('COMMIT')
      return inserted
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  *iterateRuns() {
    const names = new Map(this.getRunners().map(runner => [runner.uuid, runner.nickname]))
    const statement = this.database.prepare(`
      SELECT uuid, run_json, last_updated
      FROM run_history
      ORDER BY uuid, last_updated
    `)
    for (const row of statement.iterate()) {
      const run = JSON.parse(row.run_json)
      yield {
        ...run,
        uuid: row.uuid,
        nickname: names.get(row.uuid) || run.nickname,
        lastUpdated: row.last_updated
      }
    }
  }

  saveSnapshot(snapshot) {
    this.database.prepare(`
      INSERT INTO ranking_snapshots (days, updated_at, payload)
      VALUES (?, ?, ?)
      ON CONFLICT(days) DO UPDATE SET
        updated_at = excluded.updated_at,
        payload = excluded.payload
    `).run(snapshot.days, Date.parse(snapshot.updatedAt), JSON.stringify(snapshot))
  }

  getSnapshot(days) {
    const row = this.database.prepare(`
      SELECT payload FROM ranking_snapshots WHERE days = ?
    `).get(days)
    return row ? JSON.parse(row.payload) : null
  }
}
