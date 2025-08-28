"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

type HttpMethod = "ALL" | "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

interface WebhookRequestRecord {
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

const defaultSpaceId = "default"

export default function WebhookDebuggerPage() {
  const [spaceId, setSpaceId] = useState<string>(defaultSpaceId)
  const [items, setItems] = useState<WebhookRequestRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [method, setMethod] = useState<HttpMethod>("ALL")
  const [copyUrl, setCopyUrl] = useState("")
  const eventRef = useRef<EventSource | null>(null)

  const inboxUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/api/webhook/${spaceId}/inbox`
  }, [spaceId])

  useEffect(() => {
    setCopyUrl(inboxUrl)
  }, [inboxUrl])

  const fetchList = async () => {
    const u = new URL(`/api/webhook/${spaceId}/requests`, window.location.origin)
    if (search) u.searchParams.set("search", search)
    if (method) u.searchParams.set("method", method)
    const res = await fetch(u.toString())
    const data = await res.json()
    setItems(data.items)
  }

  useEffect(() => {
    fetchList().catch(() => {})
    eventRef.current?.close()
    const es = new EventSource(`/api/webhook/${spaceId}/events`)
    eventRef.current = es
    es.onmessage = (e) => {
      if (!e.data) return
      try {
        const parsed = JSON.parse(e.data)
        if (parsed && parsed.id) {
          setItems((prev) => [parsed as WebhookRequestRecord, ...prev].slice(0, 100))
        }
      } catch {}
    }
    es.onerror = () => {
      // auto reconnect by browser
    }
    return () => {
      es.close()
    }
  }, [spaceId])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchList().catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [search, method, spaceId])

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? items[0], [items, selectedId])

  const bodyPretty = useMemo(() => {
    if (!selected?.bodyRaw) return ""
    // Try JSON prettify
    try {
      return JSON.stringify(JSON.parse(selected.bodyRaw), null, 2)
    } catch {
      return selected.bodyRaw
    }
  }, [selected])

  const copy = async () => {
    await navigator.clipboard.writeText(copyUrl)
    toast.success("URL copied")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Webhook Debugger</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Your unique endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Input value={copyUrl} onChange={(e) => setCopyUrl(e.target.value)} readOnly />
            <Button variant="outline" onClick={copy}>Copy</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Search body or URL" value={search} onChange={(e) => setSearch(e.target.value)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-between">{method}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["ALL","GET","POST","PUT","DELETE","PATCH","HEAD","OPTIONS"] as HttpMethod[]).map((m) => (
                    <DropdownMenuItem key={m} onClick={() => setMethod(m)}>{m}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Separator className="my-2" />
            <ScrollArea className="h-[520px] pr-2">
              <div className="space-y-1">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    className={`w-full text-left rounded border p-2 text-sm hover:bg-accent ${selected?.id === it.id ? "bg-accent" : ""}`}
                  >
                    <div className="flex justify-between">
                      <span className="font-mono text-xs px-1 py-0.5 rounded bg-secondary mr-2">{it.method}</span>
                      <span className="truncate flex-1">{it.url}</span>
                      <span className="opacity-60 ml-2">{new Date(it.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="text-xs opacity-70">No requests yet. Send any HTTP request to the endpoint above.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="mb-1"><span className="font-medium">Method:</span> {selected.method}</div>
                  <div className="mb-1"><span className="font-medium">URL:</span> {selected.url}</div>
                  <div className="mb-1"><span className="font-medium">Timestamp:</span> {new Date(selected.createdAt).toLocaleString()}</div>
                  <div className="mb-1"><span className="font-medium">IP:</span> {selected.ip ?? "-"}</div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium mb-1">Headers</div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(selected.headers, null, 2)}</pre>
                </div>
                <div>
                  <div className="font-medium mb-1">Body</div>
                  <div className="rounded overflow-hidden max-h-80">
                    <SyntaxHighlighter language="json" style={oneDark} customStyle={{ margin: 0, fontSize: 12 }}>
                      {bodyPretty}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm opacity-70">Select a request to see details.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


