import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMinecraftProfileNameByUuid } from '../backend/minecraftProfile.js'

test('Minecraft profile lookup normalizes UUIDs and shares cached requests', async t => {
  const uuid = '11111111-2222-4333-8444-555555555555'
  let fetchCount = 0
  t.mock.method(globalThis, 'fetch', async input => {
    fetchCount++
    assert.equal(
      input,
      'https://sessionserver.mojang.com/session/minecraft/profile/11111111222243338444555555555555'
    )
    return new Response(JSON.stringify({ name: 'CurrentRunner' }))
  })

  const names = await Promise.all([
    getMinecraftProfileNameByUuid(uuid),
    getMinecraftProfileNameByUuid(uuid.replace(/-/g, '').toUpperCase())
  ])
  const cachedName = await getMinecraftProfileNameByUuid(uuid)

  assert.deepEqual(names, ['CurrentRunner', 'CurrentRunner'])
  assert.equal(cachedName, 'CurrentRunner')
  assert.equal(fetchCount, 1)
})

test('Minecraft profile lookup rejects invalid UUIDs and unavailable profiles', async t => {
  await assert.rejects(getMinecraftProfileNameByUuid('not-a-uuid'), /Invalid Minecraft profile UUID/)

  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }))
  await assert.rejects(
    getMinecraftProfileNameByUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    /Minecraft profile API error \(404\)/
  )
})

test('Minecraft profile lookup retries rate-limited requests', async t => {
  let fetchCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCount++
    if (fetchCount === 1) {
      return new Response(null, {
        status: 429,
        headers: { 'Retry-After': '0' }
      })
    }
    return new Response(JSON.stringify({ name: 'RecoveredRunner' }))
  })

  const name = await getMinecraftProfileNameByUuid('bbbbbbbb-cccc-4ddd-8eee-ffffffffffff')

  assert.equal(name, 'RecoveredRunner')
  assert.equal(fetchCount, 2)
})
