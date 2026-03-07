"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronRight, ActivitySquare } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from "recharts";
import { WellnessForm } from "@/components/ui/wellness-form";

export default function MyStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/my-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch your data");
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950 min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-400" />
          <p className="text-slate-400 font-medium animate-pulse text-sm tracking-widest uppercase">Initializing Vault...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-[#0a0a0a] min-h-screen">
        <div className="bg-[#111111] border border-rose-500/20 text-rose-400 p-8 rounded-2xl flex flex-col items-center text-center shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)]">
            <Shield className="h-12 w-12 mb-4 text-rose-500/80" />
            <h3 className="font-black text-xl mb-2 text-white tracking-tight uppercase">Access Denied</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 max-w-xs">{error || "Your account is not linked to a player profile. Contact the coaching staff."}</p>
        </div>
      </div>
    );
  }

  const { playerInfo, latestSession, loadTrend, comparison, weeklyTotals } = data;

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'OPTIMAL': return 'from-emerald-400 to-emerald-600 text-emerald-950 shadow-emerald-500/30';
          case 'HIGH': return 'from-rose-400 to-rose-600 text-rose-950 shadow-rose-500/30';
          default: return 'from-amber-400 to-amber-600 text-amber-950 shadow-amber-500/30';
      }
  };

  const getStatusText = (status: string) => {
      switch(status) {
          case 'OPTIMAL': return 'Prime Condition';
          case 'HIGH': return 'High Risk Zone';
          default: return 'Active/Monitoring';
      }
  }

  // Format Radar Data - Normalize to Percentages
  // Average is always 100%, Player is (Player / Average) * 100
  const getPct = (val: number, avg: number) => {
      if (avg === 0) return val > 0 ? 120 : 0;
      return Math.round((val / avg) * 100);
  };

  const radarData = comparison ? [
    { 
        metric: "Top Speed", 
        pctPlayer: getPct(comparison.playerTopSpeed, comparison.posAvgTopSpeed), 
        pctAvg: 100, 
        rawPlayer: comparison.playerTopSpeed,
        rawAvg: comparison.posAvgTopSpeed,
        unit: "km/h"
    },
    { 
        metric: "HSR", 
        pctPlayer: getPct(comparison.playerAvgHsr, comparison.posAvgHsr), 
        pctAvg: 100, 
        rawPlayer: comparison.playerAvgHsr,
        rawAvg: comparison.posAvgHsr,
        unit: "m"
    },
    { 
        metric: "Accels", 
        pctPlayer: getPct(comparison.playerAvgAccel, comparison.posAvgAccel), 
        pctAvg: 100, 
        rawPlayer: comparison.playerAvgAccel,
        rawAvg: comparison.posAvgAccel,
        unit: ""
    },
    { 
        metric: "Load", 
        pctPlayer: getPct(comparison.playerAvgLoad, comparison.posAvgLoad), 
        pctAvg: 100, 
        rawPlayer: comparison.playerAvgLoad,
        rawAvg: comparison.posAvgLoad,
        unit: "au"
    }
  ] : [];

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#131313] border border-[#262626] p-3 rounded-xl shadow-xl">
          <p className="text-white font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">{data.metric}</p>
          <div className="flex flex-col gap-1 text-xs">
             <div className="flex items-center justify-between gap-4">
                 <span className="flex items-center gap-1.5 text-indigo-400 font-bold tracking-widest uppercase text-[10px]">
                     <span className="w-2 h-2 rounded-full bg-indigo-500"></span>You
                 </span>
                 <span className="text-white font-bold">{data.rawPlayer} {data.unit}</span>
             </div>
             <div className="flex items-center justify-between gap-4">
                 <span className="flex items-center gap-1.5 text-slate-500 font-bold tracking-widest uppercase text-[10px]">
                     <span className="w-2 h-2 rounded-full bg-[#333]"></span>Pos Avg
                 </span>
                 <span className="text-slate-300 font-bold">{data.rawAvg} {data.unit}</span>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    const color = isPositive ? "text-emerald-400" : "text-rose-400";
    const bg = isPositive ? "bg-emerald-400/10" : "bg-rose-400/10";
    const Icon = isPositive ? TrendingUp : TrendingDown;
    if (value === 0) return null;
    return (
        <span className={`inline-flex items-center gap-1 ${color} ${bg} px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider`}>
            <Icon className="h-3 w-3" /> {Math.abs(value)}%
        </span>
    )
  }

  return (
    <div className="flex-1 bg-[#0a0a0a] min-h-screen text-slate-200 overflow-y-auto w-full pb-24 md:p-8">
      {/* Dynamic Header / Hero Area */}
      <div className="relative pt-12 pb-8 px-6 overflow-hidden rounded-b-[2.5rem] bg-[#111111] border-b border-neutral-800 shadow-xl">
         <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
         
         <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <p className="text-indigo-400 text-[10px] font-bold tracking-widest uppercase mb-1">{playerInfo.position}</p>
                   <h1 className="text-3xl font-black text-white tracking-tight uppercase">{playerInfo.name?.split(' ')[0]}</h1>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getStatusColor(playerInfo.status)} shadow-lg`}>
                  {getStatusText(playerInfo.status)}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-transform group-hover:scale-150" />
                     <Zap className="h-5 w-5 text-amber-500 mb-2 relative z-10" />
                     <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest relative z-10">Top Speed</div>
                     <div className="text-2xl font-black text-white mt-1 relative z-10">{latestSession?.topSpeed?.toFixed(1) || '0.0'}<span className="text-sm font-medium text-slate-600 ml-1">km/h</span></div>
                </div>
                <div className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                     <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-4 -mt-4 transition-transform group-hover:scale-150" />
                     <Target className="h-5 w-5 text-emerald-500 mb-2 relative z-10" />
                     <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest relative z-10">Latest HSR</div>
                     <div className="text-2xl font-black text-white mt-1 relative z-10">{Math.round(latestSession?.hsr || 0)}<span className="text-sm font-medium text-slate-600 ml-1">m</span></div>
                </div>
             </div>
         </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto -mt-4 relative z-20">
        
        {/* Daily Wellness Check-in */}
        <WellnessForm />

        {/* Weekly Progress Overview */}
        {weeklyTotals && (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-colors cursor-default">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg">
                        <ActivitySquare className="h-4 w-4 text-indigo-400" />
                    </div>
                    <TrendIndicator value={weeklyTotals.hsrTrend} />
                </div>
                <div>
                   <div className="text-lg font-bold text-white tracking-tight">{Math.round(weeklyTotals.hsr)} <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">meters</span></div>
                   <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Weekly HSR</div>
                </div>
            </div>

            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-colors cursor-default">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg">
                        <Activity className="h-4 w-4 text-indigo-400" />
                    </div>
                    <TrendIndicator value={weeklyTotals.loadTrend} />
                </div>
                <div>
                   <div className="text-lg font-bold text-white tracking-tight">{Math.round(weeklyTotals.load)} <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">au</span></div>
                   <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Weekly Load</div>
                </div>
            </div>
        </div>
        )}

        {/* Athletic DNA */}
        <Card className="bg-[#111111] overflow-hidden border-neutral-800 shadow-sm rounded-2xl">
          <CardHeader className="pb-0 px-5 pt-5 flex flex-row items-center justify-between border-b border-neutral-800/60 pb-4">
            <div>
               <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Athletic DNA</CardTitle>
               <CardDescription className="text-slate-500">Your metrics vs Position Averages</CardDescription>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {radarData.length > 0 ? (
               <div className="h-[280px] w-full mt-4 pb-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                     <PolarGrid stroke="#262626" strokeDasharray="3 3" />
                     <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                     <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                     <Radar name="Pos. Avg" dataKey="pctAvg" stroke="#262626" strokeWidth={2} strokeDasharray="4 4" fill="#1a1a1a" fillOpacity={0.5} />
                     <Radar name="You" dataKey="pctPlayer" stroke="#818cf8" strokeWidth={3} fill="#818cf8" fillOpacity={0.4} />
                     <RechartsTooltip content={<CustomRadarTooltip /> as any} cursor={false} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
            ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-500 p-8 text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold border border-dashed border-neutral-800 bg-[#0a0a0a] rounded-xl p-4 w-full text-slate-600">Need more positional data to generate your DNA strand.</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Load Trend */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm rounded-2xl">
          <CardHeader className="pb-0 px-5 pt-5 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-sm uppercase tracking-widest font-bold text-white">Timeline</CardTitle>
               <CardDescription className="text-slate-500">7-Day Load Progression</CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </CardHeader>
          <CardContent className="p-4 pt-6">
            {loadTrend && loadTrend.length > 0 ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={loadTrend} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPersonalLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}`, 'Load']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="load" 
                      stroke="#818cf8" 
                      strokeWidth={3} 
                      fill="url(#colorPersonalLoad)" 
                      activeDot={{ r: 6, fill: "#818cf8", stroke: "#131313", strokeWidth: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center bg-[#0a0a0a] rounded-xl border border-dashed border-neutral-800 m-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600 text-center">No timeline data available</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
