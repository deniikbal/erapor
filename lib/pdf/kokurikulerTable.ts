import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';
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
    const tableWidth = 170; // Same as nilai table total width
    const pageHeight = doc.internal.pageSize.getHeight();

    let yPos = startY;

    // Check if header fits, if not add new page
    if (yPos + 12 > pageHeight - margins.margin_bottom) {
        doc.addPage();
        yPos = margins.margin_top;
    }

    // Draw header "KOKURIKULER"
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    const headerHeight = 8;
    doc.rect(leftMargin, yPos, tableWidth, headerHeight);

    // Center text vertically: yPos + (height / 2) + small offset for font
    const textY = yPos + (headerHeight / 2) + 2.5;
    doc.text('KOKURIKULER', leftMargin + tableWidth / 2, textY, { align: 'center' });

    yPos += headerHeight;

    // Content area
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(8);

    const padding = 3;
    const lineHeight = 4;
    const maxWidth = tableWidth - (padding * 2);

    // Split deskripsi into lines
    const lines = doc.splitTextToSize(deskripsi || 'Tidak ada deskripsi kokurikuler.', maxWidth);

    // Calculate content height
    const contentHeight = Math.max(15, lines.length * lineHeight + (padding * 2));

    // Check if content fits on current page
    if (yPos + contentHeight > pageHeight - margins.margin_bottom) {
        // Content doesn't fit, need to split across pages

        // Calculate how many lines fit on current page
        const remainingSpace = pageHeight - margins.margin_bottom - yPos;
        const linesFitOnPage = Math.floor((remainingSpace - (padding * 2)) / lineHeight);

        if (linesFitOnPage > 0) {
            // Draw partial content on current page
            const currentPageLines = lines.slice(0, linesFitOnPage);
            const currentPageHeight = currentPageLines.length * lineHeight + (padding * 2);

            doc.rect(leftMargin, yPos, tableWidth, currentPageHeight);

            let textY = yPos + padding + 3;
            currentPageLines.forEach((line: string) => {
                doc.text(line, leftMargin + padding, textY, {
                    align: 'justify',
                    maxWidth: maxWidth
                });
                textY += lineHeight;
            });

            // New page for remaining content
            doc.addPage();
            yPos = margins.margin_top;

            // Draw remaining lines
            const remainingLines = lines.slice(linesFitOnPage);
            const remainingHeight = remainingLines.length * lineHeight + (padding * 2);

            doc.rect(leftMargin, yPos, tableWidth, remainingHeight);

            textY = yPos + padding + 3;
            remainingLines.forEach((line: string) => {
                doc.text(line, leftMargin + padding, textY, {
                    align: 'justify',
                    maxWidth: maxWidth
                });
                textY += lineHeight;
            });

            yPos += remainingHeight;
        } else {
            // No space at all, start fresh on new page
            doc.addPage();
            yPos = margins.margin_top;

            doc.rect(leftMargin, yPos, tableWidth, contentHeight);

            let textY = yPos + padding + 3;
            lines.forEach((line: string) => {
                doc.text(line, leftMargin + padding, textY, {
                    align: 'justify',
                    maxWidth: maxWidth
                });
                textY += lineHeight;
            });

            yPos += contentHeight;
        }
    } else {
        // Content fits on current page
        doc.rect(leftMargin, yPos, tableWidth, contentHeight);

        let textY = yPos + padding + 3;
        lines.forEach((line: string) => {
            doc.text(line, leftMargin + padding, textY, {
                align: 'justify',
                maxWidth: maxWidth
            });
            textY += lineHeight;
        });

        yPos += contentHeight;
    }

    return yPos;
}
