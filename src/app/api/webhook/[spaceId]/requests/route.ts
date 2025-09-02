import { NextRequest, NextResponse } from "next/server"
import { webhookStore, HttpMethod } from "@/lib/webhook/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? "100")
  const search = searchParams.get("search") ?? undefined
  const method = searchParams.get("method") as HttpMethod | "ALL" | undefined
  const list = webhookStore.list(spaceId, { limit, search, method })
  return NextResponse.json({ items: list })
}


