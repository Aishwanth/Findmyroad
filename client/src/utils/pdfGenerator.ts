import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ITopWorstReport } from '../types';

export interface IPdfExportOptions {
  reports: ITopWorstReport[];
  cityName?: string;
  filterMode?: string;
  scoringModel?: Record<string, string>;
}

/**
 * Generates an authoritative municipal PDF report for the Top 5 Worst Potholes
 */
export async function generateTopWorstPotholesPdf(options: IPdfExportOptions): Promise<void> {
  const { reports, cityName = 'Hyderabad', filterMode = 'all', scoringModel } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // #0f172a slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(34, 197, 94); // #22c55e emerald
  doc.circle(16, 14, 5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('AI', 14.5, 16.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FixMyRoad AI', 26, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 197, 94);
  doc.text('MUNICIPAL INFRASTRUCTURE & CIVIC ROAD SAFETY REPORT', 26, 21);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - 14, 13, { align: 'right' });
  doc.text(`Zone Scope: ${cityName}`, pageWidth - 14, 19, { align: 'right' });

  // --- REPORT TITLE & SUBTITLE ---
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 5 Worst Potholes in Your City — Priority Assessment', 14, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    'Authoritative municipal prioritization based on computer vision severity, aging duration, citizen upvotes, and weather flood risks.',
    14,
    44
  );

  // --- EXECUTIVE SUMMARY CARD ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 48, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const criticalHighCount = reports.filter(
    (r) => r.severity === 'high' || r.severityCategory === 'critical'
  ).length;

  doc.text(`Total Candidates Evaluated: ${reports.length >= 5 ? '5+' : reports.length}`, 18, 55);
  doc.text(`High / Critical Hazards: ${criticalHighCount} of ${reports.length}`, 80, 55);
  doc.text(`Active Filter: ${filterMode.toUpperCase()}`, 145, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const scoringSummary = scoringModel
    ? `Scoring Model: High Severity (${scoringModel.highSeverity}) + Aging (${scoringModel.agingFactor}) + Upvotes (${scoringModel.upvoteFactor}) + Rain Bonus (${scoringModel.rainHazardBonus})`
    : 'Scoring Model: High Severity (50 pts) + Aging (3 pts/day, max 30) + Upvotes (1.5 pts/ea, max 20) + Rain Flood Bonus (15 pts)';
  doc.text(scoringSummary, 18, 65);

  // --- TOP 5 REPORT CARDS TABLE ---
  const tableRows = reports.map((report, idx) => {
    const rank = `#${idx + 1}`;
    const score = report.numericalSeverityScore || (report.severity === 'high' ? 88 : report.severity === 'medium' ? 55 : 25);
    const category = (report.severityCategory || (score >= 80 ? 'critical' : score >= 60 ? 'high' : 'medium')).toUpperCase();

    const locationBlock = `${report.location}\nLandmark: ${report.landmark || 'N/A'}\nTicket ID: ${report.ticketId}`;
    const severityBlock = `${category} SEVERITY\nScore: ${score}/100\nPriority: ${report.priorityScore || score} pts`;
    const aiAssessmentBlock = `${report.damageType || 'Pothole'}\n${report.aiExplanation || report.description || 'Verified road cavity.'}`;
    
    const daysUnresolved = report.scoreBreakdown?.daysUnresolved != null
      ? `${report.scoreBreakdown.daysUnresolved} days`
      : `${Math.round((Date.now() - new Date(report.submittedAt).getTime()) / (1000 * 60 * 60 * 24) * 10) / 10} days`;

    const statusBlock = `Status: ${report.status}\nUnresolved: ${daysUnresolved}\nUpvotes: ${report.upvotes || 0}\nGPS: ${
      report.coordinates ? `${report.coordinates.lat.toFixed(4)}, ${report.coordinates.lng.toFixed(4)}` : 'Approximate'
    }`;

    return [rank, locationBlock, severityBlock, aiAssessmentBlock, statusBlock];
  });

  const tableConfig: any = {
    startY: 76,
    head: [['Rank', 'Location & Landmark', 'Severity & Score', 'AI Assessment', 'Status & Verification']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [21, 128, 61] },
      1: { cellWidth: 48 },
      2: { cellWidth: 34, fontStyle: 'bold' },
      3: { cellWidth: 48 },
      4: { cellWidth: 38 },
    },
    didDrawPage: (data: any) => {
      // Footer on every page
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Disclaimer: FixMyRoad AI generates advisory severity estimates to support municipal operations dispatch. Official engineering field inspection is recommended.',
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  };

  // Resilient autoTable execution supporting all module styles
  if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(tableConfig);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, tableConfig);
  } else if ((autoTable as any).default && typeof (autoTable as any).default === 'function') {
    (autoTable as any).default(doc, tableConfig);
  }

  // Generate standardized filename
  const filenameDate = new Date().toISOString().split('T')[0];
  const filename = `FixMyRoad_Top5_Worst_Potholes_${filenameDate}.pdf`;

  // Standard Blob-based Download with 100% Valid PDF Binary Payload
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
  } catch {
    // Fallback to jsPDF standard save
    doc.save(filename);
  }
}
