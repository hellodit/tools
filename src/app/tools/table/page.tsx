"use client"

import { useMemo, useState } from "react"
import { JsonEditor } from "@/components/json-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import Papa from "papaparse"
import { Download } from "lucide-react"
import { toast } from "sonner"

type GenericRow = Record<string, unknown>

export default function JsonTableViewerPage() {
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(
      [
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 28 },
      ],
      null,
      2,
    ),
  )

  const data: GenericRow[] = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }, [jsonText])

  const columns: ColumnDef<GenericRow>[] = useMemo(() => {
    const keys = new Set<string>()
    data.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)))
    return Array.from(keys).map((key) => ({
      header: key,
      accessorKey: key,
      cell: (info) => {
        const value = info.getValue() as unknown
        return typeof value === "string" || typeof value === "number"
          ? String(value)
          : JSON.stringify(value)
      },
    }))
  }, [data])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  const downloadCsv = () => {
    if (!data.length) {
      toast.error("No data to export")
      return
    }
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "data.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("CSV downloaded")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">JSON to Table / CSV Viewer</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-1" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JsonEditor value={jsonText} onChange={setJsonText} title="JSON Data" height="460px" />
        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th key={header.id} className="text-left p-2 border-b">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="even:bg-muted/40">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2 border-b align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


