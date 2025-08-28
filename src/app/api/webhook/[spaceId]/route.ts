import { NextRequest } from "next/server"
import { isRateLimited } from "@/lib/webhook/store"
import { captureAndStore } from "@/lib/webhook/capture"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (isRateLimited(`${spaceId}:${ip}`)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  }
  return captureAndStore(req, spaceId)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  return handle(req, ctx)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  return handle(req, ctx)
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  return handle(req, ctx)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  return handle(req, ctx)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  return handle(req, ctx)
}


