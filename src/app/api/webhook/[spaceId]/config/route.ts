import { NextRequest, NextResponse } from "next/server"
import { webhookStore, type WebhookResponseConfig } from "@/lib/webhook/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  const cfg = webhookStore.getResponseConfig(spaceId) ?? {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true }),
    contentType: "application/json",
    delayMs: 0,
  }
  return NextResponse.json(cfg)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  try {
    const incoming = (await req.json()) as Partial<WebhookResponseConfig>
    const next: WebhookResponseConfig = {
      status: Math.max(100, Math.min(599, Number(incoming.status ?? 200))),
      headers: incoming.headers ?? { "content-type": incoming.contentType ?? "application/json" },
      body: typeof incoming.body === "string" ? incoming.body : JSON.stringify(incoming.body ?? { ok: true }),
      contentType: incoming.contentType ?? incoming.headers?.["content-type"] ?? "application/json",
      delayMs: Math.max(0, Number(incoming.delayMs ?? 0)),
    }
    webhookStore.setResponseConfig(spaceId, next)
    return NextResponse.json(next)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
}


