"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, User, Activity, AlertTriangle, TrendingUp, Zap, Camera, Save, X, Edit2, Calendar, Shield, HeartPulse, Droplet, Phone, Ruler, Scale, Briefcase, Moon, Flame, Brain, Thermometer, ShieldCheck, Mail, Key } from "lucide-react";
import { useSession } from "next-auth/react";
import { PainMap } from "@/components/ui/pain-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "performance";
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  // Account management state
  const [accountStatus, setAccountStatus] = useState<{ hasAccount: boolean; email: string | null } | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    age: "",
    weight: "",
    height: "",
    dob: "",
    blood_type: "",
    team: "",
    contract_end: "",
    status: "",
    injury_history: "",
    emergency_contact: ""
  });

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const res = await fetch(`/api/players/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPlayer(data);
        }
      } catch (err) {
        console.error("Failed to load player", err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchPlayer();
    }
  }, [params.id]);

  useEffect(() => {
    async function fetchAccountStatus() {
      if (!isAdmin) return;
      setAccountLoading(true);
      try {
        const res = await fetch(`/api/players/${params.id}/account`);
        if (res.ok) {
          const data = await res.json();
          setAccountStatus(data);
          setAccountEmail(data.email || "");
        }
      } catch (err) {
        console.error("Failed to load account status", err);
      } finally {
        setAccountLoading(false);
      }
    }
    if (params.id && isAdmin) {
      fetchAccountStatus();
    }
  }, [params.id, isAdmin]);

  const handleCreateAccount = async () => {
    if (!accountEmail || !accountEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    setAccountSaving(true);
    try {
      const res = await fetch(`/api/players/${params.id}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccountStatus({ hasAccount: true, email: accountEmail });
        alert(data.message || "Account managed successfully.");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to manage account.");
      }
    } catch (err) {
      alert("Network error occurred.");
    } finally {
      setAccountSaving(false);
    }
  };

  useEffect(() => {
    if (player) {
      setFormData({
        age: player.age?.toString() || "",
        weight: player.weight?.toString() || "",
        height: player.height?.toString() || "",
        dob: player.dob ? player.dob.split('T')[0] : "",
        blood_type: player.blood_type || "",
        team: player.team || "",
        contract_end: player.contract_end ? player.contract_end.split('T')[0] : "",
        status: player.status || "ACTIVE",
        injury_history: player.injury_history || "",
        emergency_contact: player.emergency_contact || ""
      });
    }
  }, [player]);

  const handleSave = async () => {
    console.log("Attempting to save player data:", formData);
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/players/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const updated = await res.json();
        console.log("Successfully updated player:", updated);
        setPlayer({ ...player, ...updated });
        setIsEditing(false);
      } else {
        const errorText = await res.text();
        console.error("Server returned error:", res.status, errorText);
        let errorMessage = "Failed to save changes.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {}
        alert(`Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Network or catch-all error:", err);
      alert("A network error occurred while saving.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const uploadingData = new FormData();
    uploadingData.append("file", file);

    try {
      const res = await fetch(`/api/players/${params.id}/upload`, {
        method: "POST",
        body: uploadingData,
      });
      if (res.ok) {
        const updated = await res.json();
        setPlayer({ ...player, imageUrl: updated.imageUrl });
      }
    } catch (err) {
      console.error("Failed to upload image", err);
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Player not found</h2>
        <Button onClick={() => router.push("/players")} className="mt-4">Back to Roster</Button>
      </div>
    );
  }

  const { loadTrend, comparison, injuryRisk } = player;

  const radarData = comparison ? [
    { metric: "HSR", Player: Math.round((comparison.playerAvgHsr / Math.max(comparison.posAvgHsr, 1)) * 100), "Pos Avg": 100, fullMark: 150 },
    { metric: "Accelerations", Player: Math.round((comparison.playerAvgAccel / Math.max(comparison.posAvgAccel, 1)) * 100), "Pos Avg": 100, fullMark: 150 },
    { metric: "Load", Player: Math.round((comparison.playerAvgLoad / Math.max(comparison.posAvgLoad, 1)) * 100), "Pos Avg": 100, fullMark: 150 },
    { metric: "Top Speed", Player: Math.round((comparison.playerTopSpeed / Math.max(comparison.posAvgTopSpeed, 1)) * 100), "Pos Avg": 100, fullMark: 150 }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/players")} className="bg-[#1a1a1a] border-neutral-800 text-slate-400 hover:bg-[#222] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className={`w-16 h-16 rounded-full border-2 border-neutral-800 bg-[#111111] overflow-hidden flex items-center justify-center shrink-0 ${uploadLoading ? 'opacity-50' : ''}`}>
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-neutral-600" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              <Camera className="h-5 w-5 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploadLoading} />
            </label>
            {uploadLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                {player.name}
              </h1>
              <Badge className={`uppercase text-[10px] font-bold tracking-widest px-3 py-0.5 border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                player.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10' :
                player.status === 'INJURED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/10' :
                'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10'
              }`}>
                {player.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-[#222] text-slate-400 px-3 py-1 rounded border border-neutral-800">
                {player.position}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1 rounded border border-amber-500/20">
                Vmax Tracker: {player.top_speed_max} km/h
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="mt-6 w-full">
        <TabsList className="bg-[#1a1a1a] border border-neutral-800 mb-6 rounded-lg p-1">
          <TabsTrigger value="performance" className="text-xs uppercase tracking-widest font-bold data-[state=active]:bg-[#262626] data-[state=active]:text-white text-slate-400">
            Performance
          </TabsTrigger>
          <TabsTrigger value="wellness" className="text-xs uppercase tracking-widest font-bold data-[state=active]:bg-[#262626] data-[state=active]:text-white text-slate-400">
            Wellness
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs uppercase tracking-widest font-bold data-[state=active]:bg-[#262626] data-[state=active]:text-white text-slate-400">
            Profile details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {injuryRisk.riskLevel !== "LOW" && (
            <div className={`p-4 rounded-xl border flex items-start gap-4 animate-in slide-in-from-top-4 ${injuryRisk.riskLevel === "HIGH" ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
               <AlertTriangle className={`w-6 h-6 mt-1 flex-shrink-0 ${injuryRisk.riskLevel === "HIGH" ? 'text-rose-500' : 'text-amber-500'}`} />
               <div>
                  <h3 className={`font-bold uppercase tracking-widest text-xs ${injuryRisk.riskLevel === "HIGH" ? 'text-rose-400' : 'text-amber-400'}`}>
                    {injuryRisk.riskLevel === 'HIGH' ? 'High' : 'Moderate'} Injury Risk Detected (Hamstrings)
                  </h3>
                  <p className={`text-sm mt-1 ${injuryRisk.riskLevel === "HIGH" ? 'text-rose-400/80' : 'text-amber-400/80'}`}>
                     This player has not reached &gt;= 90% of their absolute Max Speed ({injuryRisk.thresholdSpeed.toFixed(1)} km/h) in 
                     <strong className="text-white"> {injuryRisk.sessionsSince} consecutive sessions </strong>  
                     (last {injuryRisk.daysSince} days). Research indicates increased hamstring strain risk of occurring. Consider sprint exposure protocols in the next training block.
                  </p>
               </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Load Trend */}
            <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Accumulated Player Load</CardTitle>
                <CardDescription className="text-slate-500">Internal vs External load trajectory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={loadTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPlayerLoad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} tickLine={false} axisLine={false} 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0(dashboard)/import/page.tsx) 0 0 / 0.5)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                          itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="load" name="Player Load" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPlayerLoad)" activeDot={{ r: 6 }} />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Session-by-session HSR and Top Speed Trend */}
            <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Session Performance History</CardTitle>
                <CardDescription className="text-slate-500">HSR and Top Speed across all tracked sessions — compare the player against himself</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={loadTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} tickLine={false} axisLine={false} 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="hsr" name="HSR (m)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="topSpeed" name="Top Speed (km/h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Athletic DNA (Radar) & Positional Comparisons */}
            <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Athletic DNA vs Positional Baseline</CardTitle>
                <CardDescription className="text-slate-500">Comparing player metrics against the average {comparison.position} (normalized to 100%)</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="h-[320px] lg:col-span-1 flex items-center justify-center bg-[#151515] rounded-xl border border-neutral-800">
                       <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                             <PolarGrid stroke="#262626" />
                             <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                             <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fill: '#475569', fontSize: 10 }} />
                             <Radar name="Positional Avg" dataKey="Pos Avg" stroke="#262626" fill="#1a1a1a" fillOpacity={0.6} strokeWidth={2} strokeDasharray="4 4"/>
                             <Radar name={player.name} dataKey="Player" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} strokeWidth={3} />
                             <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                             <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626' }} />
                          </RadarChart>
                       </ResponsiveContainer>
                    </div>
                    
                    <div className="lg:col-span-2 flex flex-col justify-center gap-6">
                      {/* HSR */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <div>
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">HSR: Player Avg</div>
                             <div className="text-2xl font-black text-indigo-500">{comparison.playerAvgHsr}m</div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">{comparison.position} Avg</div>
                             <div className="text-xl font-bold text-slate-400">{comparison.posAvgHsr}m</div>
                          </div>
                        </div>
                        <div className="h-6 w-full bg-[#1a1a1a] border border-neutral-800 rounded flex items-center overflow-hidden">
                           <div className="h-full bg-indigo-500" style={{ width: `${Math.min((comparison.playerAvgHsr / Math.max(comparison.posAvgHsr, 1)) * 100, 100)}%`}}></div>
                        </div>
                      </div>
                      
                      {/* Accelerations */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <div>
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Accelerations: Player Avg</div>
                             <div className="text-2xl font-black text-emerald-500">{comparison.playerAvgAccel}</div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">{comparison.position} Avg</div>
                             <div className="text-xl font-bold text-slate-400">{comparison.posAvgAccel}</div>
                          </div>
                        </div>
                        <div className="h-6 w-full bg-[#1a1a1a] border border-neutral-800 rounded flex items-center overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{ width: `${Math.min((comparison.playerAvgAccel / Math.max(comparison.posAvgAccel, 1)) * 100, 100)}%`}}></div>
                        </div>
                      </div>

                      {/* Load */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <div>
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Player Load: Avg</div>
                             <div className="text-2xl font-black text-amber-500">{comparison.playerAvgLoad}</div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">{comparison.position} Avg</div>
                             <div className="text-xl font-bold text-slate-400">{comparison.posAvgLoad}</div>
                          </div>
                        </div>
                        <div className="h-6 w-full bg-[#1a1a1a] border border-neutral-800 rounded flex items-center overflow-hidden">
                           <div className="h-full bg-amber-500" style={{ width: `${Math.min((comparison.playerAvgLoad / Math.max(comparison.posAvgLoad, 1)) * 100, 100)}%`}}></div>
                        </div>
                      </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="wellness" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Wellness Trends */}
            <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Wellness Trends</CardTitle>
                    <CardDescription className="text-slate-500">Last 30 days evolution</CardDescription>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sleep</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Energy</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fatigue</span>
                     </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...(player.wellnessHistory || [])].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} tickLine={false} axisLine={false} 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                          labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                        />
                        <Line type="monotone" dataKey="sleep" name="Sleep Quality" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="energy" name="Energy" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pain Map & Latest Report */}
            <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-white font-bold uppercase tracking-widest text-sm text-center">Current Pain Map & Daily Snapshot</CardTitle>
                <CardDescription className="text-slate-500 text-center">Based on the most recent wellness entry</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-[#0a0a0a] rounded-3xl p-6 border border-neutral-800/50">
                      <PainMap 
                        jointPainMap={player.latestWellness?.jointPainMap || {}} 
                        musclePainMap={player.latestWellness?.musclePainMap || []} 
                      />
                   </div>

                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-800/60">
                          <div className="flex items-center gap-3 mb-2">
                             <Moon className="w-4 h-4 text-indigo-400" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sleep Hours</span>
                          </div>
                          <div className="text-2xl font-black text-white">{player.latestWellness?.sleepHours || "--"} <span className="text-xs font-bold text-slate-500 uppercase">hrs</span></div>
                        </div>
                        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-neutral-800/60">
                          <div className="flex items-center gap-3 mb-2">
                             <Thermometer className="w-4 h-4 text-rose-400" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fatigue Intensity</span>
                          </div>
                          <div className="text-2xl font-black text-white">{player.latestWellness?.fatigue || "--"}/10</div>
                        </div>
                      </div>

                      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-neutral-800/60 h-full">
                         <div className="flex items-center gap-3 mb-4">
                            <Brain className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Athlete Comments</span>
                         </div>
                         <p className="text-sm text-slate-300 italic leading-relaxed">
                            "{player.latestWellness?.comments || "No comments provided in the last entry."}"
                         </p>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-end gap-2 mb-2">
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-[#111111] border-neutral-800 text-slate-400 hover:text-white hover:bg-[#1a1a1a] border h-9"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-2" />
                  Edit Athlete Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsEditing(false)}
                    disabled={saveLoading}
                    className="text-slate-500 hover:text-slate-400"
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="bg-indigo-600 text-white border-none hover:bg-indigo-500 h-9 font-bold tracking-wide"
                  >
                    {saveLoading ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-2" />
                    )}
                    Commit Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
               {/* 1. Biometrics Card */}
               <Card className="bg-[#111111] border-neutral-800 overflow-hidden relative group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                 <CardHeader className="pb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Scale className="h-4 w-4 text-indigo-400" />
                      </div>
                      <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Biometrics</CardTitle>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Height (cm)</span>
                        {isEditing ? (
                          <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold placeholder:text-neutral-700" type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} />
                        ) : (
                          <div className="flex items-end gap-1">
                            <span className="text-xl font-bold text-white tracking-tighter">{player.height || "--"}</span>
                            <span className="text-[10px] text-slate-500 pb-1 font-bold">cm</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Weight (kg)</span>
                        {isEditing ? (
                          <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold placeholder:text-neutral-700" type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
                        ) : (
                          <div className="flex items-end gap-1">
                            <span className="text-xl font-bold text-white tracking-tighter">{player.weight || "--"}</span>
                            <span className="text-[10px] text-slate-500 pb-1 font-bold">kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Age</span>
                         {isEditing ? (
                           <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold placeholder:text-neutral-700" type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                         ) : (
                           <span className="text-sm font-bold text-slate-200">{player.age || "--"} years</span>
                         )}
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Blood Type</span>
                         {isEditing ? (
                           <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold placeholder:text-neutral-700" value={formData.blood_type} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })} />
                         ) : (
                           <Badge variant="outline" className="bg-[#1a1a1a] border-neutral-800 text-slate-300 font-bold">{player.blood_type || "N/A"}</Badge>
                         )}
                       </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/50">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Date of Birth</span>
                       {isEditing ? (
                         <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                       ) : (
                         <span className="text-sm font-medium text-slate-300">
                           {player.dob ? format(new Date(player.dob), "PPP") : "Not Set"}
                         </span>
                       )}
                    </div>
                 </CardContent>
               </Card>

               {/* 2. Identity & Contract Card */}
               <Card className="bg-[#111111] border-neutral-800 overflow-hidden relative group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                 <CardHeader className="pb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Briefcase className="h-4 w-4 text-emerald-400" />
                      </div>
                      <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Professional</CardTitle>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-1">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Primary Team</span>
                       {isEditing ? (
                         <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })} />
                       ) : (
                         <span className="text-lg font-bold text-white tracking-wide uppercase">{player.team || "Independent"}</span>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">GPS Ident</span>
                         <span className="text-sm font-mono font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block">{player.gps_id}</span>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Status</span>
                         {isEditing ? (
                           <select 
                             className="w-full h-8 bg-neutral-900 border border-neutral-800 rounded px-2 text-[10px] uppercase font-bold text-white focus:outline-none focus:border-emerald-500"
                             value={formData.status}
                             onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                           >
                             <option value="ACTIVE" className="bg-neutral-900">ACTIVE</option>
                             <option value="MODIFIED" className="bg-neutral-900">MODIFIED</option>
                             <option value="INJURED" className="bg-neutral-900">INJURED</option>
                             <option value="REST" className="bg-neutral-900">REST</option>
                           </select>
                         ) : (
                           <span className="text-xs font-bold text-slate-200">{player.status}</span>
                         )}
                       </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/50">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Contract End Date</span>
                       {isEditing ? (
                         <Input className="h-8 bg-neutral-900 border-neutral-800 text-xs text-white font-bold" type="date" value={formData.contract_end} onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })} />
                       ) : (
                         <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-300">
                              {player.contract_end ? format(new Date(player.contract_end), "PPP") : "No Date Recorded"}
                            </span>
                         </div>
                       )}
                    </div>
                 </CardContent>
               </Card>

               {/* 3. Safety & Health Snapshot */}
               <Card className="bg-[#111111] border-neutral-800 overflow-hidden relative group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-20 transition-opacity"></div>
                 <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-rose-500/10 rounded-lg">
                         <Shield className="h-4 w-4 text-rose-400" />
                       </div>
                       <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Readiness Snapshot</CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    {player.latestWellness ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-[#0f0f0f] border border-neutral-800 p-3 rounded-xl">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Fatigue</span>
                              <div className="flex items-center gap-2">
                                <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                                   <div className={`h-full ${player.latestWellness.fatigue > 7 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${player.latestWellness.fatigue * 10}%` }}></div>
                                </div>
                                <span className="text-xs font-black text-white">{player.latestWellness.fatigue}/10</span>
                              </div>
                           </div>
                           <div className="bg-[#0f0f0f] border border-neutral-800 p-3 rounded-xl">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block mb-1">Sleep</span>
                              <div className="flex items-center gap-2">
                                <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                                   <div className={`h-full ${player.latestWellness.sleep < 5 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${player.latestWellness.sleep * 10}%` }}></div>
                                </div>
                                <span className="text-xs font-black text-white">{player.latestWellness.sleep}/10</span>
                              </div>
                           </div>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center justify-between">
                           <div>
                             <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/60 block">Last Check-in Score</span>
                             <span className="text-2xl font-black text-emerald-500">{player.latestWellness.statusScore * 10}%</span>
                           </div>
                           <div className="h-10 w-10 rounded-full border-2 border-emerald-500/20 flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-emerald-500" />
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[120px] flex flex-col items-center justify-center bg-[#0a0a0a] rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
                         <HeartPulse className="h-6 w-6 text-neutral-700 mb-2" />
                         <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">No recent wellness data available</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-neutral-800/50">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-2">Emergency Contact</span>
                       {isEditing ? (
                         <Textarea 
                            className="bg-neutral-900 border-neutral-800 text-xs text-white font-medium min-h-[40px] focus:ring-rose-500/50" 
                            placeholder="Name and Phone Number"
                            value={formData.emergency_contact} 
                            onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })} 
                         />
                       ) : (
                         <div className="flex items-start gap-2">
                           <Phone className="h-3.5 w-3.5 text-rose-500 mt-0.5" />
                           <p className="text-xs font-medium text-slate-300 italic">{player.emergency_contact || "No emergency contact listed."}</p>
                         </div>
                       )}
                    </div>
                 </CardContent>
               </Card>

               {/* 4. Full Width Bottom Section: Injury History */}
               <Card className="bg-[#111111] border-neutral-800 md:col-span-3">
                 <CardHeader className="border-b border-neutral-800/50 pb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-500/20 rounded-lg">
                        <Activity className="h-4 w-4 text-rose-500" />
                      </div>
                      <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Medical & Injury Record</CardTitle>
                   </div>
                 </CardHeader>
                 <CardContent className="pt-6">
                    {isEditing ? (
                      <Textarea 
                         className="w-full bg-neutral-900 border-neutral-800 rounded-2xl p-6 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500/50 min-h-[180px]"
                         placeholder="Document significant injuries, surgeries, or medical conditions..."
                         value={formData.injury_history}
                         onChange={(e) => setFormData({ ...formData, injury_history: e.target.value })}
                      />
                    ) : (
                      <div className="bg-[#0d0d0d] p-6 rounded-2xl border border-neutral-800 shadow-inner">
                        <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                          {player.injury_history || "Athlete has no active or significant injury history on record."}
                        </p>
                      </div>
                    )}
                 </CardContent>
               </Card>

               {/* Account Access Section (Admin Only) */}
               {isAdmin && (
                 <Card className="bg-[#111111] border-neutral-800 md:col-span-3 overflow-hidden relative group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                   <CardHeader className="border-b border-neutral-800/50 pb-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-500/20 rounded-lg">
                         <ShieldCheck className="h-4 w-4 text-indigo-500" />
                       </div>
                       <CardTitle className="text-white font-black uppercase tracking-widest text-xs">Gestión de Acceso del Jugador</CardTitle>
                     </div>
                   </CardHeader>
                   <CardContent className="pt-6">
                     <div className="max-w-xl space-y-4">
                       <p className="text-xs font-medium text-slate-400">
                         Asigna un correo electrónico para que el jugador pueda acceder a su plataforma. La contraseña por defecto para todos será <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-indigo-400 font-bold">rugby2026</code>.
                       </p>
                       
                       <div className="flex flex-col sm:flex-row gap-3">
                         <div className="relative flex-1">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                           <Input 
                             type="email"
                             placeholder="jugador@equipo.com"
                             className="pl-10 bg-[#0d0d0d] border-neutral-800 text-sm focus:ring-indigo-500/50"
                             value={accountEmail}
                             onChange={(e) => setAccountEmail(e.target.value)}
                             disabled={accountSaving || accountLoading}
                           />
                         </div>
                         <Button 
                           className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6"
                           onClick={handleCreateAccount}
                           disabled={accountSaving || accountLoading}
                         >
                           {accountSaving ? (
                             <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                           ) : accountStatus?.hasAccount ? "Actualizar Cuenta" : "Crear Acceso"}
                         </Button>
                       </div>
                       
                       {accountStatus?.hasAccount && (
                         <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3">
                           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                           <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">
                             El jugador ya tiene una cuenta activa vinculada.
                           </span>
                         </div>
                       )}
                       
                       {!accountStatus?.hasAccount && !accountLoading && (
                         <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center gap-3">
                           <Key className="h-4 w-4 text-amber-500 opacity-50" />
                           <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500/80">
                             Este jugador aún no tiene credenciales de acceso.
                           </span>
                         </div>
                       )}
                     </div>
                   </CardContent>
                 </Card>
               )}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
