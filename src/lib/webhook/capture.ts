import { NextRequest, NextResponse } from "next/server"
import { webhookStore } from "@/lib/webhook/store"

function getClientIp(req: NextRequest): string | undefined {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0]?.trim()
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")
  return ip?.split(",")[0]?.trim()
}

export async function captureAndStore(req: NextRequest, spaceId: string) {
  const ip = getClientIp(req) || "unknown"
  const url = new URL(req.url)
  const method = req.method as any
  const contentType = req.headers.get("content-type") || undefined
  const headersObj: Record<string, string> = {}
  req.headers.forEach((v, k) => (headersObj[k] = v))

  let bodyRaw: string | undefined
  try {
    bodyRaw = await req.text()
  } catch {}

  const entry = webhookStore.append(spaceId, {
    method,
    url: url.pathname + url.search,
    headers: headersObj,
    query: Object.fromEntries(url.searchParams.entries()),
    ip,
    bodyRaw,
    contentType,
    spaceId,
  } as any)

  return NextResponse.json({ id: entry.id }, { status: 201 })
}


