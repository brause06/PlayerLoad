"use client";

import { useEffect, useState } from "react";
import { FileText, Users, User, Download, FileBarChart, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateTeamReport, generatePlayerReport } from "@/lib/reports/pdf-generator";

export default function ReportsPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [generatingTeam, setGeneratingTeam] = useState(false);
  const [generatingPlayer, setGeneratingPlayer] = useState(false);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch("/api/players");
        if (res.ok) {
          const data = await res.json();
          setPlayers(data);
        }
        
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) {
           const dashData = await dashRes.json();
           setDashboardData(dashData);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoadingPlayers(false);
      }
    }
    fetchPlayers();
  }, []);

  const handleTeamReport = async () => {
    setGeneratingTeam(true);
    try {
      if (dashboardData) {
        generateTeamReport(dashboardData);
      } else {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          generateTeamReport(data);
        }
      }
    } catch (err) {
      console.error("Team report failed", err);
    } finally {
      setGeneratingTeam(false);
    }
  };

  const handlePlayerReport = async () => {
    if (!selectedPlayerId) return;
    setGeneratingPlayer(true);
    try {
      const res = await fetch(`/api/players/${selectedPlayerId}`);
      if (res.ok) {
        const data = await res.json();
        generatePlayerReport(data);
      }
    } catch (err) {
      console.error("Player report failed", err);
    } finally {
      setGeneratingPlayer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Reports Engine</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Generate and download performance reports in PDF format.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Report Card */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm flex flex-col hover:border-indigo-500/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-[#1a1a1a] border border-neutral-800 rounded-xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-indigo-400" />
            </div>
            <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Team Performance Summary</CardTitle>
            <CardDescription className="text-slate-500">
              A comprehensive view of squad readiness, rolling workloads, and positional averages from the last 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2 text-sm text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Squad Load Trends
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Positional HSR & Accel Averages
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Injury Risk Identification (ACWR)
              </li>
            </ul>

            {dashboardData?.teamLeaders && (
              <div className="mt-6 p-4 rounded-xl bg-[#1a1a1a] border border-neutral-800">
                 <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3 block">7-Day Team Leaders</h4>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-400 font-medium w-1/3">High Speed (m)</span>
                       <span className="text-sm font-bold text-white flex-1">{dashboardData.teamLeaders.hsr?.[0]?.name || '--'}</span>
                       <span className="text-xs font-bold text-indigo-400">{Math.round(dashboardData.teamLeaders.hsr?.[0]?.hsr || 0)}m</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-400 font-medium w-1/3">Accelerations</span>
                       <span className="text-sm font-bold text-white flex-1">{dashboardData.teamLeaders.accel?.[0]?.name || '--'}</span>
                       <span className="text-xs font-bold text-emerald-400">{Math.round(dashboardData.teamLeaders.accel?.[0]?.accel || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-400 font-medium w-1/3">Velocity (km/h)</span>
                       <span className="text-sm font-bold text-white flex-1">{dashboardData.teamLeaders.topSpeed?.[0]?.name || '--'}</span>
                       <span className="text-xs font-bold text-amber-400">{(dashboardData.teamLeaders.topSpeed?.[0]?.topSpeed7d || 0).toFixed(1)}</span>
                    </div>
                 </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-6 border-t border-neutral-800/50">
            <Button 
              className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800 text-indigo-400 hover:text-indigo-300 gap-2 h-11 uppercase font-bold tracking-widest text-[10px]"
              onClick={handleTeamReport}
              disabled={generatingTeam}
            >
              {generatingTeam ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileBarChart className="h-4 w-4" />
              )}
              Generate Team PDF
            </Button>
          </CardFooter>
        </Card>

        {/* Player Report Card */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm flex flex-col hover:border-emerald-500/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-[#1a1a1a] border border-neutral-800 rounded-xl flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-emerald-400" />
            </div>
            <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Individual Athlete Report</CardTitle>
            <CardDescription className="text-slate-500">
              Detailed longitudinal performance tracking and injury risk assessment for a specific player.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Select Player</label>
              <Select 
                value={selectedPlayerId} 
                onValueChange={setSelectedPlayerId}
                disabled={loadingPlayers}
              >
                <SelectTrigger className="w-full bg-[#1a1a1a] border-neutral-800 text-white">
                  <SelectValue placeholder={loadingPlayers ? "Loading roster..." : "Choose a player"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-neutral-800 text-slate-300">
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-[#222] focus:text-white">
                      {p.name} ({p.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="space-y-2 text-sm text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Session-by-session HSR & Speed trends
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Benchmarks vs Positional Norms
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Hamstring Injury Risk Predictor
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-6 border-t border-neutral-800/50">
            <Button 
              className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800 text-emerald-400 hover:text-emerald-300 gap-2 h-11 uppercase font-bold tracking-widest text-[10px]"
              disabled={!selectedPlayerId || generatingPlayer}
              onClick={handlePlayerReport}
            >
              {generatingPlayer ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Download Player PDF
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
