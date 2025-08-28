import { NextRequest, NextResponse } from "next/server"
import { webhookStore } from "@/lib/webhook/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ spaceId: string; id: string }> }) {
  const { spaceId, id } = await ctx.params
  const rec = webhookStore.get(spaceId, id)
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(rec)
}


