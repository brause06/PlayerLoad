"use client";

import { useState, Suspense } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function ImportInterface() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [parsedHeaders, setParsedHeaders] = useState<string[] | null>(null);
  const [parsedRows, setParsedRows] = useState<any[] | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setParsedHeaders(results.meta.fields);
            setParsedRows(results.data);
          }
        },
        error: (error) => {
          alert("Failed to parse CSV: " + error.message);
        }
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "dd/mm/yyyy" }) as any[];
          
          if (json.length > 0) {
            setParsedHeaders(Object.keys(json[0]));
            setParsedRows(json);
          } else {
            alert("The Excel file seems to be empty.");
          }
        } catch (error) {
          alert("Failed to parse Excel file.");
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (droppedFile.type === "text/csv" || name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
        processFile(droppedFile);
      } else {
        alert("Please upload a valid CSV or Excel (.xlsx) file");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedHeaders(null);
    setParsedRows(null);
    setImportResult(null);
    setProgress(0);
    setStatusMessage("");
  };

  const handleImport = async () => {
    if (!parsedRows) return;
    setIsProcessing(true);
    setImportResult(null);
    setProgress(0);
    setStatusMessage("Iniciando importación...");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        
        // Handle newline-delimited JSON (ndjson)
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.progress !== undefined) {
              setProgress(data.progress);
            }
            if (data.message) {
              setStatusMessage(data.message);
            }
            if (data.success) {
              setImportResult({ success: true, message: data.message });
            }
            if (data.error) {
              setImportResult({ success: false, message: data.error });
              setIsProcessing(false);
              return;
            }
          } catch (e) {
            console.error("Error parsing progress chunk", e);
          }
        }
      }
    } catch (e) {
      setImportResult({ success: false, message: "Error de red al importar los datos." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">Import GPS Data</h1>
        <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Upload raw CSV or Excel exports from your GPS provider to calculate session loads.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-[#111111] border-neutral-800 shadow-sm overflow-hidden p-0">
            <CardHeader className="bg-[#1a1a1a] border-b border-neutral-800">
              <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">File Upload</CardTitle>
              <CardDescription className="text-slate-500 font-medium">Drag and drop your file or click to browse.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-500/10" 
                      : "border-neutral-800 hover:border-indigo-500/50 hover:bg-[#1a1a1a]"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className={`w-16 h-16 mb-4 rounded flex items-center justify-center ${dragActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#222] text-slate-500 border border-neutral-800'}`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-white mb-1">Select a file or drop here</h3>
                  <p className="text-xs font-medium text-slate-400 max-w-sm mb-6">
                    CSV and Excel (.xlsx, .xls) files exported directly from Catapult, STATSports, or WIMU systems are supported.
                  </p>
                  
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" className="pointer-events-none bg-[#1a1a1a] border-neutral-800 text-slate-300">
                      Browse Files
                    </Button>
                    <input 
                      id="csv-upload" 
                      type="file" 
                      accept=".csv,.xlsx,.xls"
                      className="hidden" 
                      onChange={handleChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg shadow-sm flex items-center justify-center border border-neutral-800">
                        <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{file.name}</h4>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB • Document</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10">
                      Remove
                    </Button>
                  </div>

                  {parsedHeaders && parsedRows && (
                    <div className="mt-4 border border-neutral-800 rounded-md overflow-hidden bg-[#111111]">
                      <div className="bg-[#1a1a1a] px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-neutral-800 flex justify-between">
                        <span>Data Preview (First 5 rows of {parsedRows.length})</span>
                        <span className="text-indigo-400">{parsedHeaders.length} Columns</span>
                      </div>
                      <div className="overflow-x-auto max-w-full">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                              {parsedHeaders.slice(0, 5).map((h, i) => (
                                <TableHead key={i} className="whitespace-nowrap px-3 py-2 h-auto text-slate-400 font-bold bg-[#131313] border-b-neutral-800">{h}</TableHead>
                              ))}
                              {parsedHeaders.length > 5 && <TableHead className="px-3 py-2 h-auto text-slate-500 bg-[#131313] border-b-neutral-800">...</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.slice(0, 5).map((row, i) => (
                              <TableRow key={i} className="border-neutral-800 hover:bg-[#1a1a1a]">
                                {parsedHeaders.slice(0, 5).map((h, j) => (
                                  <TableCell key={j} className="whitespace-nowrap px-3 py-1.5 truncate max-w-[120px] text-slate-300 font-medium">
                                    {row[h]?.toString() || "-"}
                                  </TableCell>
                                ))}
                                {parsedHeaders.length > 5 && <TableCell className="px-3 py-1.5 text-slate-600">...</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar UI */}
                  {isProcessing && (
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 animate-pulse">
                          {statusMessage}
                        </span>
                        <span className="text-[10px] font-black tabular-nums text-white">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto flex-1">
                      {importResult && (
                        <div className={`text-sm font-bold tracking-widest uppercase px-3 py-2 rounded border flex items-center gap-2 ${importResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          {importResult.message}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button variant="outline" onClick={handleClear} disabled={isProcessing} className="bg-[#1a1a1a] border-neutral-800 text-slate-300">Cancel</Button>
                      <Button 
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                        onClick={handleImport}
                        disabled={isProcessing || (importResult?.success ?? false)}
                      >
                        {isProcessing ? "Importing Data..." : (
                          <>Process Data <ChevronRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-neutral-800 shadow-sm bg-[#111111]">
            <CardHeader className="pb-3 border-b border-neutral-800 bg-[#1a1a1a]">
              <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Required format</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4 text-sm font-medium">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">Must be a CSV or Excel (.xlsx) file.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 leading-relaxed">Must include basic metrics: <br/><code className="bg-[#222] border border-neutral-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Distance</code>, <code className="bg-[#222] border border-neutral-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest text-slate-400 font-bold">Top Speed</code>.</span>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                  <span className="text-slate-300 leading-relaxed">Players inside the file are mapped automatically using their <code className="bg-[#222] border border-neutral-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">gps_id</code>. Ensure roster is up to date.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="min-h-[500px] flex items-center justify-center bg-[#0a0a0a]"><div className="h-8 w-8 animate-spin rounded flex items-center justify-center border-t-2 border-indigo-500" /></div>}>
      <ImportInterface />
    </Suspense>
  );
}
