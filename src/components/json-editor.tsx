"use client"

import { useState, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Copy, 
  Download, 
  Upload, 
  FileText,
  AlertCircle,
  CheckCircle 
} from "lucide-react"
import { toast } from "sonner"

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  title?: string
  height?: string
  readOnly?: boolean
  showValidation?: boolean
  onValidate?: (json: unknown) => { isValid: boolean; error?: string }
}

export function JsonEditor({
  value,
  onChange,
  title = "JSON Editor",
  height = "400px",
  readOnly = false,
  showValidation = false,
  onValidate
}: JsonEditorProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleEditorChange = (newValue: string | undefined) => {
    const jsonValue = newValue || ""
    onChange(jsonValue)
    
    if (showValidation && onValidate) {
      try {
        const parsed = JSON.parse(jsonValue)
        const validation = onValidate(parsed)
        setIsValid(validation.isValid)
        setError(validation.error || "")
      } catch {
        setIsValid(false)
        setError("Invalid JSON syntax")
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleDownload = () => {
    const blob = new Blob([value], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "data.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("File downloaded")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onChange(content)
        toast.success("File imported successfully")
      }
      reader.readAsText(file)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
            {showValidation && isValid !== null && (
              <div className="flex items-center gap-1">
                {isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {showValidation && !isValid && error && (
          <div className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Editor
          height={height}
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
          }}
          theme="vs-dark"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}