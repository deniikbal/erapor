import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import type { MarginSettings } from './nilaiRaporTable';

export interface CatatanWaliData {
    deskripsi: string;
}

/**
 * Generate Catatan Wali Kelas table
 * Header width: 112mm, height: 9mm
 * Content: Variable height based on text
 */
export async function generateCatatanWaliTable(
    doc: jsPDF,
    startY: number,
    startX: number,
    catatanData: CatatanWaliData | null,
    margins: MarginSettings
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Calculate dynamic width: from startX to right margin
    const tableWidth = pageWidth - startX - margins.margin_right;
    const headerHeight = 9; // 9mm height

    let yPos = startY;

    // Draw header "Catatan Wali Kelas"
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    // Draw header rectangle
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(startX, yPos, tableWidth, headerHeight, 'FD');

    // Center text vertically in header
    const headerTextY = yPos + (headerHeight / 2) + 1.5;
    doc.text('Catatan Wali Kelas', startX + tableWidth / 2, headerTextY, { align: 'center' });

    yPos += headerHeight;

    // Content area
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    const padding = 3;
    const lineHeight = 4;
    const maxWidth = tableWidth - (padding * 2);

    // Get deskripsi text
    const deskripsi = catatanData?.deskripsi || '-';

    // Split deskripsi into lines
    const lines = doc.splitTextToSize(deskripsi, maxWidth);

    // Calculate content height (minimum 18mm to match 3 rows of attendance = 3*6 = 18mm)
    const minContentHeight = 18; // Match attendance table 3 rows height
    const calculatedHeight = lines.length * lineHeight + (padding * 2);
    const contentHeight = Math.max(minContentHeight, calculatedHeight);

    // NOTE: No page break logic here because this table is always side-by-side with kehadiran table.
    // Page break is handled by the kehadiran table or at the calling level.

    // Draw content rectangle
    doc.rect(startX, yPos, tableWidth, contentHeight);

    // Draw text content
    let textY = yPos + padding + 3;
    lines.forEach((line: string) => {
        doc.text(line, startX + padding, textY, {
            align: 'justify',
            maxWidth: maxWidth
        });
        textY += lineHeight;
    });

    return yPos + contentHeight;
}
