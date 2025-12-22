import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';
import type { MarginSettings } from './nilaiRaporTable';

/**
 * Generate Tanggapan Orang Tua/Wali Murid table (empty table for parent feedback)
 * Header: 170mm width × 8mm height
 * Content: 170mm width × 22mm height (empty)
 */
export async function generateTanggapanOrtuTable(
    doc: jsPDF,
    startY: number,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - margins.margin_left - margins.margin_right; // Dynamic width
    const headerHeight = 8; // 8mm
    const contentHeight = 22; // 22mm
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = startY;

    // Check if table fits, if not add new page
    const totalTableHeight = headerHeight + contentHeight;
    if (yPos + totalTableHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Reserve space for student header info
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;
    }

    // Draw header "Tanggapan Orang Tua/Wali Murid"
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    // Draw header rectangle
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(leftMargin, yPos, tableWidth, headerHeight, 'FD');

    // Center text vertically in header
    const headerTextY = yPos + (headerHeight / 2) + 1.3;
    doc.text('Tanggapan Orang Tua/Wali Murid', leftMargin + tableWidth / 2, headerTextY, { align: 'center' });

    yPos += headerHeight;

    // Draw empty content area
    doc.rect(leftMargin, yPos, tableWidth, contentHeight);

    yPos += contentHeight;

    return yPos;
}
