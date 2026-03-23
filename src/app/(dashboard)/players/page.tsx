"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Activity, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AddPlayerSheet } from "@/components/players/AddPlayerSheet";
import { getPositionSortIndex } from "@/lib/constants";

type Player = {
  id: string;
  name: string;
  position: string;
  status: string;
  top_speed_max: number | null;
  age: number | null;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupByPosition, setGroupByPosition] = useState(false);

  const fetchPlayers = () => {
    setLoading(true);
    fetch("/api/players")
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.position && p.position.toLowerCase().includes(search.toLowerCase()))
    );
  }, [players, search]);

  const groupedPlayers = useMemo(() => {
    if (!groupByPosition) return null;
    const groups: Record<string, Player[]> = {};
    filteredPlayers.forEach(p => {
        const pos = p.position || "Unknown";
        if (!groups[pos]) groups[pos] = [];
        groups[pos].push(p);
    });
    
    // Sort groups using constant order
    const sortedGroups: Record<string, Player[]> = {};
    Object.keys(groups).sort((a, b) => getPositionSortIndex(a) - getPositionSortIndex(b)).forEach(k => {
      sortedGroups[k] = groups[k];
    });
    
    return sortedGroups;
  }, [filteredPlayers, groupByPosition]);

  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'ACTIVE' || s === 'OPTIMAL') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s === 'HIGH') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (s === 'LOW') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-[#222] text-slate-400 border-neutral-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Player Roster</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">Manage team members, positions, and performance baselines.</p>
        </div>
        <AddPlayerSheet onPlayerAdded={fetchPlayers} />
      </div>

      <Card className="bg-[#111111] border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#111111] flex-wrap gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Search players or positions..."
              className="pl-9 bg-[#1a1a1a] border-neutral-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant={groupByPosition ? "default" : "outline"} 
            className={groupByPosition ? "bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-500" : "bg-[#1a1a1a] border-neutral-800 text-slate-300 hover:bg-[#222] hover:text-white"}
            onClick={() => setGroupByPosition(!groupByPosition)}
          >
            <Users className="w-4 h-4 mr-2" />
            {groupByPosition ? "Ungroup" : "Group by Position"}
          </Button>
        </div>
        
        <div className="bg-[#111111]">
          {loading ? (
            <div className="p-8 text-center text-slate-500 uppercase tracking-widest text-[10px] font-bold">Loading roster...</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-1">No players found</h3>
              <p className="text-slate-500 mb-4 max-w-sm mx-auto text-sm">Get started by importing your first GPS CSV or adding a player manually.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#1a1a1a] border-b border-neutral-800">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Name</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Position</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Max Speed</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">ACWR Check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupByPosition && groupedPlayers ? (
                  Object.entries(groupedPlayers).map(([position, positionPlayers]) => (
                    <div key={position} className="contents">
                      <TableRow className="bg-[#131313] border-y border-neutral-800 hover:bg-[#131313]">
                        <TableCell colSpan={4} className="py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white tracking-widest uppercase text-xs">{position}</span>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-[#222] px-2 py-0.5 rounded border border-neutral-800 shadow-sm">
                              {positionPlayers.length} {positionPlayers.length === 1 ? 'Player' : 'Players'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {positionPlayers.map((player) => (
                        <TableRow key={player.id} className="hover:bg-[#1a1a1a] border-neutral-800/50 transition-colors">
                          <TableCell className="font-bold text-white text-sm">
                            <Link href={`/players/${player.id}`} className="hover:text-indigo-400 transition-colors">{player.name}</Link>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#222] border border-neutral-700 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                              {player.position}
                            </span>
                          </TableCell>
                          <TableCell>
                            {player.top_speed_max ? (
                              <span className="font-bold text-slate-300 tabular-nums">{player.top_speed_max} <span className="text-[10px] uppercase font-bold text-slate-500">km/h</span></span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold border ${renderStatusBadge(player.status)}`}>
                              {player.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </div>
                  ))
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="hover:bg-[#1a1a1a] border-neutral-800 transition-colors">
                      <TableCell className="font-bold text-white text-sm">
                        <Link href={`/players/${player.id}`} className="hover:text-indigo-400 transition-colors">{player.name}</Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#222] border border-neutral-700 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                          {player.position}
                        </span>
                      </TableCell>
                      <TableCell>
                        {player.top_speed_max ? (
                          <span className="font-bold text-slate-300 tabular-nums">{player.top_speed_max} <span className="text-[10px] uppercase font-bold text-slate-500">km/h</span></span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold border ${renderStatusBadge(player.status)}`}>
                          {player.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
