const profileCacheTtlMs = 24 * 60 * 60 * 1000
const profileRequestIntervalMs = 1_000
const profileMaxRetries = 4
const profileCache = new Map()
const profileRequests = new Map()
let profileRequestQueue = Promise.resolve()
let lastProfileRequestAt = 0

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

function getRetryDelay(response, attempt) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000)

    const retryAt = Date.parse(retryAfter)
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now())
  }
  return Math.min(60_000, 2_000 * (2 ** attempt))
}

async function requestMinecraftProfileName(uuid) {
  let attempt = 0
  while (true) {
    const wait = profileRequestIntervalMs - (Date.now() - lastProfileRequestAt)
    if (wait > 0) await delay(wait)
    lastProfileRequestAt = Date.now()

    const response = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (response.status === 429 && attempt < profileMaxRetries) {
      await delay(getRetryDelay(response, attempt))
      attempt++
      continue
    }
    if (!response.ok) throw new Error(`Minecraft profile API error (${response.status})`)

    const profile = await response.json()
    if (typeof profile.name !== 'string' || !profile.name.trim()) {
      throw new Error('Invalid Minecraft profile API response')
    }
    return profile.name.trim()
  }
}

export async function getMinecraftProfileNameByUuid(uuid) {
  const normalizedUuid = typeof uuid === 'string'
    ? uuid.replace(/-/g, '').toLowerCase()
    : ''
  if (!/^[0-9a-f]{32}$/.test(normalizedUuid)) {
    throw new Error('Invalid Minecraft profile UUID')
  }

  const cachedProfile = profileCache.get(normalizedUuid)
  if (cachedProfile && cachedProfile.expiresAt > Date.now()) return cachedProfile.name

  const pendingRequest = profileRequests.get(normalizedUuid)
  if (pendingRequest) return pendingRequest

  const queuedRequest = profileRequestQueue.then(() => requestMinecraftProfileName(normalizedUuid))
  profileRequestQueue = queuedRequest.catch(() => {})
  const request = queuedRequest.then(name => {
    profileCache.set(normalizedUuid, {
      name,
      expiresAt: Date.now() + profileCacheTtlMs
    })
    return name
  })

  profileRequests.set(normalizedUuid, request)
  try {
    return await request
  } finally {
    if (profileRequests.get(normalizedUuid) === request) {
      profileRequests.delete(normalizedUuid)
    }
  }
}
