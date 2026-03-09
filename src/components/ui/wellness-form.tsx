"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export function WellnessForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // State for all form fields
  const [sleep, setSleep] = useState(5); 
  const [sleepHours, setSleepHours] = useState(8); 
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5); 
  const [fatigue, setFatigue] = useState(5); 
  const [muscleSoreness, setMuscleSoreness] = useState(5); 
  const [statusScore, setStatusScore] = useState(8); 
  const [comments, setComments] = useState("");
  const [jointPainMap, setJointPainMap] = useState<Record<string, number>>({});
  const [musclePainMap, setMusclePainMap] = useState<string[]>([]);

  const MUSCLES = [
    { id: 'isquios', label: 'Isquios' },
    { id: 'cuadriceps', label: 'Cuadríceps' },
    { id: 'gemelos', label: 'Gemelos' },
    { id: 'tren_superior', label: 'Tren Superior' },
    { id: 'cuello', label: 'Cuello' },
    { id: 'espalda_baja', label: 'Espalda Baja' }
  ];

  const JOINTS = [
    { id: 'tobillo_l', label: 'Tobillo I', x: '45%', y: '85%' },
    { id: 'tobillo_r', label: 'Tobillo D', x: '55%', y: '85%' },
    { id: 'rodilla_l', label: 'Rodilla I', x: '45%', y: '70%' },
    { id: 'rodilla_r', label: 'Rodilla D', x: '55%', y: '70%' },
    { id: 'cadera_l', label: 'Cadera I', x: '44%', y: '50%' },
    { id: 'cadera_r', label: 'Cadera D', x: '56%', y: '50%' },
    { id: 'hombro_l', label: 'Hombro I', x: '35%', y: '25%' },
    { id: 'hombro_r', label: 'Hombro D', x: '65%', y: '25%' },
  ];

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
            setEnergy(data.record.energy || 5);
            setStress(data.record.stress);
            setFatigue(data.record.fatigue);
            setMuscleSoreness(data.record.muscleSoreness);
            setStatusScore(data.record.statusScore);
            setComments(data.record.comments || "");
            setJointPainMap(data.record.jointPainMap || {});
            setMusclePainMap(data.record.musclePainMap || []);
            
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
          energy,
          stress,
          fatigue,
          muscleSoreness,
          statusScore,
          comments,
          jointPainMap,
          musclePainMap
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
    colorClass,
    isRawValue
  }: { 
    label: string, 
    value: number, 
    onChange: (v: number) => void,
    descriptionLeft: string,
    descriptionRight: string,
    colorClass: string,
    isRawValue?: boolean
  }) => (
    <div className="space-y-3 p-4 rounded-xl bg-[#1a1a1a] border border-neutral-800/60 transition-all hover:bg-[#1f1f1f]">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-white tracking-widest uppercase">{label}</label>
        <div className={`text-xl font-black ${colorClass}`}>{value}{isRawValue ? '' : ''}</div>
      </div>
      <input 
        type="range" 
        min={isRawValue ? "0" : "1"} 
        max={isRawValue ? "12" : "10"} 
        step={isRawValue ? "0.5" : "1"}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[#111] rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-neutral-800"
      />
      <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
        <span>{descriptionLeft}</span>
        <span>{descriptionRight}</span>
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
          <form onSubmit={handleSubmit} className="divide-y divide-neutral-800/60 p-5 space-y-8">
            
            {/* SECTION A: WELLNESS METRICS */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Sección A: Core Wellness</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <MetricSlider 
                      label="1. ¿Cuantás horas dormiste?" 
                      value={sleepHours} onChange={(v) => setSleepHours(v)} 
                      descriptionLeft="Poco" descriptionRight="Mucho" 
                      colorClass="text-indigo-400"
                      isRawValue
                    />

                    <MetricSlider 
                      label="2. Calidad de tu sueño" 
                      value={sleep} onChange={setSleep} 
                      descriptionLeft="Mala" descriptionRight="Excelente" 
                      colorClass={sleep >= 7 ? "text-emerald-400" : sleep <= 4 ? "text-rose-400" : "text-amber-400"}
                    />

                    <MetricSlider 
                      label="3. ¿Cuál es tu nivel de energía?" 
                      value={energy} onChange={setEnergy} 
                      descriptionLeft="Bajo" descriptionRight="Alto" 
                      colorClass={energy >= 7 ? "text-emerald-400" : energy <= 4 ? "text-rose-400" : "text-amber-400"}
                    />

                    <MetricSlider 
                      label="4. ¿Qué tan estresado te sentís?" 
                      value={stress} onChange={setStress} 
                      descriptionLeft="Nada" descriptionRight="Mucho" 
                      colorClass={stress <= 4 ? "text-emerald-400" : stress >= 7 ? "text-rose-400" : "text-amber-400"}
                    />
                </div>
            </div>

            {/* SECTION B: GOLPE / DOLOR */}
            <div className="space-y-8 pt-8">
               <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Sección B: Registro de Golpe / Dolor</h3>
               </div>

               <div className="space-y-3 px-1">
                 <label className="text-xs font-bold text-white tracking-widest uppercase">1. ¿Qué necesitamos saber para cuidarte mejor?</label>
                 <textarea 
                   placeholder="Escribinos cómo te venís sintiendo..."
                   value={comments}
                   onChange={(e) => setComments(e.target.value)}
                   className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow min-h-[100px]"
                 />
               </div>

               <MetricSlider 
                 label="2. ¿Qué tan golpeado te sentís?" 
                 value={fatigue} onChange={setFatigue} 
                 descriptionLeft="Nada" descriptionRight="Mucho" 
                 colorClass={fatigue <= 4 ? "text-emerald-400" : fatigue >= 7 ? "text-rose-400" : "text-amber-400"}
               />

               <div className="space-y-6 px-1">
                 <label className="text-xs font-bold text-white tracking-widest uppercase block mb-2 text-center">3. Dolor Articular (Marcar zonas afectadas)</label>
                 
                 <div className="relative w-full aspect-[1/1.5] max-w-[220px] mx-auto bg-neutral-900 rounded-3xl border border-neutral-800 flex items-center justify-center overflow-hidden shadow-inner">
                    <svg viewBox="0 0 100 150" className="w-full h-full opacity-10 fill-white">
                        <path d="M50,10c5,0,10,5,10,10s-5,10-10,10s-10-5-10-10S45,10,50,10z M40,35c-5,0-15,5-15,15v30c0,5,5,10,10,10h5v45c0,5,5,10,10,10s10-5,10-10v-45h5c5,0,10-5,10-10V50c0-10-10-15-15-15H40z" />
                    </svg>

                    {JOINTS.map((j) => (
                        <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                                const current = jointPainMap[j.id] || 0;
                                const next = (current + 2) % 12; 
                                if (next === 0) {
                                    const newMap = { ...jointPainMap };
                                    delete newMap[j.id];
                                    setJointPainMap(newMap);
                                } else {
                                    setJointPainMap({ ...jointPainMap, [j.id]: next });
                                }
                            }}
                            className={`absolute w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-black ${
                                jointPainMap[j.id] 
                                    ? jointPainMap[j.id] >= 7 
                                        ? "bg-rose-500 border-white text-white shadow-lg shadow-rose-500/50 scale-125 z-10" 
                                        : "bg-amber-500 border-white text-white shadow-lg shadow-amber-500/50 scale-110 z-10"
                                    : "bg-black/50 border-neutral-700 text-slate-500 hover:border-indigo-500 z-0"
                            }`}
                            style={{ left: j.x, top: j.y, transform: 'translate(-50%, -50%)' }}
                        >
                            {jointPainMap[j.id] || ""}
                        </button>
                    ))}
                 </div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Tocar zonas para marcar dolor (1-10)</p>
               </div>

               <MetricSlider 
                 label="4. Dolor Muscular" 
                 value={muscleSoreness} onChange={setMuscleSoreness} 
                 descriptionLeft="Nada" descriptionRight="Mucho" 
                 colorClass={muscleSoreness <= 4 ? "text-emerald-400" : muscleSoreness >= 7 ? "text-rose-400" : "text-amber-400"}
               />

               <div className="space-y-4 px-1">
                 <label className="text-xs font-bold text-white tracking-widest uppercase">5. ¿Cuáles son los músculos más afectados?</label>
                 <div className="grid grid-cols-2 gap-2">
                    {MUSCLES.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                                if (musclePainMap.includes(m.id)) {
                                    setMusclePainMap(musclePainMap.filter(id => id !== m.id));
                                } else {
                                    setMusclePainMap([...musclePainMap, m.id]);
                                }
                            }}
                            className={`p-4 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                                musclePainMap.includes(m.id)
                                    ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-[#1a1a1a] border-neutral-800 text-slate-500 hover:border-neutral-700 hover:bg-[#1f1f1f]"
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                 </div>
               </div>
            </div>

            <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black tracking-widest uppercase text-sm py-7 rounded-2xl shadow-xl shadow-indigo-500/10 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Guardando..." : isSubmitted ? "Actualizar Wellness" : "Enviar Wellness Diario"}
                </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
