import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import type { MarginSettings } from './nilaiRaporTable';

/**
 * Generate Kokurikuler table (single column, full width)
 * Width: 170mm (same as nilai table: 10+40+20+100)
 */
export async function generateKokurikulerTable(
    doc: jsPDF,
    startY: number,
    deskripsi: string,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - margins.margin_left - margins.margin_right; // Dynamic width
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = startY;

    // Content calculation first (before drawing anything)
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    const padding = 2;
    const lineHeight = 3.7;
    const maxWidth = pageWidth - margins.margin_left - margins.margin_right - (padding * 2);

    // Split deskripsi into lines to calculate height
    const lines = doc.splitTextToSize(deskripsi || 'Tidak ada deskripsi kokurikuler.', maxWidth);

    // Calculate content height
    const headerHeight = 8;
    const contentHeight = Math.max(15, lines.length * lineHeight + (padding * 2));
    const totalTableHeight = headerHeight + contentHeight;

    // Check if entire table fits on current page BEFORE drawing header
    if (startY + totalTableHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Reserve space for student header info
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;
    }

    // NOW draw the header (on correct page)
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(leftMargin, yPos, tableWidth, headerHeight, 'FD');

    // Center text vertically
    const headerTextY = yPos + (headerHeight / 2) + 1.3;
    doc.text('KOKURIKULER', leftMargin + tableWidth / 2, headerTextY, { align: 'center' });

    yPos += headerHeight;

    // Reset font for content
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    // Draw content rectangle
    doc.rect(leftMargin, yPos, tableWidth, contentHeight);

    // Draw text content
    let textY = yPos + padding + 3;
    lines.forEach((line: string) => {
        doc.text(line, leftMargin + padding, textY, {
            align: 'justify',
            maxWidth: maxWidth
        });
        textY += lineHeight;
    });

    yPos += contentHeight;

    return yPos;
}
