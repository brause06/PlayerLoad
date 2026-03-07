"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type Alert = {
  id: string;
  playerId: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  player: {
    name: string;
  };
};

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Setup polling every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      // Remove from local state
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = alerts.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-100 px-2 rounded-full font-medium">
              {unreadCount} new
            </Badge>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex gap-3 group transition-colors">
                  <div className="mt-0.5 shrink-0 flex items-start justify-center">
                    <div className="p-2 bg-rose-100 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-slate-800 leading-tight">
                      {alert.message}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => markAsRead(alert.id)}
                    className="opacity-0 group-hover:opacity-100 h-8 px-2 text-xs text-slate-400 hover:text-indigo-600 self-center"
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
