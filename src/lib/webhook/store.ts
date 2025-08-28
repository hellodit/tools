import { randomUUID } from "crypto"

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "TRACE"
  | "CONNECT"

export interface WebhookRequestRecord {
  id: string
  spaceId: string
  createdAt: number
  method: HttpMethod
  url: string
  headers: Record<string, string>
  query: Record<string, string | string[]>
  ip?: string
  bodyRaw?: string
  contentType?: string
}

export interface WebhookSpace {
  id: string
  createdAt: number
  name?: string
}

export interface WebhookResponseConfig {
  status: number
  headers: Record<string, string>
  body: string
  contentType?: string
  delayMs?: number
}

type Subscriber = (event: WebhookRequestRecord) => void

class InMemoryWebhookStore {
  private spaces: Map<string, WebhookSpace> = new Map()
  private recordsBySpace: Map<string, WebhookRequestRecord[]> = new Map()
  private subscribersBySpace: Map<string, Set<Subscriber>> = new Map()
  private responseConfigBySpace: Map<string, WebhookResponseConfig> = new Map()

  createSpace(name?: string): WebhookSpace {
    const id = randomUUID()
    const space: WebhookSpace = { id, createdAt: Date.now(), name }
    this.spaces.set(id, space)
    this.recordsBySpace.set(id, [])
    this.subscribersBySpace.set(id, new Set())
    return space
  }

  ensureSpace(spaceId: string) {
    if (!this.spaces.has(spaceId)) {
      const space: WebhookSpace = { id: spaceId, createdAt: Date.now() }
      this.spaces.set(spaceId, space)
      this.recordsBySpace.set(spaceId, [])
      this.subscribersBySpace.set(spaceId, new Set())
    }
  }

  listSpaces(): WebhookSpace[] {
    return Array.from(this.spaces.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  append(spaceId: string, record: Omit<WebhookRequestRecord, "id" | "createdAt">): WebhookRequestRecord {
    this.ensureSpace(spaceId)
    const full: WebhookRequestRecord = {
      ...record,
      id: randomUUID(),
      createdAt: Date.now(),
      spaceId,
    }
    const arr = this.recordsBySpace.get(spaceId)!
    arr.unshift(full)
    // keep last 500 per space
    if (arr.length > 500) arr.length = 500
    const subs = this.subscribersBySpace.get(spaceId)!
    subs.forEach((cb) => {
      try {
        cb(full)
      } catch (e) {
        console.error(`[WebhookStore] Subscriber error:`, e)
      }
    })
    return full
  }

  list(spaceId: string, opts?: { limit?: number; search?: string; method?: HttpMethod | "ALL" }) {
    const arr = this.recordsBySpace.get(spaceId) ?? []
    const method = opts?.method && opts.method !== "ALL" ? opts.method : undefined
    const search = opts?.search?.toLowerCase().trim()
    let filtered = arr
    if (method) filtered = filtered.filter((r) => r.method === method)
    if (search) {
      filtered = filtered.filter((r) => {
        const hay = `${r.url}\n${r.bodyRaw ?? ""}`.toLowerCase()
        return hay.includes(search)
      })
    }
    const limit = opts?.limit ?? 100
    return filtered.slice(0, limit)
  }

  get(spaceId: string, id: string): WebhookRequestRecord | undefined {
    const arr = this.recordsBySpace.get(spaceId) ?? []
    return arr.find((r) => r.id === id)
  }

  subscribe(spaceId: string, cb: Subscriber): () => void {
    this.ensureSpace(spaceId)
    const set = this.subscribersBySpace.get(spaceId)!
    set.add(cb)
    return () => set.delete(cb)
  }

  setResponseConfig(spaceId: string, cfg: WebhookResponseConfig) {
    this.ensureSpace(spaceId)
    this.responseConfigBySpace.set(spaceId, cfg)
  }

  getResponseConfig(spaceId: string): WebhookResponseConfig | undefined {
    return this.responseConfigBySpace.get(spaceId)
  }
}

// Use a global variable to persist across module reloads in development
declare global {
  var __webhookStore: InMemoryWebhookStore | undefined
}

export const webhookStore = globalThis.__webhookStore || (globalThis.__webhookStore = new InMemoryWebhookStore())

// Very small IP based leaky bucket limiter for capture endpoint
const tokenBuckets = new Map<string, { tokens: number; lastRefill: number }>()
const RATE_LIMIT_PER_MINUTE = 60

export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const refillRatePerMs = RATE_LIMIT_PER_MINUTE / 60000
  const bucket = tokenBuckets.get(key) ?? { tokens: RATE_LIMIT_PER_MINUTE, lastRefill: now }
  const elapsed = now - bucket.lastRefill
  const refill = elapsed * refillRatePerMs
  bucket.tokens = Math.min(RATE_LIMIT_PER_MINUTE, bucket.tokens + refill)
  bucket.lastRefill = now
  if (bucket.tokens < 1) {
    tokenBuckets.set(key, bucket)
    return true
  }
  bucket.tokens -= 1
  tokenBuckets.set(key, bucket)
  return false
}


