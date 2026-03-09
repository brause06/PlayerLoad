"use client";

import { useState, useEffect } from "react";
import { Sparkles, Brain, AlertCircle, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AICoachCard() {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInsight = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/ai/insights");
            if (!res.ok) throw new Error("Failed to fetch AI insights");
            const data = await res.json();
            setInsight(data.insight);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsight();
    }, []);

    // Helper to format markdown-like text from AI
    const formatInsight = (text: string) => {
        return text.split("\n\n").map((paragraph, i) => {
            if (paragraph.startsWith("###")) {
                return <h4 key={i} className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-4 mb-2 flex items-center gap-2">
                    {paragraph.replace("### ", "")}
                </h4>;
            }
            return <p key={i} className="text-slate-300 text-sm leading-relaxed mb-3">
                {paragraph.split("**").map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white bg-indigo-500/10 px-1 rounded">{part}</strong> : part)}
            </p>;
        });
    };

    return (
        <Card className="bg-[#111111] border-neutral-800 shadow-xl overflow-hidden relative group">
            {/* Animated Gradient Background */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all duration-700" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all duration-700" />

            <CardHeader className="pb-2 border-b border-neutral-800/50 bg-[#161616]/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm uppercase tracking-[0.2em] font-black flex items-center gap-3 text-white">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Brain className="h-4 w-4 text-indigo-400" />
                        </div>
                        Coach Intelligence Beta
                    </CardTitle>
                    <button 
                        onClick={fetchInsight}
                        disabled={loading}
                        className="text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-6 relative">
                {loading ? (
                    <div className="space-y-4 py-4">
                        <div className="h-4 bg-neutral-800 rounded-full w-3/4 animate-pulse" />
                        <div className="h-4 bg-neutral-800 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-neutral-800 rounded-full w-5/6 animate-pulse" />
                        <div className="flex items-center gap-2 mt-6">
                            <Sparkles className="h-3 w-3 text-indigo-500 animate-bounce" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Analizando métricas del equipo...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-rose-200">Error al obtener insights</p>
                            <p className="text-xs text-rose-400/80 mt-1">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                        {formatInsight(insight || "")}
                        
                        <div className="mt-6 pt-4 border-t border-neutral-800/50 flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black tracking-widest text-indigo-500 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3" />
                                Inteligencia Predictiva Activa
                            </span>
                            <button className="text-[10px] items-center gap-1 font-bold text-slate-400 hover:text-white transition-colors flex uppercase tracking-wider">
                                Ver Reporte Completo
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
