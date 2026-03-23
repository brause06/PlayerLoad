"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Users, TrendingUp, Zap, Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"volume" | "max">("volume");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Team Dashboard</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Analyze team performance, workloads, and risks at a glance.</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#111111] border-neutral-800 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Active Players</CardTitle>
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? "..." : data?.totalPlayers || 0}</div>
            <p className="text-xs text-slate-600 font-medium mt-1">Synced roster members</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-neutral-800 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Weekly Distance</CardTitle>
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? "..." : data?.distanceKm || 0} <span className="text-sm font-normal text-slate-500">km</span></div>
            <p className="text-xs text-slate-600 font-medium mt-1">7-day team aggregate</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-neutral-800 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Peak Velocity</CardTitle>
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {loading || !data?.topSpeeds?.length ? "..." : (data.topSpeeds[0].top_speed_max ?? 0).toFixed(1)} 
              <span className="text-sm font-normal text-slate-500"> km/h</span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
               {loading || !data?.topSpeeds?.length ? "No data" : `By ${data.topSpeeds[0].name.split(' ')[0]}`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-neutral-800 shadow-sm transition-shadow hover:shadow-md group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-slate-500 group-hover:text-rose-500 transition-colors">High Risk (ACWR)</CardTitle>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${data?.highRiskPlayers > 0 ? 'bg-rose-500/10' : 'bg-slate-800/50'}`}>
              <AlertTriangle className={`h-4 w-4 ${data?.highRiskPlayers > 0 ? 'text-rose-500' : 'text-slate-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.highRiskPlayers > 0 ? 'text-rose-500' : 'text-white'}`}>
              {loading ? "..." : data?.highRiskPlayers || 0}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">Players with ACWR &gt; 1.5</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-4 animate-in slide-in-from-bottom-4 duration-500 fade-in">
        <Card className="lg:col-span-3 bg-[#111111] shadow-sm border-neutral-800 overflow-hidden">
          <CardHeader className="pb-0 border-b border-neutral-800/50">
            <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Team Average Load Trend</CardTitle>
            <CardDescription className="text-slate-500">Average Player Load across the last 7 sessions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              </div>
            ) : data?.totalPlayers === 0 ? (
               <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-3xl bg-[#0d0d0d]">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                    <Activity className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Bienvenido a RugbyLoad</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-[280px]">Parece que aún no hay datos. Empecemos configurando tu equipo.</p>
                  <div className="flex gap-4 mt-8">
                    <a href="/import" className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all">Importar GPS</a>
                    <a href="/players" className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800 text-slate-300 rounded-full text-xs font-black uppercase tracking-widest transition-all">Ver Plantel</a>
                  </div>
               </div>
            ) : data?.loadTrend && data.loadTrend.length > 0 ? (
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.loadTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 12, fill: '#94a3b8'}} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => {
                        // Force local timezone to avoid 1-day offset
                        const date = new Date(value + 'T00:00:00');
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                      itemStyle={{ color: '#818cf8' }}
                      formatter={(value: any) => [`${value} Load`, 'Avg Team Load']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgLoad" 
                      stroke="#818cf8" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorLoad)" 
                      activeDot={{ r: 6, fill: "#818cf8", stroke: "#131313", strokeWidth: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <div className="text-center">
                   <Activity className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                   <p className="font-medium text-slate-500">No session data to display</p>
                   <p className="text-xs text-slate-400 mt-1">Import a GPS file to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        
      <div className="grid gap-6 md:grid-cols-3 mt-6 animate-in slide-in-from-bottom-6 duration-500 fade-in">
        <Card className="bg-[#111111] shadow-sm border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Match vs Training: HSR</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-12 bg-indigo-500/10 rounded" />
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-white">{data?.matchVsTraining?.match?.hsr || 0} <span className="text-sm font-normal text-slate-500">m</span></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Match Avg</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-slate-400">{data?.matchVsTraining?.training?.hsr || 0} <span className="text-sm font-normal text-slate-500">m</span></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Training Avg</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111111] shadow-sm border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Match vs Training: Accel</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-12 bg-emerald-500/10 rounded" />
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-white">{data?.matchVsTraining?.match?.accel || 0}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Match Avg</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-slate-400">{data?.matchVsTraining?.training?.accel || 0}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Training Avg</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111111] shadow-sm border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Match vs Training: Load</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-12 bg-purple-500/10 rounded" />
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-white">{data?.matchVsTraining?.match?.load || 0}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Match Avg</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-slate-400">{data?.matchVsTraining?.training?.load || 0}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">Training Avg</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* ZONE 3: Global Speed Tracking */}
      <div className="mt-8 mb-4 border-t border-neutral-800 pt-8">
        <h3 className="text-lg uppercase tracking-widest font-bold text-white mb-3">Global Speed Tracking</h3>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">Overall team velocity records regardless of position.</p>
        <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-bottom-6 duration-500 fade-in">
          {/* Weekly Fast Speeds */}
          <Card className="bg-[#111111] shadow-sm border-neutral-800 flex flex-col">
            <CardHeader className="pb-4 border-b border-neutral-800">
              <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2 text-white">
                <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" /> 
                Top Speeds (Last 7 Days)
              </CardTitle>
              <CardDescription className="text-slate-500">Fastest speeds hit this week</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {loading ? (
                <div className="p-6 flex justify-center">
                   <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-amber-500" />
                </div>
              ) : data?.weeklyTopSpeeds && data.weeklyTopSpeeds.length > 0 ? (
                <div className="divide-y divide-neutral-800">
                  {data.weeklyTopSpeeds.map((player: any, i: number) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors cursor-help"
                      title={player.sessionDate ? `Alcanzado el ${new Date(player.sessionDate).toLocaleDateString()} en ${player.sessionType}` : 'Sesión desconocida'}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-amber-500 text-white shadow-sm' : i === 1 ? 'bg-amber-500/20 text-amber-500' : i === 2 ? 'bg-amber-500/10 text-amber-400' : 'bg-[#222] text-slate-500'}`}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">{player.name}</div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{player.position}</div>
                        </div>
                      </div>
                      <div className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-sm tabular-nums">
                        {(player.top_speed_max ?? 0).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                   <p className="text-[10px] uppercase tracking-widest font-bold text-slate-600">No high speeds recorded this week</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Time Fast Speeds */}
          <Card className="bg-[#111111] shadow-sm border-neutral-800 flex flex-col">
            <CardHeader className="pb-4 border-b border-neutral-800">
              <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2 text-white">
                Top Speeds (All-Time)
              </CardTitle>
              <CardDescription className="text-slate-500">All-time velocity leaderboard</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {loading ? (
                <div className="p-6 flex justify-center">
                   <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-600" />
                </div>
              ) : data?.topSpeeds && data.topSpeeds.length > 0 ? (
                <div className="divide-y divide-neutral-800">
                  {data.topSpeeds.map((player: any, i: number) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors cursor-help"
                      title={player.sessionDate ? `Alcanzado el ${new Date(player.sessionDate).toLocaleDateString()} en ${player.sessionType}` : 'Sesión desconocida'}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-[#222] text-slate-400`}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-slate-200">{player.name}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{player.position}</div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-300 px-3 py-1 rounded-full text-sm tabular-nums">
                        {(player.top_speed_max ?? 0).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">No speeds recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ZONE 4: Positional Deep Dive */}

      {/* POSITIONAL LEADERSHIP TABS & VIEW TOGGLE */}
      <div className="mt-8 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <h3 className="text-lg uppercase tracking-widest font-bold text-white">Positional Rankings</h3>
              
              <div className="flex bg-[#131313] p-1 rounded-full border border-neutral-800 w-fit">
                  <button 
                     onClick={() => setViewMode("volume")}
                     className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "volume" ? 'bg-[#222] text-indigo-400 shadow-sm border border-neutral-700' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      Weekly Volume
                  </button>
                  <button 
                     onClick={() => setViewMode("max")}
                     className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === "max" ? 'bg-[#222] text-indigo-400 shadow-sm border border-neutral-700' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      Single Best Session
                  </button>
              </div>
          </div>
          
          <div className="flex overflow-x-auto pb-2 gap-2 snap-x scrollbar-hide">
              <button 
                 onClick={() => setSelectedPosition("All")}
                 className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${selectedPosition === "All" ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-105' : 'bg-[#111111] border border-neutral-800 text-slate-400 hover:bg-[#1a1a1a]'}`}
              >
                  All Positions
              </button>
              {data?.positionalAverages && data.positionalAverages.map((posStat: any) => (
                  <button 
                     key={posStat.position}
                     onClick={() => setSelectedPosition(posStat.position)}
                     className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all snap-start ${selectedPosition === posStat.position ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-105' : 'bg-[#111111] border border-neutral-800 text-slate-400 hover:bg-[#1a1a1a]'}`}
                  >
                      {posStat.position}
                  </button>
              ))}
          </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mt-2 animate-in slide-in-from-bottom-8 duration-500 fade-in">
        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Positional Averages: High Speed Running</CardTitle>
            <CardDescription className="text-slate-500">Average HSR (meters) per position over last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.positionalAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="position" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      cursor={{fill: '#1a1a1a'}}
                      formatter={(value: any) => [`${value}m`, 'Avg HSR']}
                    />
                    <Bar dataKey="avgHsr" name="Avg HSR" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No positional data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader className="pb-4 border-b border-neutral-800">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
              <Medal className="h-5 w-5 text-indigo-500" />
              Leadership: HSR {selectedPosition !== "All" && <span className="text-indigo-400">({selectedPosition})</span>}
            </CardTitle>
            <CardDescription className="text-slate-500">
                {viewMode === "volume" 
                    ? "Players with highest HSR volume (Sum) across all recent sessions" 
                    : "Highest single-session HSR performance (Max) over the last week"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                 <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="space-y-6 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {data.positionalAverages
                  .filter((p: any) => selectedPosition === "All" || p.position === selectedPosition)
                  .map((posStat: any) => {
                      const listToUse = viewMode === "volume" ? posStat.topHsr : posStat.topHsrMax;
                      const valKey = viewMode === "volume" ? "hsr" : "hsrMax";
                      
                      return (
                      <div key={posStat.position}>
                        {selectedPosition === "All" && <h4 className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-3 pb-1 border-b border-neutral-800/60">{posStat.position}</h4>}
                        <div className="space-y-2">
                          {listToUse.slice(0, 3).map((player: any, idx: number) => (
                            <div key={player.name} className="flex items-center justify-between text-sm hover:bg-[#1a1a1a] p-1.5 -mx-1.5 rounded-md transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-[#222] text-slate-500'}`}>
                                  {idx + 1}
                                </span>
                                <span className="text-slate-200 font-medium">{player.name}</span>
                              </div>
                              <span className="font-bold text-white tabular-nums bg-[#1a1a1a] px-2 py-0.5 rounded border border-neutral-800">{Math.round(player[valKey])}m</span>
                            </div>
                          ))}
                          {listToUse.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">No players found {selectedPosition !== "All" ? 'for this position' : ''}</div>}
                        </div>
                      </div>
                      )
                  })}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No leaderboard data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6 animate-in slide-in-from-bottom-12 duration-700 fade-in">
        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Positional Averages: Accelerations</CardTitle>
            <CardDescription className="text-slate-500">Average accelerations per position over last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.positionalAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="position" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                      itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      cursor={{fill: '#1a1a1a'}}
                      formatter={(value: any) => [`${value}`, 'Avg Accelerations']}
                    />
                    <Bar dataKey="avgAccel" name="Avg Accelerations" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No positional data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader className="pb-4 border-b border-neutral-800">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-emerald-500" />
              Leadership: Accelerations {selectedPosition !== "All" && <span className="text-emerald-400">({selectedPosition})</span>}
            </CardTitle>
            <CardDescription className="text-slate-500">
                {viewMode === "volume" 
                    ? "Players with the highest volume of accelerations (Sum) in the last week" 
                    : "Highest accelerations performed in a single session (Max) in the last week"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                 <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="space-y-6 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {data.positionalAverages
                  .filter((p: any) => selectedPosition === "All" || p.position === selectedPosition)
                  .map((posStat: any) => {
                      const listToUse = viewMode === "volume" ? posStat.topAccel : posStat.topAccelMax;
                      const valKey = viewMode === "volume" ? "accel" : "accelMax";
                      
                      return (
                      <div key={`accel-${posStat.position}`}>
                        {selectedPosition === "All" && <h4 className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 mb-3 pb-1 border-b border-neutral-800/60">{posStat.position}</h4>}
                        <div className="space-y-2">
                          {listToUse.slice(0, 3).map((player: any, idx: number) => (
                            <div key={player.name} className="flex items-center justify-between text-sm hover:bg-[#1a1a1a] p-1.5 -mx-1.5 rounded-md transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#222] text-slate-500'}`}>
                                  {idx + 1}
                                </span>
                                <span className="text-slate-200 font-medium">{player.name}</span>
                              </div>
                              <span className="font-bold text-white tabular-nums bg-[#1a1a1a] px-2 py-0.5 rounded border border-neutral-800">{Math.round(player[valKey])}</span>
                            </div>
                          ))}
                          {listToUse.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">No players found {selectedPosition !== "All" ? 'for this position' : ''}</div>}
                        </div>
                      </div>
                      )
                  })}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No leaderboard data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6 animate-in slide-in-from-bottom-12 duration-700 fade-in">
        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader className="pb-4 border-b border-neutral-800">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500/20" />
              Leadership: Top Speed (7 Days) {selectedPosition !== "All" && <span className="text-amber-500">({selectedPosition})</span>}
            </CardTitle>
            <CardDescription className="text-slate-500">Top 3 fastest players in the last week by position</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                 <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-amber-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="space-y-6 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {data.positionalAverages
                  .filter((p: any) => selectedPosition === "All" || p.position === selectedPosition)
                  .map((posStat: any) => (
                  <div key={`speed7d-${posStat.position}`}>
                    {selectedPosition === "All" && <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-500 mb-3 pb-1 border-b border-neutral-800/60">{posStat.position}</h4>}
                    <div className="space-y-2">
                      {posStat.topSpeed7d.slice(0, 3).map((player: any, idx: number) => (
                        <div key={player.name} className="flex items-center justify-between text-sm hover:bg-[#1a1a1a] p-1.5 -mx-1.5 rounded-md transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[#222] text-slate-500'}`}>
                              {idx + 1}
                            </span>
                            <span className="text-slate-200 font-medium">{player.name}</span>
                          </div>
                          <span className="font-bold text-amber-400 tabular-nums bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{Number(player.topSpeed7d).toFixed(1)} <span className="text-[10px] font-bold uppercase">km/h</span></span>
                        </div>
                      ))}
                      {posStat.topSpeed7d.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">No speeds recorded</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader className="pb-4 border-b border-neutral-800">
            <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-slate-400" />
              Leadership: Top Speed (All-Time) {selectedPosition !== "All" && <span className="text-slate-400">({selectedPosition})</span>}
            </CardTitle>
            <CardDescription className="text-slate-500">All-time positional speed records</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-[250px] flex items-center justify-center">
                 <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-500" />
              </div>
            ) : data?.positionalAverages && data.positionalAverages.length > 0 ? (
              <div className="space-y-6 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {data.positionalAverages
                  .filter((p: any) => selectedPosition === "All" || p.position === selectedPosition)
                  .map((posStat: any) => (
                  <div key={`speedall-${posStat.position}`}>
                    {selectedPosition === "All" && <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 pb-1 border-b border-neutral-800/60">{posStat.position}</h4>}
                    <div className="space-y-2">
                      {posStat.topSpeedAllTime.slice(0, 3).map((player: any, idx: number) => (
                        <div key={player.name} className="flex items-center justify-between text-sm hover:bg-[#1a1a1a] p-1.5 -mx-1.5 rounded-md transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#222] text-slate-400`}>
                              {idx + 1}
                            </span>
                            <span className="text-slate-200 font-medium">{player.name}</span>
                          </div>
                          <span className="font-bold text-slate-300 tabular-nums bg-[#1a1a1a] px-2 py-0.5 rounded border border-neutral-800">{Number(player.speed).toFixed(1)} <span className="text-[10px] font-bold uppercase">km/h</span></span>
                        </div>
                      ))}
                      {posStat.topSpeedAllTime.length === 0 && <div className="text-[10px] uppercase font-bold tracking-widest text-slate-600">No speeds recorded</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
             <div className="h-[250px] flex items-center justify-center text-slate-600 border border-dashed border-neutral-800 rounded-xl bg-[#0a0a0a]">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
