"use client";
import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCopy, Filter, FileUp, Search, Trash2, Bug, ChevronDown, ChevronRight } from "lucide-react";

type LogEntry = { raw: string; level?: string; request_id?: string; time?: string; message?: string; error?: string; stack?: string; derived?: DerivedInfo; };
type StackFrame = { func?: string; file?: string; line?: number; };
type DerivedInfo = { hint?: string; rootFunction?: string; rootFile?: string; rootLine?: number; frames: StackFrame[]; };
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function tryParseJSONLine(line: string): Partial<LogEntry> | null {
  try {
    const obj = JSON.parse(line);
    const out: Partial<LogEntry> = {
      level: obj.level ?? (obj as any).LEVEL ?? (obj as any).severity,
      request_id: obj.request_id ?? (obj as any).reqId ?? (obj as any).requestId,
      time: obj.time ?? (obj as any).timestamp ?? (obj as any).ts,
      message: obj.message ?? (obj as any).msg,
      error: (obj as any).error ?? (obj as any).err,
      stack: (obj as any).stack ?? (obj as any).trace ?? (obj as any).stacktrace,
    } as any;
    return out;
  } catch {
    return null;
  }
}

function parseGoStack(raw: string): StackFrame[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const frames: StackFrame[] = [];
  for (let i = 0; i < lines.length; i++) {
    const funcLine = lines[i];
    const fileLine = lines[i + 1] || "";
    const fileMatch = fileLine.match(/\t(.+?):(\d+) \+0x[0-9a-f]+/i);
    if (fileMatch) {
      frames.push({ func: funcLine.trim(), file: fileMatch[1], line: Number(fileMatch[2]) });
      i++;
    }
  }
  return frames;
}

function deriveHint(error?: string, frames: StackFrame[] = []): DerivedInfo {
  let hint = "";
  const errLower = (error || "").toLowerCase();
  if (errLower.includes("invalid memory address") || errLower.includes("nil pointer dereference")) {
    hint = "Nil pointer dereference: periksa nilai yang di-dereference (cek variabel, hasil return error, atau block == nil).";
  } else if (errLower.includes("pem") && errLower.includes("decode")) {
    hint = "PEM decode gagal: cek format kunci, pastikan newline benar atau gunakan base64 sebelum decode.";
  } else if (errLower.includes("parse") && errLower.includes("private key")) {
    hint = "Parsing private key gagal: coba PKCS#1 lalu PKCS#8; verifikasi jenis kunci RSA/ECDSA.";
  }
  const root = frames.find(f => f.func && !f.func.startsWith("runtime.") && !f.func.startsWith("net/http."));
  return { hint, rootFunction: root?.func, rootFile: root?.file, rootLine: root?.line, frames };
}

function formatLevel(lvl?: string): { label: string; tone: BadgeVariant } {
  const l = (lvl || "").toLowerCase();
  if (l.includes("error")) return { label: "error", tone: "destructive" };
  if (l.includes("warn")) return { label: "warn", tone: "secondary" };
  if (l.includes("info")) return { label: "info", tone: "secondary" };
  if (l.includes("debug")) return { label: "debug", tone: "secondary" };
  return { label: l || "log", tone: "secondary" };
}

function copy(text: string) { navigator.clipboard.writeText(text); }

function parseInput(text: string): LogEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: LogEntry[] = [];
  let buffer: string[] = [];

  const flushBufferIfAny = () => {
    if (buffer.length === 0) return;
    const chunk = buffer.join("\n");
    const asJson = tryParseJSONLine(chunk);
    if (asJson && ((asJson as any).error || (asJson as any).stack || (asJson as any).message)) {
      const frames = parseGoStack((asJson as any).stack || "");
      const derived = deriveHint((asJson as any).error || (asJson as any).message, frames);
      entries.push({ raw: chunk, ...(asJson as any), derived } as LogEntry);
    } else {
      const level = (/\"level\"\s*:\s*\"([^\"]+)\"/.exec(chunk)?.[1]) || (/\blevel=(\w+)/.exec(chunk)?.[1]);
      const request_id = (/\"request_id\"\s*:\s*\"([^\"]+)\"/.exec(chunk)?.[1]) || (/request_id=([\w-]+)/.exec(chunk)?.[1]);
      const time = (/\"time\"\s*:\s*\"([^\"]+)\"/.exec(chunk)?.[1]) || undefined;
      const message = (/\"message\"\s*:\s*\"([^\"]+)\"/.exec(chunk)?.[1]) || undefined;
      const error = (/\"error\"\s*:\s*\"([^\"]+)\"/.exec(chunk)?.[1]) || undefined;
      const stackStart = chunk.indexOf("goroutine ");
      const stack = stackStart >= 0 ? chunk.slice(stackStart) : undefined;
      const frames = parseGoStack(stack || "");
      const derived = deriveHint(error || message, frames);
      entries.push({ raw: chunk, level, request_id, time, message, error, stack, derived });
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const looksLikeJSONStart = trimmed.startsWith("{") && trimmed.endsWith("}");
    const recordBoundary = looksLikeJSONStart || /^\d{4}-\d{2}-\d{2}[T ]/.test(trimmed);
    if (recordBoundary && buffer.length > 0) { flushBufferIfAny(); }
    buffer.push(line);
  }
  flushBufferIfAny();

  if (entries.length === 0) {
    for (const line of lines) {
      const j = tryParseJSONLine(line);
      if (j) {
        const frames = parseGoStack((j as any).stack || "");
        const derived = deriveHint((j as any).error || (j as any).message, frames);
        entries.push({ raw: line, ...(j as any), derived } as LogEntry);
      }
    }
  }
  return entries;
}

function groupByRequest(entries: LogEntry[]) {
  const map = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const key = e.request_id || "(no req id)";
    if (!map.has(key)) map.set(key, []);
    (map.get(key) as LogEntry[]).push(e);
  }
  return map;
}

export default function GoLogDebugger() {
  const [raw, setRaw] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [group, setGroup] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => (raw ? parseInput(raw) : []), [raw]);
  const filtered = useMemo(() => {
    return parsed.filter(e => {
      const matchesLevel = levelFilter ? (e.level || "").toLowerCase().includes(levelFilter) : true;
      const needle = searchTerm.toLowerCase();
      const matchesSearch = !needle
        || e.raw.toLowerCase().includes(needle)
        || (e.message || "").toLowerCase().includes(needle)
        || (e.error || "").toLowerCase().includes(needle)
        || (e.request_id || "").toLowerCase().includes(needle);
      return matchesLevel && matchesSearch;
    });
  }, [parsed, searchTerm, levelFilter]);

  const grouped = useMemo(() => groupByRequest(filtered), [filtered]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result || ""));
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-6 w-6" /> Go Log Debugger
          </h1>
          <p className="text-sm text-slate-600">Paste log, parse stack trace, filter, group by request_id, dan hint otomatis.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setRaw("")}> <Trash2 className="h-4 w-4 mr-2"/> Clear </Button>
          <Button onClick={() => navigator.clipboard.readText().then(t => setRaw(t))}><ClipboardCopy className="h-4 w-4 mr-2"/> Paste</Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text/base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search text / request_id / error keyword" className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant={levelFilter === "error" ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(levelFilter === "error" ? null : "error")}>Error</Button>
              <Button variant={levelFilter === "warn" ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(levelFilter === "warn" ? null : "warn")}>Warn</Button>
              <Button variant={levelFilter === "info" ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(levelFilter === "info" ? null : "info")}>Info</Button>
              <Button variant={levelFilter === "debug" ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(levelFilter === "debug" ? null : "debug")}>Debug</Button>
              <Button variant="ghost" size="sm" onClick={() => setLevelFilter(null)}><Filter className="h-4 w-4 mr-1"/>Reset</Button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setGroup(!group)}>
                {group ? "Grouped by request_id" : "Ungrouped"}
              </Badge>
              <input ref={fileInputRef} type="file" accept=".log,.txt,.jsonl,.json" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}><FileUp className="h-4 w-4 mr-2"/>Open file</Button>
            </div>
          </div>
          <Textarea rows={8} placeholder={`Tempel log di sini. Contoh JSON {"level":"error",...} dgn field stack, atau stacktrace Go mulai 'goroutine ...'`} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base">Ringkasan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-xl border bg-white"><div className="text-slate-500">Total entries</div><div className="text-2xl font-semibold">{filtered.length}</div></div>
                <div className="p-3 rounded-xl border bg-white"><div className="text-slate-500">Unique request_id</div><div className="text-2xl font-semibold">{new Set(filtered.map(e => e.request_id || "(no req id)")).size}</div></div>
                <div className="p-3 rounded-xl border bg-white"><div className="text-slate-500">Error entries</div><div className="text-2xl font-semibold">{filtered.filter(e => (e.level||"").toLowerCase().includes("error")).length}</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="entries" className="mt-4">
          <div className="space-y-3">
            {group ? (
              Array.from(grouped.entries()).map(([reqId, items]) => (
                <Card key={reqId} className="shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><span className="font-mono px-2 py-1 bg-slate-100 rounded">{reqId}</span><Badge variant="secondary">{items.length} entries</Badge></CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">{items.map((e, idx) => (<EntryCard entry={e} key={reqId + idx} />))}</div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="space-y-3">{filtered.map((e, idx) => (<EntryCard entry={e} key={idx} />))}</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntryCard({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(true);
  const lvl = formatLevel(entry.level);
  const meta = [entry.time, entry.level, entry.request_id].filter(Boolean).join(" · ");
  const root = entry.derived;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={lvl.tone}>{lvl.label}</Badge>
              {root?.hint && <Badge variant="outline">hint</Badge>}
            </div>
            <CardTitle className="text-base mt-1 break-words">{entry.error || entry.message || "(no message)"}</CardTitle>
            <div className="text-xs text-slate-500 mt-1">{meta || "(no metadata)"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => copy(entry.raw)}><ClipboardCopy className="h-4 w-4"/></Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</Button>
          </div>
        </div>
      </CardHeader>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <CardContent className="pt-0">
              {root?.hint && (
                <div className="mb-3 p-3 rounded-xl border bg-amber-50 text-amber-900 text-sm">
                  <div className="font-semibold">Hint</div>
                  <div>{root.hint}</div>
                  {root.rootFile && (
                    <div className="mt-1 text-xs text-amber-800">Suspect: <span className="font-mono">{root.rootFunction}</span> · <span className="font-mono">{root.rootFile}:{root.rootLine}</span></div>
                  )}
                </div>
              )}
              <Tabs defaultValue="stack">
                <TabsList>
                  <TabsTrigger value="stack">Stack</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>
                <TabsContent value="stack" className="mt-3"><StackTable frames={root?.frames || []} /></TabsContent>
                <TabsContent value="raw" className="mt-3">
                  <ScrollArea className="h-48 w-full rounded border bg-white p-3">
                    <pre className="text-xs whitespace-pre-wrap leading-5">{entry.stack || entry.raw}</pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function StackTable({ frames }: { frames: StackFrame[] }) {
  if (!frames.length) return <div className="text-sm text-slate-500">No stack frames parsed.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-600">
          <tr><th className="py-2 pr-4">#</th><th className="py-2 pr-4">Function</th><th className="py-2 pr-4">File</th><th className="py-2 pr-4">Line</th></tr>
        </thead>
        <tbody>
          {frames.map((f, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 pr-4 text-slate-500">{i}</td>
              <td className="py-2 pr-4 font-mono text-xs break-all">{f.func}</td>
              <td className="py-2 pr-4 font-mono text-xs break-all">{f.file}</td>
              <td className="py-2 pr-4 font-mono text-xs">{f.line}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


