import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateTeamReport = (data: any) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    console.log("Generating Team Report with data:", data);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('LoadTrack Rugby - Team Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${date}`, 14, 30);

    // Summary Cards Section
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Squad Summary (Last 7 Days)', 14, 45);

    let topSpeedVal = 'N/A';
    if (data.topSpeeds && data.topSpeeds.length > 0 && data.topSpeeds[0].top_speed_max != null) {
        topSpeedVal = `${Number(data.topSpeeds[0].top_speed_max).toFixed(1)} km/h`;
    }

    const summaryData = [
        ['Total Players', data.totalPlayers || 0],
        ['Team Distance (km)', data.distanceKm || 0],
        ['High Risk Players (ACWR > 1.5)', data.highRiskPlayers || 0],
        ['Team Peak Velocity', topSpeedVal]
    ];

    autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] as [number, number, number] },
    });

    // Positional Averages Table
    const lastY1 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 70;
    doc.setFontSize(14);
    doc.text('Positional Averages', 14, lastY1 + 15);

    const positionalData = (data.positionalAverages || []).map((pos: any) => [
        pos.position || 'Unknown',
        `${pos.avgHsr || 0}m`,
        pos.avgAccel || 0
    ]);

    autoTable(doc, {
        startY: lastY1 + 20,
        head: [['Position', 'Avg HSR (m)', 'Avg Accelerations']],
        body: positionalData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] as [number, number, number] }, // Blue-500
    });

    // Top Speed Leaderboard
    const lastY2 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : lastY1 + 50;
    doc.setFontSize(14);
    doc.text('Top Speed Leaderboard', 14, lastY2 + 15);

    const speedData = (data.topSpeeds || []).map((p: any, i: number) => {
        const speed = p.top_speed_max != null ? Number(p.top_speed_max).toFixed(1) : '0.0';
        return [
            i + 1,
            p.name || 'Unknown',
            p.position || 'N/A',
            `${speed} km/h`
        ];
    });

    autoTable(doc, {
        startY: lastY2 + 20,
        head: [['Rank', 'Player', 'Position', 'Max Speed']],
        body: speedData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] as [number, number, number] }, // Amber-500
    });

    // Footer
    const finalPageCount = typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : (doc as any).internal.pages.length - 1;

    for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${finalPageCount}`, 196, 285, { align: 'right' });
    }

    doc.save(`Team_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePlayerReport = (player: any) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    console.log("Generating Player Report for:", player.name);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(`LoadTrack - ${player.name}`, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100);
    const peakSpeed = player.top_speed_max != null ? `${Number(player.top_speed_max).toFixed(1)} km/h` : 'N/A';
    doc.text(`${player.position || 'N/A'} | Peak Speed: ${peakSpeed}`, 14, 30);
    doc.text(`Generated on: ${date}`, 14, 36);

    // Injury Risk Section
    const risk = player.injuryRisk || { riskLevel: 'LOW', daysSince: 0, sessionsSince: 0 };
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(14);
    if (risk.riskLevel === 'HIGH') doc.setTextColor(225, 29, 72); // Rose-600
    else if (risk.riskLevel === 'MODERATE') doc.setTextColor(217, 119, 6); // Amber-600
    else doc.setTextColor(5, 150, 105); // Emerald-600

    doc.text(`Injury Risk Level: ${risk.riskLevel}`, 14, 52);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Days since 90% top speed exposure: ${risk.daysSince || 0} days`, 14, 58);
    doc.text(`Sessions since 90% top speed exposure: ${risk.sessionsSince || 0} sessions`, 14, 64);

    // Recent Sessions Table
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Recent Session Performance', 14, 75);

    const sessionData = (player.loadTrend || []).map((s: any) => [
        s.date || 'N/A',
        `${s.hsr || 0}m`,
        s.accel || 0,
        s.load || 0,
        `${s.topSpeed != null ? Number(s.topSpeed).toFixed(1) : '0.0'} km/h`
    ]);

    autoTable(doc, {
        startY: 80,
        head: [['Date', 'HSR', 'Accel', 'Load', 'Top Speed']],
        body: sessionData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] as [number, number, number] },
    });

    // Comparison Table
    const lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
    doc.setFontSize(14);
    doc.text('Benchmarking vs Position Average', 14, lastY + 15);

    const comp = player.comparison || { playerAvgHsr: 0, posAvgHsr: 0, playerAvgAccel: 0, posAvgAccel: 0, playerAvgLoad: 0, posAvgLoad: 0 };
    const getPercent = (p: number, b: number) => {
        if (!b) return '-%';
        return `${((p / b) * 100).toFixed(0)}%`;
    };

    const comparisonData = [
        ['HSR Distance', `${comp.playerAvgHsr || 0}m`, `${comp.posAvgHsr || 0}m`, getPercent(comp.playerAvgHsr || 0, comp.posAvgHsr || 0)],
        ['Accelerations', comp.playerAvgAccel || 0, comp.posAvgAccel || 0, getPercent(comp.playerAvgAccel || 0, comp.posAvgAccel || 0)],
        ['Player Load', comp.playerAvgLoad || 0, comp.posAvgLoad || 0, getPercent(comp.playerAvgLoad || 0, comp.posAvgLoad || 0)]
    ];

    autoTable(doc, {
        startY: lastY + 20,
        head: [['Metric', 'Player Avg', 'Positional Avg', '% of Avg']],
        body: comparisonData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] as [number, number, number] },
    });

    // Footer
    const finalPageCount = typeof doc.getNumberOfPages === 'function' ? doc.getNumberOfPages() : (doc as any).internal.pages.length - 1;

    for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${finalPageCount}`, 196, 285, { align: 'right' });
    }

    doc.save(`Report_${(player.name || 'Player').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
