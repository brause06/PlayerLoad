"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export function WellnessForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // State for all form fields based on the planned schema
  const [sleep, setSleep] = useState(5); // 1-10 (1=Bad, 10=Good)
  const [sleepHours, setSleepHours] = useState(8); 
  const [stress, setStress] = useState(5); // 1-10 (1=None, 10=High)
  const [fatigue, setFatigue] = useState(5); // 1-10 (1=None, 10=High)
  const [muscleSoreness, setMuscleSoreness] = useState(5); // 1-10 (1=None, 10=High)
  const [statusScore, setStatusScore] = useState(8); // 1-10 (1=Banged up, 10=Perfect)
  const [jointPain, setJointPain] = useState("");

  useEffect(() => {
    async function checkTodayStatus() {
      try {
        const res = await fetch("/api/wellness");
        if (res.ok) {
          const data = await res.json();
          if (data.hasSubmitted && data.record) {
            // Restore previous values
            setSleep(data.record.sleep);
            setSleepHours(data.record.sleepHours);
            setStress(data.record.stress);
            setFatigue(data.record.fatigue);
            setMuscleSoreness(data.record.muscleSoreness);
            setStatusScore(data.record.statusScore);
            setJointPain(data.record.jointPain || "");
            
            setIsSubmitted(true);
            setIsExpanded(false);
          }
        }
      } catch (err) {
        console.error("Failed to check wellness status:", err);
      }
    }
    checkTodayStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleep,
          sleepHours: Number(sleepHours),
          stress,
          fatigue,
          muscleSoreness,
          statusScore,
          jointPain
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");
      
      setIsSubmitted(true);
      setIsExpanded(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong saving your wellness data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper component for a custom 1-10 touch slider/selector
  const MetricSlider = ({ 
    label, 
    value, 
    onChange, 
    descriptionLeft, 
    descriptionRight, 
    colorClass 
  }: { 
    label: string, 
    value: number, 
    onChange: (v: number) => void,
    descriptionLeft: string,
    descriptionRight: string,
    colorClass: string
  }) => (
    <div className="space-y-3 p-4 rounded-xl bg-[#1a1a1a] border border-neutral-800/60">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-white tracking-widest uppercase">{label}</label>
        <div className={`text-xl font-black ${colorClass}`}>{value}</div>
      </div>
      <input 
        type="range" 
        min="1" 
        max="10" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-neutral-800"
      />
      <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
        <span>1 - {descriptionLeft}</span>
        <span>{descriptionRight} - 10</span>
      </div>
    </div>
  );

  if (isSubmitted && !isExpanded) {
    return (
      <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm rounded-2xl mb-6">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <div>
                    <h3 className="font-bold text-white uppercase tracking-widest text-[10px]">Daily Check-in Complete</h3>
                    <p className="text-[10px] text-emerald-400/80 font-bold tracking-widest uppercase">Data saved successfully</p>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 text-[10px] uppercase font-bold tracking-widest">
                Edit
            </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111111] border-neutral-800 shadow-sm rounded-2xl mb-6 overflow-hidden">
      <CardHeader className="bg-[#1a1a1a] border-b border-neutral-800 pb-4 flex flex-row items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
                <HeartPulse className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
                <CardTitle className="text-sm font-bold text-white tracking-widest uppercase">Daily Check-in</CardTitle>
                <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">{isSubmitted ? "Update your metrics" : "Required morning wellness"}</p>
            </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="divide-y divide-neutral-800/60 p-5 space-y-6">
            
            {/* SECTION A: WELLNESS METRICS */}
            <div className="space-y-4">
               <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Section A: Core Wellness</h3>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                   {/* Sleep Time */}
                   <div className="space-y-3 p-4 rounded-xl bg-[#1a1a1a] border border-neutral-800/60 flex justify-between items-center">
                     <div>
                        <label className="text-xs font-bold text-white tracking-widest uppercase block">Sleep Duration</label>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Hours</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           min="0" max="24" step="0.5"
                           value={sleepHours}
                           onChange={(e) => setSleepHours(Number(e.target.value))}
                           className="w-16 bg-[#111111] border border-neutral-800 rounded-lg p-2 text-center text-white font-black hover:border-indigo-500/50 focus:border-indigo-500 outline-none"
                         />
                         <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">hrs</span>
                     </div>
                   </div>

                   <MetricSlider 
                     label="Sleep Quality" 
                     value={sleep} onChange={setSleep} 
                     descriptionLeft="Terrible" descriptionRight="Excellent" 
                     colorClass={sleep >= 7 ? "text-emerald-400" : sleep <= 4 ? "text-rose-400" : "text-amber-400"}
                   />

                   <MetricSlider 
                     label="Stress Levels" 
                     value={stress} onChange={setStress} 
                     descriptionLeft="None" descriptionRight="Overwhelmed" 
                     colorClass={stress <= 4 ? "text-emerald-400" : stress >= 7 ? "text-rose-400" : "text-amber-400"}
                   />

                   <MetricSlider 
                     label="General Fatigue" 
                     value={fatigue} onChange={setFatigue} 
                     descriptionLeft="Fresh" descriptionRight="Exhausted" 
                     colorClass={fatigue <= 4 ? "text-emerald-400" : fatigue >= 7 ? "text-rose-400" : "text-amber-400"}
                   />

                   <MetricSlider 
                     label="Muscle Soreness" 
                     value={muscleSoreness} onChange={setMuscleSoreness} 
                     descriptionLeft="None" descriptionRight="Severe" 
                     colorClass={muscleSoreness <= 4 ? "text-emerald-400" : muscleSoreness >= 7 ? "text-rose-400" : "text-amber-400"}
                   />
               </div>
            </div>

            {/* SECTION B: STATUS & PAIN */}
            <div className="space-y-4 pt-6">
               <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Section B: Body Status</h3>
               </div>
               
               <MetricSlider 
                 label="Overall Physical Status" 
                 value={statusScore} onChange={setStatusScore} 
                 descriptionLeft="Banged Up" descriptionRight="Perfect" 
                 colorClass={statusScore >= 7 ? "text-emerald-400" : statusScore <= 4 ? "text-rose-400" : "text-amber-400"}
               />

               <div className="space-y-2 px-1">
                 <label className="text-xs font-bold text-white tracking-widest uppercase">Joint Pain / Specific Issues</label>
                 <textarea 
                   placeholder="e.g. Right ankle is stiff, left shoulder hurts when tackling..."
                   value={jointPain}
                   onChange={(e) => setJointPain(e.target.value)}
                   className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl p-3 text-sm text-slate-300 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow min-h-[80px]"
                 />
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Leave blank if feeling 100%</p>
               </div>
            </div>

            <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black tracking-widest uppercase text-xs py-6 rounded-xl transition-all"
                >
                  {isSubmitting ? "Saving..." : isSubmitted ? "Update Check-in" : "Submit Daily Check-in"}
                </Button>
            </div>
            
          </form>
        </CardContent>
      )}
    </Card>
  );
}
