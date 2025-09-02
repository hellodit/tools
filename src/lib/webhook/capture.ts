import { NextRequest, NextResponse } from "next/server"
import { webhookStore, HttpMethod } from "@/lib/webhook/store"

function getClientIp(req: NextRequest): string | undefined {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0]?.trim()
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")
  return ip?.split(",")[0]?.trim()
}

export async function captureAndStore(req: NextRequest, spaceId: string) {
  const ip = getClientIp(req) || "unknown"
  const url = new URL(req.url)
  const method = req.method as HttpMethod
  const contentType = req.headers.get("content-type") || undefined
  const headersObj: Record<string, string> = {}
  req.headers.forEach((v, k) => (headersObj[k] = v))

  let bodyRaw: string | undefined
  try {
    bodyRaw = await req.text()
  } catch {}

  const entry = webhookStore.append(spaceId, {
    spaceId,
    method,
    url: url.pathname + url.search,
    headers: headersObj,
    query: Object.fromEntries(url.searchParams.entries()),
    ip,
    bodyRaw,
    contentType,
  })

  // Build response based on optional per-space config
  const cfg = webhookStore.getResponseConfig(spaceId)
  if (!cfg) {
    return NextResponse.json({ id: entry.id }, { status: 201 })
  }

  // Simple token replacement: allow using {{id}}, {{spaceId}}, {{method}}, {{url}}
  const replacements: Record<string, string> = {
    id: entry.id,
    spaceId: spaceId,
    method: entry.method,
    url: entry.url,
  }
  let body = cfg.body ?? ""
  body = body.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in replacements ? replacements[k] : ""))

  const headers = new Headers(cfg.headers ?? {})
  if (cfg.contentType && !headers.has("content-type")) headers.set("content-type", cfg.contentType)

  const delay = Math.max(0, Number(cfg.delayMs ?? 0))
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay))
  }

  return new NextResponse(body, { status: cfg.status ?? 200, headers })
}


