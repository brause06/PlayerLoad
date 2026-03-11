"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Calendar, ChevronRight, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Training Sessions</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">View, import, and analyze GPS data by day and drill.</p>
        </div>
        <Link href="/import">
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
            <Activity className="h-4 w-4 mr-2" />
            Import GPS Data
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="bg-[#111111] border-neutral-800 shadow-sm overflow-hidden min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8 max-w-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a1a1a] border border-neutral-800 shadow-sm text-indigo-400 mb-6">
              <Activity className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">No Sessions Yet</h3>
            <p className="text-slate-500 mb-6 text-sm">Import your first GPS CSV file to automatically create a session and calculate load metrics.</p>
            <Link href="/import">
              <Button className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800 text-white">Go to Import Page</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 animate-in slide-in-from-bottom-4 duration-500">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="border-neutral-800 bg-[#111111] hover:border-indigo-500/50 hover:bg-[#131313] transition-all cursor-pointer group shadow-sm">
                <CardContent className="p-0 flex items-stretch">
                  <div className="p-6 bg-[#1a1a1a] border-r border-neutral-800 flex flex-col items-center justify-center min-w-[120px] text-center rounded-l-lg group-hover:bg-indigo-500/10 transition-colors">
                    <Calendar className="h-5 w-5 text-indigo-400 mb-2" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {format(new Date(session.date.split('T')[0] + 'T12:00:00'), "MMM")}
                    </div>
                    <div className="text-3xl font-black text-white leading-none mt-1">
                      {format(new Date(session.date.split('T')[0] + 'T12:00:00'), "dd")}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-600 mt-1">
                      {format(new Date(session.date.split('T')[0] + 'T12:00:00'), "yyyy")}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black uppercase text-white group-hover:text-indigo-400 transition-colors">
                        {session.type} {session.opponent ? `vs ${session.opponent}` : ""}
                      </h3>
                      <div className="bg-[#222] border border-neutral-700 text-slate-300 text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded">
                        {session.microcycle ? `MD ${session.microcycle}` : 'Session'}
                      </div>
                    </div>
                    
                    <div className="flex gap-6 mt-4">
                      <div className="flex items-center text-sm text-slate-400">
                        <Users className="h-4 w-4 mr-1.5 text-slate-500" />
                        <span className="font-bold text-slate-200 mr-1">{session._count.data}</span> <span className="text-[10px] uppercase font-bold tracking-widest">Players</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-400">
                        <Activity className="h-4 w-4 mr-1.5 text-slate-500" />
                        <span className="font-bold text-slate-200 mr-1">{session._count.drills}</span> <span className="text-[10px] uppercase font-bold tracking-widest">Blocks/Drills</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-400">
                        <Clock className="h-4 w-4 mr-1.5 text-slate-500" />
                        <span className="font-bold text-slate-200 mr-1">{session.duration}</span> <span className="text-[10px] uppercase font-bold tracking-widest">Mins</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center text-slate-600 group-hover:text-indigo-400 transition-colors border-l border-neutral-800/50 bg-[#151515]">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
