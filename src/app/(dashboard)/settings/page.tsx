"use client";

import { useEffect, useState } from "react";
import { 
    Settings, 
    Save, 
    Shield, 
    Zap, 
    Activity, 
    Info,
    RefreshCw,
    Gauge,
    Mail,
    Scale,
    FileText,
    Clock,
    BellRing,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type Setting = {
    id: string;
    key: string;
    value: string;
    description: string;
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [openResetDialog, setOpenResetDialog] = useState(false);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleUpdate = (key: string, value: string) => {
        setSettings(settings.map(s => s.key === key ? { ...s, value } : s));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            for (const s of settings) {
                await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: s.key, value: s.value }),
                });
            }
            toast.success("Settings saved successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save some settings");
        } finally {
            setSaving(false);
        }
    };

    const getVal = (key: string) => settings.find(s => s.key === key)?.value || "";

    const handleResetAllData = async () => {
        setIsResetting(true);
        try {
            const res = await fetch("/api/data/reset", { method: "POST" });
            if (res.ok) {
                toast.success("All data has been cleared successfully");
                setOpenResetDialog(false);
                // Optionally refresh settings or redirect
                fetchSettings();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to clear data");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred");
        } finally {
            setIsResetting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        System Configuration
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Advanced performance thresholds & notification engine
                    </p>
                </div>
                <Button 
                    onClick={saveSettings}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 font-black text-xs uppercase tracking-widest px-8 h-12 shadow-lg shadow-indigo-600/20"
                >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Commit Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Performance Thresholds */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="border-b border-neutral-900 bg-[#161616]/50">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-white text-sm uppercase font-black tracking-widest">Risk Thresholds (ACWR)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {settings.filter(s => s.key.startsWith("acwr")).map(s => (
                            <div key={s.id} className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {s.description}
                                </Label>
                                <div className="flex gap-4 items-center">
                                    <Input 
                                        type="number"
                                        step="0.1"
                                        value={s.value}
                                        onChange={(e) => handleUpdate(s.key, e.target.value)}
                                        className="bg-black border-neutral-800 text-white font-bold h-11"
                                    />
                                    <Badge className="bg-neutral-900 text-indigo-400 border-neutral-800 font-black h-11 px-4 text-base">
                                        {s.value}x
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Min Chronic Load (Maintenance)
                            </Label>
                            <Input 
                                type="number"
                                value={getVal("min_chronic_load")}
                                onChange={(e) => handleUpdate("min_chronic_load", e.target.value)}
                                className="bg-black border-neutral-800 text-white font-bold h-11"
                            />
                        </div>

                        <div className="space-y-2 pt-4 border-t border-neutral-900">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Hamstring Target Velocity (%)
                            </Label>
                            <Input 
                                type="number"
                                value={getVal("speed_threshold_hamstring")}
                                onChange={(e) => handleUpdate("speed_threshold_hamstring", e.target.value)}
                                className="bg-black border-neutral-800 text-white font-bold h-11"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Communication Channels */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="border-b border-neutral-900 bg-[#161616]/50">
                        <div className="flex items-center gap-2">
                            <BellRing className="h-4 w-4 text-rose-500" />
                            <CardTitle className="text-white text-sm uppercase font-black tracking-widest">Notification Channels</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-black rounded-xl border border-neutral-900">
                            <div className="space-y-1">
                                <p className="text-xs font-black text-white uppercase tracking-widest">Email Alerts</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">High risk performance notifications</p>
                            </div>
                            <Switch 
                                checked={getVal("email_alerts_enabled") === "true"}
                                onCheckedChange={(val: boolean) => handleUpdate("email_alerts_enabled", val.toString())}
                            />
                        </div>

                        <div className="space-y-4 p-4 bg-black rounded-xl border border-neutral-900">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-white uppercase tracking-widest">Daily Squad Summary</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Morning readiness overview (7:00 AM)</p>
                                </div>
                                <Clock className="h-4 w-4 text-slate-500" />
                            </div>
                        </div>

                        <div className="space-y-2 p-4 bg-black rounded-xl border border-neutral-900">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Mail className="h-3 w-3" /> Target Notification Email
                            </Label>
                            <Input 
                                type="email"
                                placeholder="staff@loadtrack.com"
                                value={getVal("notification_email")}
                                onChange={(e) => handleUpdate("notification_email", e.target.value)}
                                className="bg-neutral-900 border-neutral-800 text-white font-bold h-11"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Readiness Scoring (Weights) */}
                <Card className="bg-[#111] border-neutral-800">
                    <CardHeader className="border-b border-neutral-900 bg-[#161616]/50">
                        <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-indigo-500" />
                            <CardTitle className="text-white text-sm uppercase font-black tracking-widest">Readiness Influence Weights</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed border-b border-neutral-900 pb-4 mb-4">
                            Adjust the importance (1-5) of each metric. A higher weight gives that metric more influence on the final Readiness score.
                        </p>
                        <div className="grid grid-cols-2 gap-6">
                            {settings.filter(s => s.key.startsWith("weight_")).map(s => (
                                <div key={s.id} className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        {s.key.split('_')[1]} Weight
                                    </Label>
                                    <div className="flex gap-2 items-center">
                                        <Input 
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={s.value}
                                            onChange={(e) => handleUpdate(s.key, e.target.value)}
                                            className="bg-black border-neutral-800 text-white font-bold"
                                        />
                                        <span className="text-[10px] text-slate-600 font-black">/5</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Danger Zone */}
                <Card className="bg-[#111] border-rose-900/30 lg:col-span-2">
                    <CardHeader className="border-b border-rose-900/20 bg-rose-950/10">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                            <CardTitle className="text-rose-500 text-sm uppercase font-black tracking-widest">Danger Zone</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-white font-black uppercase text-sm tracking-tight">Delete All Data</h3>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed max-w-xl">
                                    Irreversibly delete all player profiles, sessions, wellness records, and alerts. This action cannot be undone. User accounts and system settings will be preserved.
                                </p>
                            </div>

                            <Dialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="bg-rose-600 hover:bg-rose-500 font-black text-xs uppercase tracking-widest px-8 h-12 shadow-lg shadow-rose-600/20">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Wipe All Data
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#111] border-neutral-800 text-white">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tighter text-rose-500 flex items-center gap-2">
                                            <AlertTriangle className="h-6 w-6" />
                                            Confirm System Wipe
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pt-2">
                                            You are about to delete all physiological data, training logs, and player information from the database.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-6 border-y border-neutral-900 my-4">
                                        <p className="text-sm font-bold text-slate-300">
                                            This action is <span className="text-rose-500 underline underline-offset-4">permanent</span> and will affect all dashboard metrics and reporting.
                                        </p>
                                    </div>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setOpenResetDialog(false)}
                                            className="text-slate-500 hover:text-white hover:bg-neutral-800 font-black uppercase text-[10px] tracking-widest"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            variant="destructive"
                                            onClick={handleResetAllData}
                                            disabled={isResetting}
                                            className="bg-rose-600 hover:bg-rose-500 font-black uppercase text-[10px] tracking-widest px-8"
                                        >
                                            {isResetting ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
                                            Yes, Delete Everything
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
