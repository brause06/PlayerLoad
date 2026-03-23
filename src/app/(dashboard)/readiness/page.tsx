import React from "react";
import prisma from "@/lib/prisma";
import { calculateACWRFromData } from "@/lib/metrics/acwr";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { Users, Activity } from "lucide-react";
import { isSameDay, startOfDay, subDays, endOfDay } from "date-fns";
import Link from "next/link";
import { calculateWeightedReadinessSync } from "@/lib/metrics/readiness";
import { ReadinessFilters } from "@/components/readiness/ReadinessFilters";

export const dynamic = "force-dynamic";

export default async function ReadinessBoardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 1. Fetch all players
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" }
  });

  const positions = Array.from(new Set(players.map(p => p.position).filter(Boolean))) as string[];

  // 2. Find the most recent session date
  const latestSession = await prisma.session.findFirst({
    orderBy: { date: "desc" },
    select: { date: true }
  });
  const targetDate = latestSession?.date || new Date();
  const chronicStart = subDays(startOfDay(targetDate), 27);

  // 3. Bulk fetch ALL SessionData
  const allSessionData = await prisma.sessionData.findMany({
    where: {
      session: {
        date: {
          gte: chronicStart,
          lte: endOfDay(targetDate),
        }
      }
    },
    include: {
      session: { select: { date: true } }
    }
  });

  // 4. Bulk fetch ALL Wellness records
  const allWellness = await prisma.wellness.findMany({
    where: {
       date: {
         gte: subDays(startOfDay(new Date()), 7)
       }
    },
    orderBy: { date: "desc" }
  });

  // 5. Fetch System Settings once
  const systemSettings = await prisma.systemSettings.findMany();

  // 6. Process data in memory
  let readinessData = players.map((player: any) => {
    try {
      const playerSessions = allSessionData.filter(sd => sd.playerId === player.id);
      const acwrData = calculateACWRFromData(playerSessions, targetDate);
      const acwr = acwrData.acwr || 0;
      const playerWellness = allWellness.find(w => w.playerId === player.id);

      let displayWellness = 0;
      let jointPainIndicator = null;
      let statusScoreIndicator = 0;
      let hasFilledWellnessToday = false;
      let hasPain = false;
      let finalScore = 0;

      if (playerWellness) {
        hasFilledWellnessToday = isSameDay(new Date(playerWellness.date), new Date());
        const wScore = calculateWeightedReadinessSync(playerWellness, systemSettings || []);
        displayWellness = wScore * 10;
        
        if (displayWellness < 40) finalScore = displayWellness * 0.5;
        else finalScore = displayWellness * 0.7;

        const painMapObj = playerWellness.jointPainMap as any;
        const painKeys = painMapObj ? Object.keys(painMapObj) : [];
        if (painKeys.length > 0) jointPainIndicator = `${painKeys.length} zonas afectadas`;
        
        const musclePainCount = (playerWellness.musclePainMap as string[])?.length || 0;
        hasPain = painKeys.length > 0 || musclePainCount > 0;
        statusScoreIndicator = playerWellness.fatigue || 0;
      } else {
        displayWellness = 0;
        finalScore = 0;
      }
      
      if (acwr >= 0.8 && acwr <= 1.3) finalScore += 25;
      else if (acwr > 1.5) finalScore -= 15;
      else if (acwr < 0.8) finalScore -= 5;
      else finalScore += 10;

      const finalReadiness = Math.min(Math.max(finalScore || 0, 0), 100);

      let statusMsg = "Metricas de recuperación óptimas";
      if (!playerWellness) statusMsg = "Sin reporte de wellness hoy.";
      else if (hasPain) statusMsg = `⚠️ ALERTA: ${jointPainIndicator || "Dolor muscular"}`;
      else if (statusScoreIndicator >= 7) statusMsg = "Jugador reporta golpe fuerte.";
      else if (acwr > 1.5) statusMsg = "Riesgo por carga alta.";
      else if (displayWellness < 75) statusMsg = "Wellness por debajo del promedio.";
      else if (acwr < 0.8) statusMsg = "Carga baja. Monitorear acondicionamiento.";

      let statusCategory = "GREEN";
      if (finalReadiness < 65 || statusScoreIndicator >= 8) statusCategory = "OUT";
      else if (finalReadiness <= 85 || statusScoreIndicator >= 6 || displayWellness < 60) statusCategory = "MODIFIED";

      return {
        ...player,
        position: player.position || "N/A",
        acwr: isNaN(acwr) ? 0 : acwr,
        wellness: isNaN(displayWellness) ? 0 : displayWellness,
        statusScoreIndicator,
        jointPainIndicator,
        readiness: isNaN(finalReadiness) ? 0 : finalReadiness,
        statusCategory,
        statusMsg,
        hasPain,
        hasFilledWellnessToday
      };
    } catch (err) {
      return {
        ...player,
        position: "N/A", acwr: 0, wellness: 0, statusScoreIndicator: 0,
        jointPainIndicator: null, readiness: 0, statusCategory: "OUT",
        statusMsg: "Error procesando datos.", hasPain: false, hasFilledWellnessToday: false
      };
    }
  });

  // 7. Apply filters
  const params = await searchParams;
  const search = (params.search as string)?.toLowerCase();
  const posFilter = params.position as string;
  const statusFilter = params.status as string;
  const sortBy = params.sort as string || "name-asc";

  if (search) readinessData = readinessData.filter(p => p.name.toLowerCase().includes(search));
  if (posFilter && posFilter !== "all") readinessData = readinessData.filter(p => p.position === posFilter);
  if (statusFilter && statusFilter !== "all") readinessData = readinessData.filter(p => p.statusCategory === statusFilter);

  // 8. Apply sorting
  readinessData.sort((a, b) => {
    switch (sortBy) {
      case "readiness-desc": return b.readiness - a.readiness;
      case "readiness-asc": return a.readiness - b.readiness;
      case "acwr-desc": return b.acwr - a.acwr;
      case "wellness-desc": return b.wellness - a.wellness;
      case "name-asc": default: return a.name.localeCompare(b.name);
    }
  });

  const total = readinessData.length;
  const green = readinessData.filter((p: any) => p.statusCategory === "GREEN").length;
  const modified = readinessData.filter((p: any) => p.statusCategory === "MODIFIED").length;
  const out = readinessData.filter((p: any) => p.statusCategory === "OUT").length;
  const avgReadiness = total > 0 ? readinessData.reduce((acc: number, p: any) => acc + p.readiness, 0) / total : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="space-y-2 mb-8 border-l-4 border-indigo-500 pl-6 py-2">
          <h1 className="text-3xl font-black tracking-widest uppercase text-white">Team Readiness Board</h1>
          <p className="text-sm font-medium text-slate-400 max-w-2xl">Athlete status and performance insights.</p>
        </div>

        <ReadinessFilters positions={positions} />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex justify-between">
              <span>Total Squad</span>
              <Users className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-3xl font-light text-white">{total}</div>
          </div>
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between text-emerald-500">
             <span className="text-[10px] uppercase font-bold tracking-widest">Optimal</span>
             <div className="text-3xl font-light text-white">{green}</div>
          </div>
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between text-amber-500">
             <span className="text-[10px] uppercase font-bold tracking-widest">Modified</span>
             <div className="text-3xl font-light text-white">{modified}</div>
          </div>
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between text-rose-500">
             <span className="text-[10px] uppercase font-bold tracking-widest">Out</span>
             <div className="text-3xl font-light text-white">{out}</div>
          </div>
          <div className="bg-[#111111] border border-neutral-800 border-l-4 border-l-indigo-500 rounded-xl p-4 flex flex-col justify-between">
             <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Avg Readiness</span>
             <div className="flex items-end gap-1">
               <div className="text-3xl font-light text-white">{Math.round(avgReadiness)}</div>
               <span className="text-sm text-slate-500 mb-1">%</span>
             </div>
          </div>
        </div>

        <div className="mt-8">
          {readinessData.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl bg-[#111]">
               <Users className="h-12 w-12 text-neutral-700 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">No players found</h3>
               <p className="text-sm text-slate-600 font-medium">Adjust filters to see results.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readinessData.map((player: any) => {
                let tagColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                let dotColor = "bg-emerald-500";
                if (player.statusCategory === "MODIFIED") {
                  tagColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                  dotColor = "bg-amber-500";
                } else if (player.statusCategory === "OUT") {
                   tagColor = "text-rose-400 bg-rose-400/10 border-rose-400/20";
                   dotColor = "bg-rose-500";
                }
                return (
                  <Link href={`/players/${player.id}?tab=wellness`} key={player.id} className="block bg-[#131313] border border-neutral-800/80 rounded-xl p-5 hover:border-neutral-700 transition-all group relative overflow-hidden">
                    <div className="absolute top-5 right-5 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${tagColor}`}>{player.statusCategory}</span>
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                      </div>
                      {!player.hasFilledWellnessToday && <span className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse">Missing Wellness</span>}
                    </div>
                    <div className="flex gap-4 mb-6">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-sm shrink-0">{player.position.slice(0, 2)}</div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-lg uppercase tracking-wide leading-none mb-1 group-hover:text-indigo-400 transition-colors">{player.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{player.position}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-2 flex-1">
                        <div className="flex gap-2">
                          <div className="text-[10px] font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            <span className="text-slate-500 mr-2">WEL</span><span className={player.wellness > 80 ? "text-emerald-400" : "text-amber-400"}>{player.wellness}</span>
                          </div>
                          <div className="text-[10px] font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            <span className="text-slate-500 mr-2">ACWR</span><span className={player.acwr > 1.5 ? "text-rose-400" : player.acwr < 0.8 ? "text-amber-400" : "text-emerald-400"}>{player.acwr.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight line-clamp-1">{player.statusMsg}</p>
                      </div>
                      <CircularGauge value={player.readiness} size={56} strokeWidth={4} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
