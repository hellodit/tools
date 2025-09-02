"use client"

import { useMemo, useState } from "react"
import Ajv, { ErrorObject } from "ajv"
import addFormats from "ajv-formats"
import yaml from "js-yaml"
import { JsonEditor } from "@/components/json-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, RefreshCcw, ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"

export default function ValidatorPage() {
  const [jsonText, setJsonText] = useState<string>("{\n  \"name\": \"Alice\",\n  \"age\": 30\n}")
  const [schemaText, setSchemaText] = useState<string>(
    JSON.stringify(
      {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number", minimum: 0 },
        },
        required: ["name", "age"],
        additionalProperties: false,
      },
      null,
      2,
    ),
  )
  const [errors, setErrors] = useState<ErrorObject[] | null>(null)

  const ajv = useMemo(() => {
    const instance = new Ajv({ allErrors: true, strict: false })
    try {
      // Optional formats support if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addFormats(instance as any)
    } catch {}
    return instance
  }, [])

  const runValidation = (dataObj?: unknown, schemaObj?: unknown) => {
    try {
      const data = dataObj ?? JSON.parse(jsonText)
      const schema = schemaObj ?? JSON.parse(schemaText)
      const validate = ajv.compile(schema)
      const valid = validate(data)
      if (!valid) {
        setErrors(validate.errors ?? null)
        return { isValid: false, error: "Schema validation failed" }
      }
      setErrors(null)
      return { isValid: true as const }
    } catch {
      setErrors(null)
      return { isValid: false as const, error: "Invalid JSON syntax in data or schema" }
    }
  }

  const convertJsonToYaml = () => {
    try {
      const obj = JSON.parse(jsonText)
      const yml = yaml.dump(obj)
      navigator.clipboard.writeText(yml)
      toast.success("YAML copied to clipboard")
    } catch {
      toast.error("JSON is not valid")
    }
  }

  const convertYamlToJson = () => {
    try {
      const yml = prompt("Paste YAML to convert to JSON")
      if (!yml) return
      const obj = yaml.load(yml)
      setJsonText(JSON.stringify(obj, null, 2))
      toast.success("Converted YAML to JSON")
    } catch {
      toast.error("Invalid YAML input")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">JSON Validator (Schema & Syntax)</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => runValidation()}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Validate
          </Button>
          <Button variant="outline" size="sm" onClick={convertJsonToYaml}>
            <ArrowLeftRight className="h-4 w-4 mr-1" /> JSON → YAML
          </Button>
          <Button variant="outline" size="sm" onClick={convertYamlToJson}>
            <ArrowLeftRight className="h-4 w-4 mr-1" /> YAML → JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JsonEditor
          value={jsonText}
          onChange={setJsonText}
          title="JSON Data"
          height="460px"
          showValidation
          onValidate={(obj) => runValidation(obj)}
        />
        <JsonEditor
          value={schemaText}
          onChange={(v) => {
            setSchemaText(v)
            // re-validate when schema changes
            runValidation()
          }}
          title="JSON Schema"
          height="460px"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {errors ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Validation Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors ? (
            <div className="space-y-2 text-sm">
              {errors.map((e, idx) => (
                <div key={idx} className="rounded border border-red-500/30 p-2">
                  <div className="font-medium">{e.instancePath || "/"} {e.message}</div>
                  {e.params && (
                    <pre className="mt-1 text-xs opacity-80">{JSON.stringify(e.params, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-green-600 dark:text-green-400 text-sm">Data is valid against the schema.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


