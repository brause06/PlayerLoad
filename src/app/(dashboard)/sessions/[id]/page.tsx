"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Activity, Users, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error("Failed to load session", err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchSession();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Session not found</h2>
        <Button onClick={() => router.push("/sessions")} className="mt-4">Back to Sessions</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/sessions")} className="bg-[#1a1a1a] border-neutral-800 text-slate-400 hover:bg-[#222] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            {session.type} {session.opponent ? `vs ${session.opponent}` : ""}
            <span className="text-[10px] font-bold bg-[#222] text-slate-400 px-3 py-1 rounded border border-neutral-800 uppercase tracking-widest">
              {format(new Date(session.date), "PPP")}
            </span>
          </h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">
            {session.microcycle ? `MD ${session.microcycle} • ` : ""}
            {session.data.length} Players Recorded
          </p>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button 
            onClick={() => router.push(`/sessions/${params.id}/match-report`)}
            className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs uppercase tracking-widest"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-2" />
            View Match Analytics
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-2">
          <CardHeader>
            <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Session Top Speeds & Velocity Exposures</CardTitle>
            <CardDescription className="text-slate-500">All-Time Max Velocity Reached</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={session.data.map((d: any) => ({ name: d.player.name.split(' ')[0], maxSpeed: d.top_speed, percentMax: d.percentMaxSpeed }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#131313', borderRadius: '12px', border: '1px solid #262626', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                     labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                     cursor={{fill: '#1a1a1a'}}
                  />
                  <Bar yAxisId="left" dataKey="maxSpeed" name="Session Max Speed (km/h)" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="percentMax" name="% of All-Time Max" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6">
              <h4 className="text-[10px] uppercase font-bold tracking-widest flex items-center text-rose-400 mb-3 bg-rose-500/10 px-3 py-2 rounded border border-rose-500/20">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 Velocity Exposures Alert (No &gt;90% hit in session)
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {session.data.filter((d: any) => d.percentMaxSpeed < 90).map((d: any) => (
                  <span key={d.player.id} className="bg-[#222] border-rose-500/30 border text-slate-300 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-widest shadow-sm">
                    {d.player.name} <span className="text-rose-400">{d.percentMaxSpeed}%</span>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] shadow-sm border-neutral-800">
          <CardHeader>
            <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Session HSR Leaders</CardTitle>
            <CardDescription className="text-slate-500">Absolute High Speed Running</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {session.data.slice(0, 10).map((d: any, idx: number) => (
                <div key={d.player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1a1a1a] border border-transparent hover:border-neutral-800 transition-colors">
                  <div className="flex items-center gap-3">
                     <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-[#222] text-slate-500 border border-neutral-700'}`}>
                        {idx + 1}
                     </span>
                     <div>
                       <Link href={`/players/${d.player.id}`} className="font-bold text-sm text-white hover:text-indigo-400 hover:underline">
                         {d.player.name}
                       </Link>
                       <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{d.player.position}</div>
                     </div>
                  </div>
                  <div className="font-bold tabular-nums text-slate-300 bg-[#222] border border-neutral-700 py-1 px-2.5 rounded text-sm">
                    {d.hsr_distance}m
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] shadow-sm border-neutral-800 col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-white font-bold uppercase tracking-widest text-sm">Drill Breakdown (Block HSR)</CardTitle>
            <CardDescription className="text-slate-500">HSR distribution per drill block for top players</CardDescription>
          </CardHeader>
          <CardContent>
             {session.drills && session.drills.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {session.drills.map((drill: any) => (
                    <div key={drill.id} className="border border-neutral-800 rounded-xl p-4 bg-[#1a1a1a]">
                      <h4 className="font-black text-white uppercase tracking-widest text-[10px] border-b border-neutral-800 pb-2 mb-3 truncate flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        {drill.name}
                      </h4>
                      <div className="space-y-2">
                        {drill.data.slice(0, 5).map((dd: any, idx: number) => (
                          <div key={dd.id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-medium truncate mr-2" title={dd.player.name}>
                              {idx + 1}. {dd.player.name}
                            </span>
                            <span className="font-bold tabular-nums text-indigo-400">
                              {dd.hsr_distance}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="text-center p-8 bg-[#1a1a1a] rounded-xl border border-dashed border-neutral-800 text-[10px] uppercase tracking-widest font-bold text-slate-600">
                   No drill blocks detected for this session.
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
