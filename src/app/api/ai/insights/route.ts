import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCoachInsight } from "@/lib/ai/ai-service";
import { checkSession } from "@/lib/api-protection";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
    try {
        const { error, session } = await checkSession(["ADMIN", "STAFF"]);
        if (error) return error;

        const today = new Date();
        const last7DaysStart = startOfDay(subDays(today, 6));

        // 1. Gather Team Data for Prompt
        const totalPlayers = await prisma.player.count();
        const highRiskPlayers = await prisma.player.findMany({
            where: { status: { contains: "HIGH" } },
            select: { name: true, status: true }
        });

        const recentSessions = await prisma.session.findMany({
            where: { date: { gte: last7DaysStart } },
            include: { data: true }
        });

        // 2. Format Data for the AI
        const sessionSummary = recentSessions.map(s => ({
            date: s.date.toISOString().split('T')[0],
            type: s.type,
            avgLoad: s.data.length ? s.data.reduce((acc, d) => acc + d.player_load, 0) / s.data.length : 0
        }));

        const prompt = `
            Eres un experto científico del deporte y preparador físico de un equipo de rugby profesional.
            Analiza los siguientes datos del equipo y proporciona un "Daily Briefing" estratégico para el head coach.
            
            DATOS DEL EQUIPO:
            - Jugadores Totales: ${totalPlayers}
            - Jugadores en Riesgo Alto (ACWR > 1.5): ${highRiskPlayers.map(p => p.name).join(", ") || "Ninguno"}
            - Resumen de Cargas de la última semana: ${JSON.stringify(sessionSummary)}
            
            REGLAS DE RESPUESTA:
            1. Usa un tono profesional pero directo.
            2. Divide la respuesta en 3 secciones usando '### ' para los títulos:
               - ### 🛡️ Resumen de Disponibilidad y Riesgos
               - ### 🏃 Performance Highlights
               - ### 💡 Sugerencia Técnica
            3. Responde en Español.
            4. Destaca nombres de jugadores o métricas clave usando **negrita**.
        `.trim();

        const insight = await generateCoachInsight(prompt);

        return NextResponse.json({ insight });
    } catch (err) {
        console.error("AI Insights API Error:", err);
        return NextResponse.json({ error: "Failed to generate AI insights" }, { status: 500 });
    }
}
