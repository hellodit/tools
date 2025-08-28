import { NextRequest, NextResponse } from "next/server"
import { headers as nextHeaders } from "next/headers"
import { webhookStore, isRateLimited } from "@/lib/webhook/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientIp(req: NextRequest): string | undefined {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0]?.trim()
  const nh = nextHeaders()
  const ip = nh.get("x-real-ip") || nh.get("x-forwarded-for")
  return ip?.split(",")[0]?.trim()
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  return handleCapture(req, { spaceId })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  return handleCapture(req, { spaceId })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  return handleCapture(req, { spaceId })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  return handleCapture(req, { spaceId })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  return handleCapture(req, { spaceId })
}

async function handleCapture(req: NextRequest, { spaceId }: { params?: never; spaceId: string }) {
  const ip = getClientIp(req) || "unknown"
  if (isRateLimited(`${spaceId}:${ip}`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

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


