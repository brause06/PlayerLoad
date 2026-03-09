/**
 * Core service for AI interactions (Google Gemini API).
 */
export async function generateCoachInsight(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("[AI-SERVICE] GEMINI_API_KEY not found. Returning mock response.");
        return getMockInsight();
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to call Gemini API");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error("[AI-SERVICE] Error calling Gemini API:", err);
        return "Lo siento, hubo un problema al generar los insights de IA. Por favor, revisa la configuración.";
    }
}

function getMockInsight() {
    return `
### 🛡️ Resumen de Disponibilidad y Riesgos
Hoy tenemos 2 jugadores en la "Zona Roja" (ACWR > 1.5). **Alejandro Molina** muestra un incremento de carga del 25% respecto a la semana pasada coincidiendo con una caída en su calidad de sueño (4/10). Se recomienda reducir su volumen de carrera un 30% en la sesión de hoy.

### 🏃 Performance Highlights
El grupo de **Backs** alcanzó un promedio de HSR de 450m en la sesión de ayer, superando el promedio semanal en un 15%. **Mateo Perillo** registró su velocidad máxima de la temporada (32.4 km/h).

### 💡 Sugerencia Técnica
Basado en los reportes de fatiga acumulada (promedio 7/10), el bloque de contacto de mañana debería limitarse a 15 minutos para preservar la frescura muscular de cara al partido del sábado.
    `.trim();
}
