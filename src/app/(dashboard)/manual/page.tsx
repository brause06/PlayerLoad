import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, BarChart2, Users, Upload, Bell, ShieldCheck } from "lucide-react";

export default function ManualPage() {
  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Manual de Uso</h1>
          <p className="text-slate-400 mt-1 uppercase tracking-widest text-[10px] font-bold">
            Guía completa del sistema LoadTrack Rugby
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        
        {/* Section 1: Dashboard y Métricas */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              1. Dashboard General
            </CardTitle>
            <CardDescription className="text-slate-500">Métricas principales y promedios del equipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>El Team Dashboard es la pantalla inicial y te muestra un resumen de los últimos 7 días y la salud general del equipo.</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Weekly Distance (Avg):</strong> Representa el <em>promedio</em> de distancia recorrida en la semana (últimos 7 días). Se calcula dividiendo la suma total de kilómetros entre la cantidad de jugadores activos.</li>
              <li><strong className="text-white">Match vs Training (Load):</strong> Compara el "Player Load" promedio histórico de los Partidos Oficiales (Match Avg) contra la <em>Peak Training Session</em> (la sesión de entrenamiento con mayor Carga Promedio en los últimos 14 días) para verificar que se esté entrenando a la intensidad del juego.</li>
              <li><strong className="text-white">High Risk Players:</strong> Cantidad de jugadores que actualmente superan un ACWR de 1.5, lo cual los denomina en zona de riesgo de sobrecarga o posible lesión.</li>
              <li><strong className="text-white">Top Speeds (Contextual):</strong> En las tablas de velocidades récord, basta con mirar el tiempo y tipo de sesión registrados debajo de la velocidad para saber bajo qué contexto el jugador logró ese récord.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 2: Readiness */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              2. Readiness Board (Disponibilidad)
            </CardTitle>
            <CardDescription className="text-slate-500">Gestión de fatiga, recuperaciones y prevención</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>Esta sección consolida la información de GPS (Carga extrínseca) con la del reporte de wellness diario (Carga intrínseca y dolores) para determinar si un jugador está listo para entrenar.</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">ACWR (Acute:Chronic Workload Ratio):</strong> Es la división entre la carga de la última semana (Aguda) vs el promedio de las últimas 4 semanas (Crónica). Un valor entre <strong>0.8 y 1.3 es OPITMO</strong> (Verde/Green). Un valor de <strong>&gt; 1.5 es PELIGROSO</strong> (Rojo/Out) e indica un riesgo inminente de lesión por pico de carga.</li>
              <li><strong className="text-white">Wellness (WEL):</strong> Puntaje del 1 al 100 basado en el formulario subjetivo que llena el jugador desde su celular cada mañana (Sueño, Estrés, Fatiga y Dolencias Musculares).</li>
              <li><strong className="text-white">Categorías de Estatus:</strong> 
                <br/>- <span className="text-emerald-400">Green (Optimal):</span> Listo para el 100% de intensidad.
                <br/>- <span className="text-amber-400">Modified:</span> Requiere adaptar volumen (menos carga) o está sobre-fatigado.
                <br/>- <span className="text-rose-400">Out / Monitor:</span> Jugador con reporte de dolor muy agudo, golpe articular riesgoso o ACWR excesivo. Sujeto a evaluación kinesiológica.
              </li>
              <li><strong className="text-white">Filtros:</strong> Arriba tienes filtros interactivos por Nombre, Posición, Estatus Visual y un Ordenamiento automático para encontrar rápudo quién necesita descanso.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3: Sessions & Drills */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-400" />
              3. Visualización de Sesiones & Drills
            </CardTitle>
            <CardDescription className="text-slate-500">Cruce de Alta Velocidad e Intensidad por metraje.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <p>Al hacer clic en cualquier Sesión, LoadTrack procesa gráficas individuales que cruzan múltiples variables:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Player HSR vs ACCEL (Cuadrante):</strong> Este diagrama de dispersión te muestra el desempeño individual en función al promedio del equipo de ese mismo día (líneas punteadas). 
               Un jugador que en este gráfico aparece Arriba y a la Derecha (Verde) corrió más distancia a alta velocidad (HSR) y aceleró más veces que el resto del plantel.
              </li>
              <li><strong className="text-white">Drill Breakdown (Gráficos por Bloque):</strong> Los archivos de GPS suelen estar partidos por ejercicios (Drills). LoadTrack lee cada archivo y muestra la información en barras comparativas por bloque para: HSR (Metros de Alta Velocidad), ACC (Aceleraciones), DEC (Frenadas o Desaceleraciones) y HMLD (Player Load).</li>
              <li><strong className="text-white">Metros / Minuto (Intensidad):</strong> En la esquina superior derecha de cada Drill verás el valor de "m/min". Se calcula sumando la Distancia Total de un bloque y dividiéndolo entre su duración en minutos. Es tu indicador #1 de la intensidad del bloque para replicar escenarios de partido.</li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Section 4: Data Import */}
        <Card className="bg-[#111111] border-neutral-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              4. Importación de GPS y Evaluaciones
            </CardTitle>
            <CardDescription className="text-slate-500">Carga de archivos y macheo de jugadores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
             <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-white">Importar Sesión General:</strong> Para cargar Data de sesión común, dirígete a `Import Data` -&gt; `Session Dataset (STATSports/Catapult)`. Seleccionás la fecha, el tipo de sesión y subes el archivo CSV con los cortes deseados.</li>
              <li><strong className="text-white">Importar Speed Evaluation:</strong> En el área roja de la solapa `Import`, puedes ingresar periódicamente un CSV de "Speed Evaluations". El sistema inteligente va a leer todas las velocidades máximas del Excel (Top Speed), identificar fonéticamente al jugador evitando duplicados y —solamente si su nueva velocidad es mayor a la anterior— quedará guardado su nuevo registro récord en el Perfil del Jugador. Esta información es crucial para establecer la línea base del 100% de cada jugador en los reportes de Exposición Acumulada.</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
