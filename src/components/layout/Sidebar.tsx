"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, Upload, BarChart2, LogOut, Bell, Settings, Sparkles } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 h-full bg-[#131313] text-slate-300 border-r border-neutral-800 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-500" />
          LoadTrack
        </h1>
        <NotificationBell />
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {session?.user?.role === "PLAYER" ? (
            <Link 
              href="/my-stats"
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/my-stats') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
            >
              <Activity className="h-5 w-5 text-indigo-400" />
              <span>My Stats</span>
            </Link>
        ) : (
            <>
                <Link 
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === '/dashboard' ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <BarChart2 className="h-5 w-5 text-indigo-400" />
                  <span>Dashboard</span>
                </Link>
                <Link 
                  href="/ai-coach"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/ai-coach') ? 'bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <span className="flex items-center gap-2">
                    Coach Intelligence
                    <span className="text-[8px] bg-indigo-500 text-white px-1 rounded font-black">AI</span>
                  </span>
                </Link>
                <Link 
                  href="/readiness"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/readiness') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <span>Readiness Board</span>
                </Link>
                <Link 
                  href="/players"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/players') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Users className="h-5 w-5 text-indigo-400" />
                  <span>Players</span>
                </Link>
                <Link 
                  href="/sessions"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/sessions') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <span>Sessions</span>
                </Link>
                <Link 
                  href="/reports"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/reports') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <BarChart2 className="h-5 w-5 text-indigo-400" />
                  <span>Reports</span>
                </Link>
                <Link 
                  href="/import"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/import') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Upload className="h-5 w-5 text-indigo-400" />
                  <span>Import Data</span>
                </Link>
                <Link 
                  href="/alerts"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/alerts') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Bell className="h-5 w-5 text-indigo-400" />
                  <span>Alert Center</span>
                </Link>
                <Link 
                  href="/settings"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith('/settings') ? 'bg-[#222] text-white font-medium border border-neutral-800' : 'hover:bg-[#1a1a1a] hover:text-white border border-transparent'}`}
                >
                  <Settings className="h-5 w-5 text-indigo-400" />
                  <span>Settings</span>
                </Link>
            </>
        )}
      </nav>
      <div className="p-4 border-t border-neutral-800">
        <div className="text-sm font-medium mb-1 truncate text-white uppercase tracking-wide">
          {session?.user?.name || "Loading..."}
        </div>
        <div className="text-[10px] text-slate-500 mb-3 uppercase tracking-widest font-bold">
          {session?.user?.role?.toLowerCase() || "Staff"}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-neutral-800 bg-[#0a0a0a] text-slate-400 hover:bg-[#1a1a1a] hover:text-white justify-start transition-colors"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
