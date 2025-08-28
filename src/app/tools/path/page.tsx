"use client"

import { useMemo, useState } from "react"
import { JSONPath } from "jsonpath-plus"
import { JsonEditor } from "@/components/json-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Copy, Search } from "lucide-react"
import { toast } from "sonner"

export default function JsonPathExplorerPage() {
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(
      {
        store: {
          book: [
            { category: "reference", price: 8.95, title: "Sayings" },
            { category: "fiction", price: 12.99, title: "Sword" },
          ],
        },
      },
      null,
      2,
    ),
  )
  const [query, setQuery] = useState<string>("$.store.book[*].price")
  const [results, setResults] = useState<unknown[]>([])

  const runQuery = () => {
    try {
      const obj = JSON.parse(jsonText)
      const output = JSONPath({ path: query, json: obj }) as unknown[]
      setResults(output)
    } catch (e) {
      toast.error("Invalid JSON or JSONPath query")
    }
  }

  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2))
      toast.success("Results copied")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">JSONPath / Query Explorer</h1>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter JSONPath, e.g. $.store.book[*].title"
            className="w-[340px]"
          />
          <Button variant="outline" onClick={runQuery}>
            <Search className="h-4 w-4 mr-1" /> Run
          </Button>
          <Button variant="outline" onClick={copyResults}>
            <Copy className="h-4 w-4 mr-1" /> Copy Results
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JsonEditor value={jsonText} onChange={setJsonText} title="JSON Data" height="460px" />
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap break-all">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


