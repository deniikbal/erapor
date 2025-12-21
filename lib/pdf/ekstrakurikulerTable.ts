import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';
import type { MarginSettings } from './nilaiRaporTable';

interface EkstraData {
    nama_ekstra: string;
    nilai_ekstra: string;
    deskripsi: string;
}

/**
 * Generate Ekstrakurikuler table
 * Columns: No (8mm), Ekstrakurikuler (50mm), Keterangan (112mm)
 * Total width: 170mm (same as other tables)
 */
export async function generateEkstrakurikulerTable(
    doc: jsPDF,
    startY: number,
    ekstraList: EkstraData[],
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Column widths
    const col1Width = 8;    // No
    const col2Width = 50;   // Ekstrakurikuler
    const col3Width = 112;  // Keterangan
    const totalWidth = col1Width + col2Width + col3Width; // 170mm

    // Column X positions
    const col1X = leftMargin;
    const col2X = col1X + col1Width;
    const col3X = col2X + col2Width;

    let yPos = startY;

    // Check if header + at least one row fits (header 8mm + min row 10mm = 18mm)
    const headerHeight = 8;
    const minRowHeight = 10;
    const minRequiredSpace = headerHeight + minRowHeight;

    if (yPos + minRequiredSpace > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Reserve space for student header info
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;
    }

    // Draw table header
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);
    doc.setLineWidth(0.3);

    // Draw header cells
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(col1X, yPos, col1Width, headerHeight, 'FD');
    doc.rect(col2X, yPos, col2Width, headerHeight, 'FD');
    doc.rect(col3X, yPos, col3Width, headerHeight, 'FD');

    // Header text (vertically centered)
    const headerTextY = yPos + (headerHeight / 2) + 1.3;
    doc.text('No', col1X + col1Width / 2, headerTextY, { align: 'center' });
    doc.text('Ekstrakurikuler', col2X + col2Width / 2, headerTextY, { align: 'center' });
    doc.text('Keterangan', col3X + col3Width / 2, headerTextY, { align: 'center' });

    yPos += headerHeight;

    // Check if there's any data
    if (!ekstraList || ekstraList.length === 0) {
        // Draw empty row
        await setDejaVuFont(doc, 'normal');
        doc.setFontSize(9);

        const emptyRowHeight = 10;
        doc.rect(col1X, yPos, col1Width, emptyRowHeight);
        doc.rect(col2X, yPos, col2Width, emptyRowHeight);
        doc.rect(col3X, yPos, col3Width, emptyRowHeight);

        const emptyTextY = yPos + (emptyRowHeight / 2) + 2;
        doc.text('-', col3X + col3Width / 2, emptyTextY, { align: 'center' });

        yPos += emptyRowHeight;
        return yPos;
    }

    // Draw data rows
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    const lineHeight = 4;

    for (let i = 0; i < ekstraList.length; i++) {
        const ekstra = ekstraList[i];

        // Text wrapping for nama ekstra
        const ekstraLines = doc.splitTextToSize(ekstra.nama_ekstra || '-', col2Width - 4);

        // Text wrapping for keterangan
        const keteranganText = ekstra.deskripsi || '-';
        const keteranganLines = doc.splitTextToSize(keteranganText, col3Width - 4);

        // Calculate row height
        const maxLines = Math.max(ekstraLines.length, keteranganLines.length);
        const rowHeight = Math.max(10, maxLines * lineHeight + 4);

        // Check if row fits on current page
        if (yPos + rowHeight > pageHeight - margins.margin_bottom) {
            doc.addPage();

            // Reserve space for student header info (will be added later in post-processing)
            // Student header info is ~21mm tall (4 rows + spacing + reduced gap)
            const studentHeaderHeight = 21;
            yPos = margins.margin_top + studentHeaderHeight;

            // Redraw header on new page
            await setDejaVuFont(doc, 'bold');
            doc.setFontSize(9);

            doc.rect(col1X, yPos, col1Width, headerHeight);
            doc.rect(col2X, yPos, col2Width, headerHeight);
            doc.rect(col3X, yPos, col3Width, headerHeight);

            doc.text('No', col1X + col1Width / 2, yPos + (headerHeight / 2) + 1.3, { align: 'center' });
            doc.text('Ekstrakurikuler', col2X + col2Width / 2, yPos + (headerHeight / 2) + 1.3, { align: 'center' });
            doc.text('Keterangan', col3X + col3Width / 2, yPos + (headerHeight / 2) + 1.3, { align: 'center' });

            yPos += headerHeight;

            // Reset font to normal
            await setDejaVuFont(doc, 'normal');
            doc.setFontSize(9);
        }

        // Draw row cells
        doc.rect(col1X, yPos, col1Width, rowHeight);
        doc.rect(col2X, yPos, col2Width, rowHeight);
        doc.rect(col3X, yPos, col3Width, rowHeight);

        // No (centered vertically)
        const centerY = yPos + (rowHeight / 2) + 2;
        doc.text((i + 1).toString(), col1X + col1Width / 2, centerY, { align: 'center' });

        // Ekstrakurikuler name (left-aligned, vertically centered)
        const ekstraTextY = yPos + (rowHeight / 2) - ((ekstraLines.length - 1) * lineHeight / 2) + 2;
        let currentY = ekstraTextY;
        ekstraLines.forEach((line: string) => {
            doc.text(line, col2X + 2, currentY);
            currentY += lineHeight;
        });

        // Keterangan (justify, top-aligned)
        let textY = yPos + 5;
        keteranganLines.forEach((line: string) => {
            doc.text(line, col3X + 2, textY, {
                align: 'justify',
                maxWidth: col3Width - 4
            });
            textY += lineHeight;
        });

        yPos += rowHeight;
    }

    return yPos;
}
