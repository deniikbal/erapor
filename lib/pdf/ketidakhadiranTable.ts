import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';
import type { MarginSettings } from './nilaiRaporTable';

export interface AttendanceData {
    sakit: number;
    izin: number;
    alpha: number; // Tanpa Keterangan / Alpha
}

/**
 * Generate Ketidakhadiran (Attendance) table
 * Header width: 53mm, height: 9mm
 * Content: 3 rows x 2 columns
 */
export async function generateKetidakhadiranTable(
    doc: jsPDF,
    startY: number,
    attendanceData: AttendanceData,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const tableWidth = 53; // 53mm width
    const headerHeight = 9; // 9mm height
    const rowHeight = 6; // Height for each data row
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = startY;

    // NOTE: Page break is handled at the calling level to ensure this table
    // and the catatan wali table (which is side-by-side) stay on the same page.

    // Draw header "Ketidakhadiran"
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    // Draw header rectangle
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(leftMargin, yPos, tableWidth, headerHeight, 'FD');

    // Center text vertically in header (adjusted to match data rows)
    const headerTextY = yPos + (headerHeight / 2) + 1.5;
    doc.text('Ketidakhadiran', leftMargin + tableWidth / 2, headerTextY, { align: 'center' });

    yPos += headerHeight;

    // Define column widths (2 columns)
    const col1Width = tableWidth * 0.65; // ~65% for label column
    const col2Width = tableWidth * 0.35; // ~35% for value column

    // Switch to normal font for content
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    // Row data
    const rows = [
        { label: 'Sakit', value: attendanceData.sakit },
        { label: 'Izin', value: attendanceData.izin },
        { label: 'Tanpa Keterangan', value: attendanceData.alpha }
    ];

    // Draw rows
    rows.forEach((row) => {
        // Draw left column (label)
        doc.rect(leftMargin, yPos, col1Width, rowHeight);
        // Vertical center: rowHeight/2 + baseline offset
        const labelTextY = yPos + (rowHeight / 2) + 1.3;
        doc.text(row.label, leftMargin + 3, labelTextY);

        // Draw right column (value with colon)
        doc.rect(leftMargin + col1Width, yPos, col2Width, rowHeight);
        const valueText = `: ${row.value} hari`;
        const valueTextY = yPos + (rowHeight / 2) + 1.3;
        doc.text(valueText, leftMargin + col1Width + 3, valueTextY);

        yPos += rowHeight;
    });

    return yPos;
}
