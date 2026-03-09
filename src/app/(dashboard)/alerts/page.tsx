"use client";

import { useEffect, useState } from "react";
import { 
    Bell, 
    AlertTriangle, 
    CheckCircle2, 
    Filter, 
    Trash2, 
    User, 
    Calendar,
    ChevronRight,
    Search
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Alert = {
    id: string;
    playerId: string;
    type: string;
    message: string;
    createdAt: string;
    read: boolean;
    player: {
        name: string;
        position: string;
    };
};

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchAlerts = async () => {
        try {
            const res = await fetch("/api/alerts?all=true");
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch("/api/alerts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
                toast.success("Alert dismissed");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const markAllRead = async () => {
        try {
            const res = await fetch("/api/alerts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (res.ok) {
                setAlerts(alerts.map(a => ({ ...a, read: true })));
                toast.success("All alerts marked as read");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filteredAlerts = alerts
        .filter(a => {
            if (filter === "unread") return !a.read;
            if (filter === "read") return a.read;
            return true;
        })
        .filter(a => 
            a.player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.message.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const unreadCount = alerts.filter(a => !a.read).length;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        Alert Center
                        {unreadCount > 0 && (
                            <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 font-black">
                                {unreadCount} NEW
                            </Badge>
                        )}
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        System-generated performance & injury risk notifications
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="bg-[#111] border-neutral-800 text-slate-400 hover:text-white font-bold text-[10px] uppercase tracking-widest"
                    >
                        Mark all read
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Search players or messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-[#111] border-neutral-800 text-white placeholder:text-slate-600 font-medium"
                    />
                </div>
                <div className="flex bg-[#111] p-1 rounded-lg border border-neutral-800 self-stretch md:self-auto">
                    {["all", "unread", "read"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === f 
                                    ? "bg-indigo-600 text-white shadow-lg" 
                                    : "text-slate-500 hover:text-slate-300"
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <Card className="bg-[#111] border-neutral-800 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="h-12 w-12 text-neutral-800 mb-4" />
                            <h3 className="text-white font-black uppercase tracking-widest">Everything Clear</h3>
                            <p className="text-slate-500 text-xs font-bold mt-2">No alerts match your current filter.</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredAlerts.map((alert) => (
                        <Card 
                            key={alert.id} 
                            className={`bg-[#111] border-neutral-800 transition-all hover:border-neutral-700 group ${!alert.read ? "border-l-4 border-l-rose-500" : ""}`}
                        >
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4">
                                    <div className={`p-3 rounded-xl ${!alert.read ? "bg-rose-500/10" : "bg-neutral-900"}`}>
                                        <AlertTriangle className={`h-5 w-5 ${!alert.read ? "text-rose-500" : "text-neutral-700"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-neutral-900 text-slate-400 border-neutral-800 text-[9px] font-black uppercase tracking-widest">
                                                {alert.type.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className={`text-sm tracking-tight ${!alert.read ? "text-white font-bold" : "text-slate-500 font-medium"}`}>
                                            <span className="text-indigo-400 uppercase font-black mr-2">{alert.player.name}</span>
                                            {alert.message}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!alert.read && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => markAsRead(alert.id)}
                                                className="h-8 px-3 text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Dismiss
                                            </Button>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="h-8 w-8 text-neutral-800 hover:text-white group-hover:text-neutral-600 transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
