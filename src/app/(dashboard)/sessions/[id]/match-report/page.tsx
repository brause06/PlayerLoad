"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Zap, Activity, TrendingUp, Clock, Calendar, Shield, Gauge, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const FORWARDS = ["PROP", "PRÓP", "HOOKER", "LOCK", "BACK ROW", "FLANKER", "NUMBER 8"];
const BACKS = ["SCRUM HALF", "FLY HALF", "APERTURA", "CENTRE", "CENTER", "BACK 3", "WING", "FULLBACK"];

function getGroup(position: string): "FORWARDS" | "BACKS" | "OTHER" {
    const p = (position || "").toUpperCase();
    if (FORWARDS.some(f => p.includes(f))) return "FORWARDS";
    if (BACKS.some(b => p.includes(b))) return "BACKS";
    return "OTHER";
}

export default function MatchReportPage() {
    const params = useParams();
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReport() {
            try {
                const res = await fetch(`/api/sessions/${params.id}/match-report`);
                if (res.ok) {
                    const data = await res.json();
                    setReport(data);
                }
            } catch (err) {
                console.error("Failed to load report", err);
            } finally {
                setLoading(false);
            }
        }
        if (params.id) fetchReport();
    }, [params.id]);

    const handleExportPDF = async () => {
        if (!report) return;

        const doc = new jsPDF("l", "pt", "a4");
        const { sessionInfo, players, insights } = report;

        // Helper to load image
        const loadImage = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = reject;
                img.src = url;
            });
        };

        let logoData = "";
        try {
            logoData = await loadImage("/images/team-logo.png");
        } catch (e) {
            console.error("Could not load logo for PDF", e);
        }

        // --- COLORS ---
        const TEAM_GOLD = [255, 204, 0];
        const TEAM_BLACK = [0, 0, 0];

        // --- HEADER ---
        doc.setFillColor(TEAM_BLACK[0], TEAM_BLACK[1], TEAM_BLACK[2]);
        doc.rect(0, 0, 842, 70, "F");
        
        if (logoData) {
            doc.addImage(logoData, "PNG", 40, 15, 40, 40);
        }

        doc.setTextColor(TEAM_GOLD[0], TEAM_GOLD[1], TEAM_GOLD[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("RUGBY PERFORMANCE ANALYTICS", logoData ? 90 : 40, 45);
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        const dateStr = format(new Date(sessionInfo.date), "PPP").toUpperCase();
        doc.text(`${dateStr}  |  OPPONENT: ${sessionInfo.opponent || "TRAINING"}`, logoData ? 90 : 40, 60);
        
        // Logo / Branding emblem area (Small Gold Box)
        doc.setFillColor(TEAM_GOLD[0], TEAM_GOLD[1], TEAM_GOLD[2]);
        doc.rect(780, 0, 62, 70, "F");
        doc.setTextColor(TEAM_BLACK[0], TEAM_BLACK[1], TEAM_BLACK[2]);
        doc.setFontSize(8);
        doc.text("PEÑAROL\nRUGBY", 785, 35);

        // --- EXECUTIVE SUMMARY ---
        doc.setTextColor(TEAM_BLACK[0], TEAM_BLACK[1], TEAM_BLACK[2]);
        doc.setFontSize(12);
        doc.text("EXECUTIVE SUMMARY", 40, 100);
        doc.setDrawColor(TEAM_GOLD[0], TEAM_GOLD[1], TEAM_GOLD[2]);
        doc.line(40, 105, 802, 105);

        const drawInsightBox = (x: number, title: string, content: string[], accentColor = TEAM_GOLD) => {
            const BOX_WIDTH = 180;
            const BOX_HEIGHT = 80;
            
            doc.setFillColor(248, 250, 252); // Slate-50
            doc.roundedRect(x, 115, BOX_WIDTH, BOX_HEIGHT, 2, 2, "F");
            
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(x, 115, 2, BOX_HEIGHT, "F");

            // Title
            doc.setTextColor(100, 116, 139); // Slate-500
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text(title.toUpperCase(), x + 10, 128);

            // Content
            content.forEach((line, i) => {
                const isFirst = i === 0;
                const isHighlight = line.includes("m/min") || line.includes("REACHED");
                
                if (isFirst) {
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(TEAM_BLACK[0], TEAM_BLACK[1], TEAM_BLACK[2]);
                    // If it's the main leader and has intensity, color it gold
                    if (line.includes("m/min")) doc.setTextColor(218, 165, 32); // Darker Gold for legibility on white
                } else {
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(71, 85, 105); // Slate-600
                }
                
                doc.text(line, x + 10, 145 + (i * 11), { maxWidth: BOX_WIDTH - 20 });
            });
        };

        // Intensity Leaders
        drawInsightBox(40, "INTENSITY LEADERS (M/MIN & >30')", 
            insights?.intensityLeaders?.map((l: any) => `${l.name}: ${l.mMin} m/min`) || ["No data"]
        );

        // Positional Workrate
        drawInsightBox(230, "POSITIONAL WORKRATE (AVG M/MIN)", [
            `BACKS: ${insights?.positionalAverages?.backs || 0} m/min`,
            `FORWARDS: ${insights?.positionalAverages?.forwards || 0} m/min`
        ], [30, 30, 30]);

        // HSR Leaders
        drawInsightBox(420, "TOP HSR VOLUME (METERS >5.5 M/S)", 
            insights?.hsrLeaders?.map((l: any) => `${l.name}: ${Math.round(l.value)}m`) || ["No data"],
            TEAM_GOLD
        );

        // Speed Compliance
        drawInsightBox(610, "SPEED COMPLIANCE (>90% MAX)", [
            `${insights?.speedExecution?.length || 0} PLAYERS REACHED MAX`,
            "",
            ...(insights?.speedExecution?.slice(0, 3) || [])
        ], [200, 0, 0]);

        // --- PLAYER PERFORMANCE TABLE ---
        const tableBody: any[] = [];
        
        // Positional Groups
        const backs = players.filter((p: any) => getGroup(p.position) === "BACKS").sort((a: any, b: any) => b.hmld - a.hmld);
        const forwards = players.filter((p: any) => getGroup(p.position) === "FORWARDS").sort((a: any, b: any) => b.hmld - a.hmld);
        const others = players.filter((p: any) => getGroup(p.position) === "OTHER").sort((a: any, b: any) => b.hmld - a.hmld);

        const addGroupToTable = (list: any[], groupName: string) => {
            if (list.length === 0) return;
            
            // Group Header
            tableBody.push([{ 
                content: groupName, 
                colSpan: 9, 
                styles: { 
                    fillColor: TEAM_BLACK, 
                    textColor: TEAM_GOLD, 
                    fontStyle: 'bold', 
                    halign: 'left',
                    fontSize: 9,
                    cellPadding: 6
                } 
            }]);

            list.forEach((p: any) => {
                // Main Player Row
                tableBody.push([
                    { content: p.playerName, styles: { fontStyle: 'bold', textColor: [0, 0, 0] } },
                    { content: p.position, styles: { textColor: [100, 100, 100] } },
                    { content: Math.round(p.minutes).toString() },
                    { content: Math.round(p.hsr).toString(), styles: { fontStyle: 'bold', textColor: TEAM_GOLD } },
                    { content: p.hsrPerMin.toFixed(1) },
                    { content: p.acelPerMin.toFixed(2) },
                    { content: Math.round(p.hmld).toString(), styles: { fontStyle: 'bold', textColor: [217, 119, 6] } },
                    { content: Math.round(p.seasonMinutes).toString() },
                    { 
                        content: p.hsrDiff !== null ? `${p.hsrDiff > 0 ? "+" : ""}${p.hsrDiff}%` : "NEW", 
                        styles: { textColor: p.hsrDiff > 0 ? [22, 163, 74] : [220, 38, 38], fontStyle: 'bold' } 
                    }
                ]);

                // Drill Breakdown Rows
                if (p.blocks && p.blocks.length > 0) {
                    p.blocks.forEach((b: any) => {
                        tableBody.push([
                            { content: `  ↳ ${b.name}`, styles: { fontSize: 7, textColor: [150, 150, 150], halign: 'left' } },
                            { content: `${b.topSpeed}km/h`, styles: { fontSize: 7, textColor: [150, 150, 150] } },
                            { content: `${Math.round(b.minutes)}m`, styles: { fontSize: 7, textColor: [150, 150, 150] } },
                            { content: `${Math.round(b.hsr)}m`, styles: { fontSize: 7, textColor: TEAM_GOLD, fontStyle: 'bold' } },
                            { content: `${b.hsrPerMin.toFixed(1)}/m`, styles: { fontSize: 7, textColor: [150, 150, 150] } },
                            { content: `${b.acelPerMin.toFixed(2)}/m`, styles: { fontSize: 7, textColor: [150, 150, 150] } },
                            { content: "", colSpan: 3 }
                        ]);
                    });
                }
            });
        };

        addGroupToTable(backs, "BACKS PERFORMANCE");
        addGroupToTable(forwards, "FORWARDS PERFORMANCE");
        addGroupToTable(others, "MIXED/OTHER POSITIONS");

        autoTable(doc, {
            startY: 220,
            head: [["PLAYER / BLOCKS", "POSITION", "MINS", "HSR (m)", "HSR/min", "ACEL/min", "HMLD", "SEASON", "TREND"]],
            body: tableBody,
            theme: "striped",
            headStyles: { 
                fillColor: [240, 240, 240], 
                textColor: [50, 50, 50], 
                fontSize: 8, 
                fontStyle: "bold",
                halign: "center",
                cellPadding: 8
            },
            bodyStyles: { 
                fontSize: 8,
                halign: "center",
                cellPadding: 5,
                textColor: [30, 30, 30],
                lineWidth: 0.1,
                lineColor: [230, 230, 230]
            },
            columnStyles: {
                0: { halign: "left", cellWidth: 150 },
                1: { cellWidth: 80 }
            },
            margin: { left: 40, right: 40 },
            didDrawPage: (data) => {
                // Page Footer
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`PEÑAROL RUGBY | HIGH PERFORMANCE STAFF | PAGE ${(doc as any).internal.getNumberOfPages()}`, 40, 575);
                doc.text(`CONFIDENTIAL REPORT`, 760, 575, { align: 'right' });
            }
        });

        const fileName = `Peñarol-Match-Report-${sessionInfo.opponent || "Session"}-${format(new Date(sessionInfo.date), "yyyy-MM-dd")}.pdf`;
        doc.save(fileName);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!report) return <div>Report not found.</div>;

    const { sessionInfo, players } = report;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src="/images/team-logo.png" alt="Team Logo" className="h-14 w-14 object-contain" />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push(`/sessions/${params.id}`)}
                        className="bg-black border-neutral-800 text-neutral-400 hover:text-[#FFCC00]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Match Analytics</h1>
                            <Badge className="bg-[#FFCC00]/10 text-[#FFCC00] border-[#FFCC00]/20 font-black">PEÑAROL RUGBY</Badge>
                        </div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sessionInfo.date), "PPP")} <span className="text-neutral-700">|</span> 
                            <Shield className="h-3 w-3" />
                            VS {sessionInfo.opponent || "Training Session"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleExportPDF}
                        className="bg-[#FFCC00] hover:bg-[#E6B800] text-black font-black text-xs uppercase tracking-widest"
                    >
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Top Metrics Summary - Rugby Specific Insights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* INTENSITY LEADERS */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                            <Zap className="h-3 w-3 text-[#FFCC00]" /> Intensity Leaders <span className="text-[8px] text-slate-600 font-bold lowercase tracking-normal">(m/min &gt;30' jugados)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mt-1">
                            {report.insights?.intensityLeaders?.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{l.name}</span>
                                    <span className="text-xs font-black text-white">{l.mMin} m/min</span>
                                </div>
                            ))}
                            {(!report.insights?.intensityLeaders || report.insights.intensityLeaders.length === 0) && (
                                <p className="text-[10px] text-slate-600 font-bold uppercase">No data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                {/* POSITIONAL SPLIT */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                            <Activity className="h-3 w-3 text-[#FFCC00]" /> Positional Workrate <span className="text-[8px] text-slate-600 font-bold lowercase tracking-normal">(promedio del grupo)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between h-full pt-2">
                            <div>
                                <div className="text-2xl font-black text-[#FFCC00]">
                                    {report.insights?.positionalAverages?.backs || 0}
                                    <span className="text-[10px] text-slate-600 ml-1 font-bold italic">m/min</span>
                                </div>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Backs Average</p>
                            </div>
                            <div className="h-10 w-[1px] bg-neutral-800 mx-2" />
                            <div className="text-right">
                                <div className="text-2xl font-black text-white">
                                    {report.insights?.positionalAverages?.forwards || 0}
                                    <span className="text-[10px] text-slate-600 ml-1 font-bold italic">m/min</span>
                                </div>
                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Forwards Average</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* HSR LEADERS */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-[#FFCC00]" /> Top HSR Volume <span className="text-[8px] text-slate-600 font-bold lowercase tracking-normal">(metros a &gt;5.5 m/s)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 mt-1">
                            {report.insights?.hsrLeaders?.map((l: any, i: number) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{l.name}</span>
                                    <span className="text-xs font-black text-emerald-500">{Math.round(l.value)}m</span>
                                </div>
                            ))}
                            {(!report.insights?.hsrLeaders || report.insights.hsrLeaders.length === 0) && (
                                <p className="text-[10px] text-slate-600 font-bold uppercase">No data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* SPEED EXECUTION */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                            <Gauge className="h-3 w-3 text-[#FFCC00]" /> Speed Compliance <span className="text-[8px] text-slate-600 font-bold lowercase tracking-normal">(&gt;90% vel. máx personal)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-black text-white">{report.insights?.speedExecution?.length || 0}</div>
                            <div className="text-[9px] text-slate-600 font-black uppercase">Players</div>
                        </div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Met &gt;90% of Personal Max</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                            {report.insights?.speedExecution?.slice(0, 3).map((name: string, i: number) => (
                                <Badge key={i} className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[8px] font-black h-4 px-1.5 uppercase hover:bg-rose-500/20 transition-colors">
                                    {name}
                                </Badge>
                            ))}
                            {(report.insights?.speedExecution?.length || 0) > 3 && (
                                <span className="text-[9px] text-slate-700 font-black self-center">
                                    +{report.insights.speedExecution.length - 3} MORE
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Player Performance Table */}
            <Card className="bg-[#111] border-neutral-800 overflow-hidden">
                <CardHeader className="border-b border-neutral-900 bg-[#161616]/50">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#FFCC00]" />
                        <CardTitle className="text-white text-sm uppercase font-black tracking-widest">Player Workloads & Block Breakdown</CardTitle>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#0a0a0a] border-b border-neutral-900">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player / Blocks</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Mins</th>
                                <th className="px-4 py-4 text-[10px] font-black text-[#FFCC00] uppercase tracking-widest text-center">HSR (m)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-[#FFCC00]/80 uppercase tracking-widest text-center">HSR/min</th>
                                <th className="px-4 py-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Acel/min</th>
                                <th className="px-4 py-4 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">HMLD</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Season Mins</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                            {players.sort((a: any, b: any) => b.hmld - a.hmld).map((p: any) => (
                                <>
                                    <tr key={p.playerId} className="bg-neutral-900/40 hover:bg-neutral-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-[#FFCC00]/40" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white uppercase group-hover:text-[#FFCC00] transition-colors cursor-pointer" onClick={() => router.push(`/players/${p.playerId}`)}>{p.playerName}</div>
                                                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{p.position}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-black text-white">{Math.round(p.minutes)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm font-bold text-[#FFCC00]">{Math.round(p.hsr)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm font-black text-white">{p.hsrPerMin}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm font-black text-white">{p.acelPerMin}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center border-x border-neutral-900/50">
                                            <div className="text-sm font-black text-amber-500">{Math.round(p.hmld)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-xs font-bold text-slate-400">{Math.round(p.seasonMinutes)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {p.hsrDiff !== null ? (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                                    p.hsrDiff > 0 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                                }`}>
                                                    {p.hsrDiff > 0 ? '+' : ''}{p.hsrDiff}%
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-700 uppercase">New Data</span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Block Details */}
                                    {p.blocks && p.blocks.map((b: any, bIdx: number) => (
                                        <tr key={`${p.playerId}-block-${bIdx}`} className="bg-black/40 border-l border-[#FFCC00]/20 group/block hover:bg-neutral-900/30 transition-colors">
                                            <td className="px-6 py-2">
                                                <div className="flex items-center gap-2 pl-6">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-700 group-hover/block:bg-[#FFCC00] transition-colors" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{b.name}</span>
                                                    <Badge variant="outline" className="text-[8px] h-4 px-1 border-neutral-800 text-slate-600 bg-transparent uppercase font-bold">
                                                        {b.topSpeed} km/h Peak
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-600">{Math.round(b.minutes)}m</td>
                                            <td className="px-4 py-2 text-center text-[10px] font-bold text-[#FFCC00]/60">{Math.round(b.hsr)}m</td>
                                            <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-400">{b.hsrPerMin.toFixed(1)}/m</td>
                                            <td className="px-4 py-2 text-center text-[10px] font-bold text-emerald-500/60">{b.acelPerMin.toFixed(2)}/m</td>
                                            <td colSpan={3} className="px-4 py-2"></td>
                                        </tr>
                                    ))}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Explanatory Note */}
            <div className="flex bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl items-start gap-4">
                <Gauge className="w-5 h-5 text-[#FFCC00] mt-1" />
                <div>
                   <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Advanced Metrics Glossary</h4>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        <strong className="text-[#FFCC00]">HSR/min:</strong> High Speed Running density. Measures how much high-intensity volume is produced for every minute of game play. Elite target for Wings: &gt; 12m/min. 
                        <br />
                        <strong className="text-emerald-400">Acel/min:</strong> Acceleration rate. Indicates how reactive the player was. 
                        <br />
                        <strong className="text-amber-400">HMLD:</strong> High Metabolic Load Distance. The definitive metric for rugby work-rate, capturing the energy cost of sprints and acceleration/deceleration.
                   </p>
                </div>
            </div>
        </div>
    );
}
