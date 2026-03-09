"use client";

import { AICoachCard } from "@/components/dashboard/ai-coach-card";
import { Sparkles, Brain, History, Settings2, Activity } from "lucide-react";

export default function AICoachPage() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px w-8 bg-indigo-500" />
                        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-500">Premium AI Assistant</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                        Coach Intelligence
                        <Sparkles className="h-8 w-8 text-indigo-500 fill-indigo-500/20" />
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
                        Análisis predictivo avanzado basado en cargas de trabajo, métricas de GPS y reportes de bienestar. 
                        Optimiza la disponibilidad de tu plantel con sugerencias basadas en datos reales.
                    </p>
                </div>
                
                <div className="flex gap-2">
                    <button className="p-2.5 bg-[#111] border border-neutral-800 rounded-xl text-slate-400 hover:text-white transition-all hover:bg-[#1a1a1a]">
                        <History className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 bg-[#111] border border-neutral-800 rounded-xl text-slate-400 hover:text-white transition-all hover:bg-[#1a1a1a]">
                        <Settings2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Main AI Card - Reusing the component but could be expanded here */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <AICoachCard />
                </div>

                {/* Additional AI-specific layout elements could go here */}
                <div className="grid md:grid-cols-3 gap-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="p-6 bg-[#0c0c0c] border border-neutral-900 rounded-3xl flex flex-col gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                            <Brain className="h-5 w-5 text-indigo-400" />
                        </div>
                        <h4 className="font-bold text-white uppercase tracking-widest text-xs">Análisis de Fatiga</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Predicción de riesgo de lesión basada en variabilidad de carga acumulada.</p>
                        <span className="text-[9px] font-black text-indigo-500 uppercase mt-auto">Próximamente</span>
                    </div>
                    <div className="p-6 bg-[#0c0c0c] border border-neutral-900 rounded-3xl flex flex-col gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-white uppercase tracking-widest text-xs">Optimización de Drills</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Sugerencia de ejercicios específicos para compensar cargas bajas de HSR.</p>
                        <span className="text-[9px] font-black text-emerald-500 uppercase mt-auto">Próximamente</span>
                    </div>
                    <div className="p-6 bg-[#0c0c0c] border border-neutral-900 rounded-3xl flex flex-col gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                            <Activity className="h-5 w-5 text-amber-500" />
                        </div>
                        <h4 className="font-bold text-white uppercase tracking-widest text-xs">Benchmarking Posicional</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Comparativa avanzada contra estándares de ligas profesionales.</p>
                        <span className="text-[9px] font-black text-amber-500 uppercase mt-auto">Próximamente</span>
                    </div>
                </div>
            </div>
            
            <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex flex-col items-center text-center gap-4 border-dashed mt-8">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold uppercase tracking-widest text-sm">¿Tienes una consulta específica?</h3>
                    <p className="text-slate-500 text-xs mt-1 max-w-sm">Próximamente podrás chatear directamente con tu asistente de IA para obtener análisis profundos del plantel.</p>
                </div>
                <button className="px-6 py-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all cursor-not-allowed">
                    Abrir Chat IA
                </button>
            </div>
        </div>
    );
}
