import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileJson, Trash2, Download, Search, ArrowUpDown, Filter, X, Layers } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, unknown>;

interface LoadedFile {
  name: string;
  rows: Row[];
  fields: string[];
  error?: string;
}

interface ActiveFilter {
  field: string;
  value: string;
}

/** Flacht verschachtelte Objekte in Punkt-Notation ab. */
function flatten(obj: unknown, prefix = "", out: Row = {}): Row {
  if (obj === null || obj === undefined) {
    out[prefix || "value"] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    out[prefix || "value"] = JSON.stringify(obj);
    return out;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      out[prefix || "value"] = {};
      return out;
    }
    for (const [k, v] of entries) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        flatten(v, key, out);
      } else if (Array.isArray(v)) {
        out[key] = JSON.stringify(v);
      } else {
        out[key] = v;
      }
    }
    return out;
  }
  out[prefix || "value"] = obj;
  return out;
}

function extractRows(data: unknown): Row[] {
  // Array von Objekten
  if (Array.isArray(data)) {
    return data.map((item) => flatten(item));
  }
  // Einzelnes Objekt: suche nach der größten enthaltenen Array-Eigenschaft
  if (data && typeof data === "object") {
    const candidates: Row[][] = [];
    const walk = (o: unknown) => {
      if (Array.isArray(o) && o.length > 0 && o.every((e) => e && typeof e === "object")) {
        candidates.push(o.map((e) => flatten(e)));
      } else if (o && typeof o === "object" && !Array.isArray(o)) {
        Object.values(o).forEach(walk);
      }
    };
    walk(data);
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.length - a.length);
      return candidates[0];
    }
    return [flatten(data)];
  }
  return [{ value: data }];
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function looksLikeDate(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\.\d{2}\.\d{4}/.test(v);
}

export default function AdminJsonAnalyse() {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [merged, setMerged] = useState(true);
  const [dedupeField, setDedupeField] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCount, setVisibleCount] = useState(200);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".json"));
    if (arr.length === 0) {
      toast.error("Bitte nur .json-Dateien hochladen.");
      return;
    }
    const loaded: LoadedFile[] = [];
    for (const file of arr) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const rows = extractRows(data);
        const fields = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
        loaded.push({ name: file.name, rows, fields });
      } catch (e) {
        loaded.push({ name: file.name, rows: [], fields: [], error: e instanceof Error ? e.message : "Ungültiges JSON" });
      }
    }
    setFiles((prev) => [...prev, ...loaded]);
    const ok = loaded.filter((f) => !f.error).length;
    const bad = loaded.length - ok;
    if (ok > 0) toast.success(`${ok} Datei(en) eingelesen.`);
    if (bad > 0) toast.error(`${bad} Datei(en) konnten nicht gelesen werden.`);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const allRows = useMemo(() => {
    let rows: Row[];
    if (merged) {
      rows = files.flatMap((f) => f.rows.map((r) => ({ _datei: f.name, ...r })));
    } else {
      rows = files.flatMap((f) => f.rows.map((r) => ({ _datei: f.name, ...r })));
    }
    if (dedupeField) {
      const seen = new Set<string>();
      rows = rows.filter((r) => {
        const key = displayValue(r[dedupeField]);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return rows;
  }, [files, merged, dedupeField]);

  const allFields = useMemo(() => Array.from(new Set(allRows.flatMap((r) => Object.keys(r)))), [allRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => Object.values(r).some((v) => displayValue(v).toLowerCase().includes(q)));
    }
    for (const f of filters) {
      if (!f.field || !f.value) continue;
      const fv = f.value.toLowerCase();
      rows = rows.filter((r) => displayValue(r[f.field]).toLowerCase().includes(fv));
    }
    if (sortField) {
      rows = [...rows].sort((a, b) => {
        const av = displayValue(a[sortField]);
        const bv = displayValue(b[sortField]);
        const cmp = av.localeCompare(bv, "de", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [allRows, search, filters, sortField, sortDir]);

  const stats = useMemo(() => {
    const totalRows = allRows.length;
    const fieldCount = allFields.length;
    // Zeitbereich über datumsähnliche Felder
    let minDate = "";
    let maxDate = "";
    for (const r of allRows) {
      for (const [k, v] of Object.entries(r)) {
        if (looksLikeDate(v)) {
          const s = String(v);
          if (!minDate || s < minDate) minDate = s;
          if (!maxDate || s > maxDate) maxDate = s;
        }
        void k;
      }
    }
    return { totalRows, fieldCount, minDate, maxDate };
  }, [allRows, allFields]);

  const topValues = useMemo(() => {
    // Werteverteilung für Felder mit wenigen unterschiedlichen Werten
    const result: { field: string; values: { value: string; count: number }[] }[] = [];
    for (const field of allFields) {
      if (field === "_datei") continue;
      const counts = new Map<string, number>();
      for (const r of allRows) {
        const v = displayValue(r[field]);
        if (v.length > 60) continue;
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      if (counts.size >= 2 && counts.size <= 12) {
        const values = Array.from(counts.entries())
          .map(([value, count]) => ({ value: value || "(leer)", count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        result.push({ field, values });
      }
      if (result.length >= 6) break;
    }
    return result;
  }, [allRows, allFields]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const exportCsv = () => {
    if (filteredRows.length === 0) return;
    const escape = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const header = allFields.map(escape).join(";");
    const lines = filteredRows.map((r) => allFields.map((f) => escape(displayValue(r[f]))).join(";"));
    const blob = new Blob(["﻿" + header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "json-auswertung.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredRows.length} Zeilen als CSV exportiert.`);
  };

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">JSON-Analyse</h1>
        <p className="text-muted-foreground">
          JSON-Dateien einlesen und auswerten. Alles passiert nur im Browser – es wird nichts gespeichert oder versendet.
        </p>
      </div>

      {/* Upload-Bereich */}
      <Card
        className={`border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">JSON-Dateien hierher ziehen oder auswählen</p>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Dateien auswählen
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {/* Geladene Dateien */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Geladene Dateien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{f.name}</span>
                  {f.error ? (
                    <Badge variant="destructive">Fehler: {f.error}</Badge>
                  ) : (
                    <>
                      <Badge variant="secondary">{f.rows.length} Einträge</Badge>
                      <Badge variant="outline">{f.fields.length} Felder</Badge>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(f.name)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={merged} onChange={(e) => setMerged(e.target.checked)} className="h-4 w-4" />
                <Layers className="h-4 w-4" /> Dateien zusammenführen
              </label>
              <div className="flex items-center gap-2 text-sm">
                <span>Duplikate entfernen über:</span>
                <Select value={dedupeField || "__none__"} onValueChange={(v) => setDedupeField(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Kein Feld" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Kein Feld</SelectItem>
                    {allFields
                      .filter((f) => f !== "_datei")
                      .map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFiles([])}>
                Alle entfernen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kennzahlen */}
      {allRows.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Einträge gesamt</CardDescription>
              <CardTitle className="text-3xl">{stats.totalRows}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Felder</CardDescription>
              <CardTitle className="text-3xl">{stats.fieldCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gefiltert</CardDescription>
              <CardTitle className="text-3xl">{filteredRows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Zeitbereich</CardDescription>
              <CardTitle className="text-sm">
                {stats.minDate ? `${stats.minDate.slice(0, 10)} – ${stats.maxDate.slice(0, 10)}` : "keine Datumsfelder"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Werteverteilungen */}
      {topValues.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topValues.map((tv) => (
            <Card key={tv.field}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{tv.field}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {tv.values.map((v) => (
                  <div key={v.value} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{v.value}</span>
                    <Badge variant="secondary">{v.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suche, Filter, Export */}
      {allRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="In allen Feldern suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={exportCsv} disabled={filteredRows.length === 0}>
                <Download className="mr-2 h-4 w-4" /> CSV exportieren
              </Button>
            </div>
            {/* Filter */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-1 rounded-lg border p-1">
                  <Select value={f.field} onValueChange={(v) => setFilters((prev) => prev.map((x, j) => (j === i ? { ...x, field: v } : x)))}>
                    <SelectTrigger className="h-8 w-40 border-0">
                      <SelectValue placeholder="Feld" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="enthält…"
                    value={f.value}
                    onChange={(e) => setFilters((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    className="h-8 w-40 border-0"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFilters((prev) => [...prev, { field: allFields[0] ?? "", value: "" }])}>
                + Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {allFields.map((field) => (
                      <TableHead key={field} className="cursor-pointer whitespace-nowrap" onClick={() => toggleSort(field)}>
                        <span className="flex items-center gap-1">
                          {field}
                          <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground/40"}`} />
                          {sortField === field && <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.slice(0, visibleCount).map((row, i) => (
                    <TableRow key={i}>
                      {allFields.map((field) => (
                        <TableCell key={field} className="max-w-64 truncate whitespace-nowrap" title={displayValue(row[field])}>
                          {displayValue(row[field])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredRows.length > visibleCount && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setVisibleCount((c) => c + 500)}>
                  Mehr anzeigen ({filteredRows.length - visibleCount} weitere)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
