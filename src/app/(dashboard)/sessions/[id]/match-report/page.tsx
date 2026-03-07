"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Zap, Activity, TrendingUp, Clock, Calendar, Shield, Gauge, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push(`/sessions/${params.id}`)}
                        className="bg-[#111] border-neutral-800 text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Match Analytics</h1>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black">PRO REPORT</Badge>
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
                    <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs uppercase tracking-widest">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Top Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Active Squad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-white">{players.length} Players</div>
                        <p className="text-[10px] text-slate-600 font-bold">Total participants tracked</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black">HSR Intensity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-indigo-500">
                            {Math.round(players.reduce((acc: any, p: any) => acc + p.hsrPerMin, 0) / players.length)}m/min
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold">Squad Average HSR Density</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Acel Density</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-500">
                            {(players.reduce((acc: any, p: any) => acc + p.acelPerMin, 0) / players.length).toFixed(2)} /min
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold">Squad Average Acel Rate</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Highest Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-500">
                            {Math.max(...players.map((p: any) => p.hmld))}
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold uppercase truncate">Peak Metabolic Load</p>
                    </CardContent>
                </Card>
            </div>

            {/* Player Performance Table */}
            <Card className="bg-[#111] border-neutral-800 overflow-hidden">
                <CardHeader className="border-b border-neutral-900 bg-[#161616]/50">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-500" />
                        <CardTitle className="text-white text-sm uppercase font-black tracking-widest">Player Workloads & Season Context</CardTitle>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#0a0a0a] border-b border-neutral-900">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Mins</th>
                                <th className="px-4 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center">HSR (m)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">HSR/min</th>
                                <th className="px-4 py-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Acel/min</th>
                                <th className="px-4 py-4 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">HMLD</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Season Mins</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                            {players.sort((a: any, b: any) => b.hmld - a.hmld).map((p: any) => (
                                <tr key={p.playerId} className="hover:bg-neutral-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                                <User className="w-4 h-4 text-neutral-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white uppercase group-hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => router.push(`/players/${p.playerId}`)}>{p.playerName}</div>
                                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{p.position}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="text-sm font-black text-white">{Math.round(p.minutes)}</span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="text-sm font-bold text-indigo-400">{Math.round(p.hsr)}</div>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Explanatory Note */}
            <div className="flex bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl items-start gap-4">
                <Gauge className="w-5 h-5 text-indigo-500 mt-1" />
                <div>
                   <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Advanced Metrics Glossary</h4>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        <strong className="text-indigo-400">HSR/min:</strong> High Speed Running density. Measures how much high-intensity volume is produced for every minute of game play. Elite target for Wings: &gt; 12m/min. 
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
