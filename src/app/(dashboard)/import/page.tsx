"use client";

import { useState, Suspense } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function ImportInterface() {
  const [activeType, setActiveType] = useState<"session" | "speed">("session");
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

  const processFile = (selectedFile: File, type: "session" | "speed") => {
    setFile(selectedFile);
    setActiveType(type);
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
          toast.error("Error al procesar CSV: " + error.message);
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
            toast.error("El archivo Excel parece estar vacío.");
          }
        } catch (error) {
          toast.error("Error al procesar el archivo Excel.");
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "session" | "speed") => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (Máx 10MB)");
        return;
      }
      const name = droppedFile.name.toLowerCase();
      if (droppedFile.type === "text/csv" || name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
        processFile(droppedFile, type);
      } else {
        toast.error("Por favor, sube un archivo CSV o Excel (.xlsx) válido");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, type: "session" | "speed") => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (Máx 10MB)");
        return;
      }
      processFile(selectedFile, type);
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

    const endpoint = activeType === "session" ? "/api/import" : "/api/import/speed-evaluation";

    try {
      const response = await fetch(endpoint, {
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
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.progress !== undefined) setProgress(data.progress);
            if (data.message) setStatusMessage(data.message);
            if (data.success) setImportResult({ success: true, message: data.message });
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Data Import Center</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Upload GPS session logs or periodic physical evaluation results.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!file ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* GPS Session Import Card */}
              <Card 
                className={`bg-[#111] border-2 cursor-pointer transition-all duration-300 group ${dragActive && activeType === 'session' ? 'border-indigo-500 bg-indigo-500/5' : 'border-neutral-800 hover:border-indigo-500/40 hover:bg-[#161616]'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, "session")}
                onClick={() => document.getElementById('session-upload')?.click()}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Daily GPS Sessions</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2 leading-relaxed">
                    Import total distance, HSR, load,<br/>and intensity metrics.
                  </p>
                  <input id="session-upload" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => handleChange(e, "session")} />
                  <Button variant="link" className="mt-4 text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Select Files <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </CardContent>
              </Card>

              {/* Speed Evaluation Card */}
              <Card 
                className={`bg-[#111] border-2 cursor-pointer transition-all duration-300 group ${dragActive && activeType === 'speed' ? 'border-amber-500 bg-amber-500/5' : 'border-neutral-800 hover:border-amber-500/40 hover:bg-[#161616]'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, "speed")}
                onClick={() => document.getElementById('speed-upload')?.click()}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Speed Evaluations</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2 leading-relaxed">
                    Update player Top Speeds and<br/>max velocity records.
                  </p>
                  <input id="speed-upload" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => handleChange(e, "speed")} />
                  <Button variant="link" className="mt-4 text-amber-500 font-bold uppercase tracking-widest text-[10px]">Select Evaluation <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-[#111] border-neutral-800 overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${activeType === 'session' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
              <CardHeader className="bg-[#1a1a1a] border-b border-neutral-800 px-6 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeType === 'session' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                    {activeType === 'session' ? <Upload className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase italic text-white">
                      {activeType === 'session' ? 'Daily GPS Session' : 'Speed Evaluation File'}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{file.name} • {(file.size / 1024).toFixed(1)} KB</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={isProcessing} className="text-slate-500 hover:text-white hover:bg-white/5 uppercase font-bold text-[10px] tracking-widest">Change File</Button>
              </CardHeader>
              <CardContent className="p-6">
                {parsedHeaders && parsedRows && (
                   <div className="border border-neutral-800 rounded-xl overflow-hidden bg-[#0a0a0a]">
                     <div className="bg-[#161616] px-4 py-2 flex justify-between items-center border-b border-neutral-800">
                        <span className="text-[10px] uppercase font-black text-slate-400 italic">Preview • First 5 Rows</span>
                        <span className={`text-[10px] font-black uppercase italic ${activeType === 'session' ? 'text-indigo-400' : 'text-amber-500'}`}>{parsedRows.length} total records</span>
                     </div>
                     <div className="overflow-x-auto">
                        <Table className="text-[11px]">
                          <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent bg-[#111]">
                              {parsedHeaders.slice(0, 5).map((h, i) => (
                                <TableHead key={i} className="text-slate-500 font-black uppercase tracking-tighter px-4 py-3 h-auto">{h}</TableHead>
                              ))}
                              {parsedHeaders.length > 5 && <TableHead className="px-4 py-3 h-auto">...</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.slice(0, 5).map((row, i) => (
                              <TableRow key={i} className="border-neutral-800 hover:bg-[#1a1a1a]">
                                {parsedHeaders.slice(0, 5).map((h, j) => (
                                  <TableCell key={j} className="text-slate-300 font-bold px-4 py-2 truncate max-w-[150px]">
                                    {row[h]?.toString() || "-"}
                                  </TableCell>
                                ))}
                                {parsedHeaders.length > 5 && <TableCell className="px-4 py-2 text-slate-600">...</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                     </div>
                   </div>
                )}

                {/* Progress tracking */}
                {isProcessing && (
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase italic tracking-widest text-indigo-400">{statusMessage}</span>
                      </div>
                      <span className="text-xs font-black italic text-white">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className={`h-full transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] ${activeType === 'session' ? 'bg-indigo-500' : 'bg-amber-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Results message */}
                {importResult && (
                  <div className={`mt-8 p-4 rounded-xl border flex items-center gap-3 ${importResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                    {importResult.success ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <span className="text-[10px] font-black uppercase italic tracking-widest">{importResult.message}</span>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-neutral-800 flex justify-end gap-3">
                   <Button variant="outline" onClick={handleClear} disabled={isProcessing} className="bg-transparent border-neutral-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
                   <Button 
                    className={`font-black uppercase italic tracking-tighter px-8 ${activeType === 'session' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
                    onClick={handleImport}
                    disabled={isProcessing || (importResult?.success ?? false)}
                   >
                     {isProcessing ? "Processing Data..." : "Run Import Engine"}
                   </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-[#111] border-neutral-800">
            <CardHeader className="border-b border-neutral-800 bg-[#1a1a1a]">
              <CardTitle className="text-[10px] uppercase font-black italic tracking-widest text-slate-400">System Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-white mb-1">Auto-Mapping</h4>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Players are identified by ID or Full Name automatically.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-white mb-1">Name Format</h4>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Separate "Nombre" & "Apellido" columns are now supported.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-white mb-1">Speed Fallback</h4>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Players with 0 speed in records are defaulted to 30 km/h minimum.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20">
            <h4 className="text-[11px] font-black uppercase italic text-white mb-2">Pro Tip</h4>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
              Use the "Speed Evaluations" area once a month to calibrate players' maximum speed and maintain accurate intensity percentages.
            </p>
          </div>
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
