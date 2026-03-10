import React from "react";
import prisma from "@/lib/prisma";
import { calculateACWRFromData } from "@/lib/metrics/acwr";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { Users, Activity } from "lucide-react";
import { isSameDay, startOfDay, subDays, endOfDay } from "date-fns";
import Link from "next/link";
import { calculateWeightedReadiness } from "@/lib/metrics/readiness";

export const dynamic = "force-dynamic";

export default async function ReadinessBoardPage() {
  // 1. Fetch all players
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" }
  });

  // 2. Find the most recent session date
  const latestSession = await prisma.session.findFirst({
    orderBy: { date: "desc" },
    select: { date: true }
  });
  const targetDate = latestSession?.date || new Date();
  const chronicStart = subDays(startOfDay(targetDate), 27);

  // 3. Bulk fetch ALL SessionData for the relevant window for ALL players
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

  // 4. Bulk fetch ALL Wellness records (we'll filter latest in-memory)
  // To keep it simple and efficient, we fetch all wellness records from the last 7 days
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
  const readinessData = players.map((player: any) => {
    try {
      // Filter sessions for this player
      const playerSessions = allSessionData.filter(sd => sd.playerId === player.id);
      const acwrData = calculateACWRFromData(playerSessions, targetDate);
      const acwr = acwrData.acwr || 0;

      // Filter latest wellness for this player
      const playerWellness = allWellness.find(w => w.playerId === player.id);

      // Default metrics
      let displayWellness = 0;
      let jointPainIndicator = null;
      let statusScoreIndicator = 0;
      let hasFilledWellnessToday = false;
      let hasPain = false;
      let finalScore = 0;

      if (playerWellness) {
        hasFilledWellnessToday = isSameDay(new Date(playerWellness.date), new Date());

        // We can't easily call calculateWeightedReadiness if it hits DB
        // But we already fetched systemSettings!
        // Let's use the logic here or pass settings
        // For now, I'll pass the record and let the function (which is now called in memory) handle it
        // Note: the current calculateWeightedReadiness uses a cache, so the first call will populate it.
        // Actually, let's just do it directly to be 100% sure we don't hit DB.
        
        const settingsList = systemSettings || [];
        const wSleep = parseInt(settingsList.find((s: any) => s.key === "weight_sleep")?.value || "3", 10);
        const wEnergy = parseInt(settingsList.find((s: any) => s.key === "weight_energy")?.value || "2", 10);
        const wFatigue = parseInt(settingsList.find((s: any) => s.key === "weight_fatigue")?.value || "2", 10);
        const wSoreness = parseInt(settingsList.find((s: any) => s.key === "weight_soreness")?.value || "3", 10);
        const wStress = parseInt(settingsList.find((s: any) => s.key === "weight_stress")?.value || "2", 10);
        const totalWeight = wSleep + wEnergy + wFatigue + wSoreness + wStress;

        const sleepScore = playerWellness.sleep;
        const energyScore = playerWellness.energy || 5;
        const fatigueScore = 11 - playerWellness.fatigue;
        const sorenessScore = 11 - playerWellness.muscleSoreness;
        const stressScore = 11 - playerWellness.stress;

        const weightedSum = (sleepScore * wSleep) + (energyScore * wEnergy) + (fatigueScore * wFatigue) + (sorenessScore * wSoreness) + (stressScore * wStress);
        const wScore = weightedSum / totalWeight;
        
        displayWellness = (wScore || 0) * 10;
        
        if (displayWellness < 40) {
           finalScore = displayWellness * 0.5;
        } else {
           finalScore = displayWellness * 0.7;
        }

        const painMapObj = playerWellness.jointPainMap as any;
        const painKeys = painMapObj ? Object.keys(painMapObj) : [];
        if (painKeys.length > 0) {
            jointPainIndicator = `${painKeys.length} zonas afectadas`;
        }
        const musclePainCount = (playerWellness.musclePainMap as string[])?.length || 0;
        hasPain = painKeys.length > 0 || musclePainCount > 0;

        statusScoreIndicator = playerWellness.fatigue || 0;
      } else {
        displayWellness = 0;
        finalScore = 0;
      }
      
      if (acwr >= 0.8 && acwr <= 1.3) {
        finalScore += 25;
      } else if (acwr > 1.5) {
        finalScore -= 15;
      } else if (acwr < 0.8) {
        finalScore -= 5;
      } else {
        finalScore += 10;
      }

      const finalReadiness = Math.min(Math.max(finalScore || 0, 0), 100);

      let statusMsg = "Metricas de recuperación óptimas";
      if (!playerWellness) {
         statusMsg = "Sin reporte de wellness hoy.";
      } else if (hasPain) {
         const painDesc = jointPainIndicator || "Dolor muscular";
         statusMsg = `⚠️ ALERTA: ${painDesc}`;
      } else if (statusScoreIndicator >= 7) {
         statusMsg = "Jugador reporta golpe fuerte.";
      } else if (acwr > 1.5) {
         statusMsg = "Riesgo por carga alta.";
      } else if (displayWellness < 75) {
         statusMsg = "Wellness por debajo del promedio.";
      } else if (acwr < 0.8) {
         statusMsg = "Carga baja. Monitorear acondicionamiento.";
      }

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
      console.error(`Readiness Board failure for player ${player.id}:`, err);
      return {
        ...player,
        position: player.position || "N/A",
        acwr: 0,
        wellness: 0,
        statusScoreIndicator: 0,
        jointPainIndicator: null,
        readiness: 0,
        statusCategory: "OUT",
        statusMsg: "Error procesando datos.",
        hasPain: false,
        hasFilledWellnessToday: false
      };
    }
  });

  // Summaries
  const total = readinessData.length;
  const green = readinessData.filter((p: any) => p.statusCategory === "GREEN").length;
  const modified = readinessData.filter((p: any) => p.statusCategory === "MODIFIED").length;
  const out = readinessData.filter((p: any) => p.statusCategory === "OUT").length;

  const avgReadiness = total > 0 
    ? readinessData.reduce((acc: number, p: any) => acc + p.readiness, 0) / total 
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-extrabold tracking-widest uppercase text-white">Team Readiness Board</h1>
          <p className="text-sm font-medium text-slate-400 max-w-2xl">
            Real-time athlete status monitoring and performance insights.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2 flex justify-between">
              <span>Total Squad</span>
              <Users className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-3xl font-light text-white">{total}</div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-semibold mb-2 flex justify-between">
              <span>Green</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="text-3xl font-light text-white">{green}</div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mb-2 flex justify-between">
              <span>Modified</span>
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
            <div className="text-3xl font-light text-white">{modified}</div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-rose-500 font-semibold mb-2 flex justify-between">
              <span>Out/Monitor</span>
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            </div>
            <div className="text-3xl font-light text-white">{out}</div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 border-l-4 border-l-indigo-500 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2 flex justify-between">
              <span>Avg Readiness</span>
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="flex items-end gap-1">
              <div className="text-3xl font-light text-white">{Math.round(avgReadiness)}</div>
              <span className="text-sm text-slate-500 mb-1">%</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {readinessData.map((player: any) => {
              let tagColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
              let dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
              
              if (player.statusCategory === "MODIFIED") {
                tagColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
              } else if (player.statusCategory === "OUT") {
                tagColor = "text-rose-400 bg-rose-400/10 border-rose-400/20";
                dotColor = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
              }

              return (
                <Link href={`/players/${player.id}?tab=wellness`} key={player.id} className="block bg-[#131313] hover:bg-[#181818] border border-neutral-800/80 hover:border-neutral-700 transition-all rounded-xl p-5 group flex flex-col justify-between relative overflow-hidden cursor-pointer">
                  <div className="absolute top-5 right-5 flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${tagColor}`}>
                        {player.statusCategory}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    </div>
                    {!player.hasFilledWellnessToday && (
                      <span className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse">
                        Missing Wellness
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-6 pr-24">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-sm shrink-0">
                        {player.position ? player.position.slice(0, 2) : "PJ"}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-slate-100 text-lg uppercase tracking-wide leading-none mb-1 group-hover:text-indigo-400 transition-colors">
                          {player.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest font-medium">
                          <span>{player.position}</span>
                          <span className="w-1 h-1 rounded-full bg-neutral-700" />
                          <span className="text-amber-500/80">SQUAD</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <div className="text-[10px] font-mono tracking-wider bg-neutral-900/80 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded">
                          <span className="text-slate-500 mr-2">WEL</span>
                          <span className={player.wellness > 80 ? "text-emerald-400" : "text-amber-400"}>{player.wellness}</span>
                        </div>
                        <div className="text-[10px] font-mono tracking-wider bg-neutral-900/80 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded">
                          <span className="text-slate-500 mr-2">ACWR</span>
                          <span className={player.acwr > 1.5 ? "text-rose-400" : player.acwr < 0.8 ? "text-amber-400" : "text-emerald-400"}>
                            {player.acwr.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-neutral-500 font-medium">
                        {player.statusMsg}
                      </p>
                    </div>

                    <div className="pl-4 shrink-0 flex flex-col items-center">
                      <CircularGauge value={player.readiness} size={64} strokeWidth={5} />
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neutral-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
