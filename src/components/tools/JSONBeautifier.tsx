"use client";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Copy, Download, Trash2, Upload } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

function tryFormatJSON(input: string, space = 2): { ok: true; out: string } | { ok: false; err: string } {
  try {
    const parsed = JSON.parse(input);
    return { ok: true, out: JSON.stringify(parsed, null, space) };
  } catch (e) {
    const error = e as Error;
    return { ok: false, err: error?.message || String(e) };
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JSONBeautifier() {
  const [raw, setRaw] = useState("");
  const [formatted, setFormatted] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [indent, setIndent] = useState(2);

  const onBeautify = () => {
    const res = tryFormatJSON(raw, indent);
    if (res.ok) { setFormatted(res.out); setErr(null); }
    else { setErr(res.err); setFormatted(""); }
  };
  const onMinify = () => {
    const res = tryFormatJSON(raw, 0);
    if (res.ok) { setFormatted(res.out); setErr(null); }
    else { setErr(res.err); setFormatted(""); }
  };

  function openFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result || ""));
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-6 w-6"/> JSON Beautifier
          </h1>
          <p className="text-sm text-slate-600">Format, minify, copy, download, dan syntax highlight JSON.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-2"/>Open file</Button>
          <Button variant="secondary" onClick={() => { setRaw(""); setFormatted(""); setErr(null); }}><Trash2 className="h-4 w-4 mr-2"/>Clear</Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Indent</span>
              <Input type="number" min={0} max={8} className="w-20" value={indent} onChange={(e) => setIndent(Number(e.target.value))} />
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={onBeautify}>Beautify</Button>
              <Button size="sm" variant="outline" onClick={onMinify}>Minify</Button>
            </div>
          </div>
          <Textarea rows={8} placeholder="Paste JSON di sini" value={raw} onChange={(e) => setRaw(e.target.value)} />
          {err && <div className="text-sm text-red-600">{err}</div>}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex items-center justify-between">
          <CardTitle className="text-base">Output</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { if (formatted) downloadText("beautified.json", formatted); }}><Download className="h-4 w-4 mr-2"/>Download</Button>
            <Button size="sm" variant="outline" onClick={() => { if (formatted) navigator.clipboard.writeText(formatted); }}><Copy className="h-4 w-4 mr-2"/>Copy</Button>
          </div>
        </CardHeader>
        <CardContent>
          {formatted ? (
            <ScrollArea className="h-80 w-full rounded border bg-white">
              <SyntaxHighlighter language="json" customStyle={{ margin: 0, padding: "1rem", fontSize: "0.85rem", background: "transparent" }}>
                {formatted}
              </SyntaxHighlighter>
            </ScrollArea>
          ) : (
            <div className="text-sm text-slate-500">Belum ada output. Klik Beautify/Minify setelah paste JSON.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


