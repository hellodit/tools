import { NextRequest } from "next/server"
import { webhookStore } from "@/lib/webhook/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await ctx.params
  const encoder = new TextEncoder()
  let keepAlive: ReturnType<typeof setInterval> | null = null
  let unsubscribe: () => void = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk)
          return true
        } catch {
          // Controller closed
          return false
        }
      }
      const send = (data: unknown) => {
        const line = `data: ${JSON.stringify(data)}\n\n`
        safeEnqueue(encoder.encode(line))
      }
      unsubscribe = webhookStore.subscribe(spaceId, (evt) => send(evt))
      send({ type: "ready" })
      keepAlive = setInterval(() => {
        const ok = safeEnqueue(encoder.encode(":\n\n"))
        if (!ok && keepAlive) {
          clearInterval(keepAlive)
          keepAlive = null
          unsubscribe()
        }
      }, 15000)
    },
    cancel() {
      if (keepAlive) {
        clearInterval(keepAlive)
        keepAlive = null
      }
      unsubscribe()
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  })
}


