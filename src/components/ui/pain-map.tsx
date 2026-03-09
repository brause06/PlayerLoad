import React from "react";

interface JointPain {
  id: string;
  label: string;
  intensity: number;
  x: string;
  y: string;
}

const JOINTS = [
  { id: 'tobillo_l', label: 'Tobillo Izquierdo', x: '45%', y: '85%' },
  { id: 'tobillo_r', label: 'Tobillo Derecho', x: '55%', y: '85%' },
  { id: 'rodilla_l', label: 'Rodilla Izquierda', x: '45%', y: '70%' },
  { id: 'rodilla_r', label: 'Rodilla Derecha', x: '55%', y: '70%' },
  { id: 'cadera_l', label: 'Cadera Izquierda', x: '44%', y: '50%' },
  { id: 'cadera_r', label: 'Cadera Derecha', x: '56%', y: '50%' },
  { id: 'hombro_l', label: 'Hombro Izquierdo', x: '35%', y: '25%' },
  { id: 'hombro_r', label: 'Hombro Derecho', x: '65%', y: '25%' },
];

const MUSCLES = [
  { id: 'isquios', label: 'Isquios' },
  { id: 'cuadriceps', label: 'Cuadríceps' },
  { id: 'gemelos', label: 'Gemelos' },
  { id: 'tren_superior', label: 'Tren Superior' },
  { id: 'cuello', label: 'Cuello' },
  { id: 'espalda_baja', label: 'Espalda Baja' }
];

export function PainMap({ jointPainMap = {}, musclePainMap = [] }: { jointPainMap?: Record<string, number>, musclePainMap?: string[] }) {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-center justify-center p-4 bg-[#0d0d0d] rounded-2xl border border-neutral-800">
      {/* Front View / Joints */}
      <div className="space-y-4 flex-1">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 text-center mb-2">Dolores Articulares</h4>
        <div className="relative w-full aspect-[1/1.5] max-w-[180px] mx-auto bg-neutral-900/50 rounded-3xl border border-neutral-800/50 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 150" className="w-full h-full opacity-10 fill-white">
            <path d="M50,10c5,0,10,5,10,10s-5,10-10,10s-10-5-10-10S45,10,50,10z M40,35c-5,0-15,5-15,15v30c0,5,5,10,10,10h5v45c0,5,5,10,10,10s10-5,10-10v-45h5c5,0,10-5,10-10V50c0-10-10-15-15-15H40z" />
          </svg>

          {JOINTS.map((j) => {
            const intensity = jointPainMap[j.id];
            if (!intensity) return null;
            
            return (
              <div
                key={j.id}
                className={`absolute w-6 h-6 rounded-full border border-white/20 transition-all flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-pulse ${
                  intensity >= 7 ? "bg-rose-500 shadow-rose-500/50" : "bg-amber-500 shadow-amber-500/50"
                }`}
                style={{ left: j.x, top: j.y, transform: 'translate(-50%, -50%)' }}
                title={`${j.label}: ${intensity}/10`}
              >
                {intensity}
              </div>
            );
          })}
        </div>
      </div>

      {/* Muscle List */}
      <div className="flex-1 space-y-4">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 text-center md:text-left mb-2">Músculos Afectados</h4>
        <div className="grid grid-cols-2 gap-2">
          {MUSCLES.map((m) => {
            const isActive = musclePainMap.includes(m.id);
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center transition-all ${
                  isActive
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10"
                    : "bg-[#141414] border-neutral-800/50 text-slate-600 opacity-40"
                }`}
              >
                {m.label}
              </div>
            );
          })}
        </div>
        {musclePainMap.length === 0 && Object.keys(jointPainMap).length === 0 && (
          <p className="text-[10px] text-slate-500 text-center italic mt-4">Sin dolores reportados</p>
        )}
      </div>
    </div>
  );
}
