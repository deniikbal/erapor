import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import type { MarginSettings } from './nilaiRaporTable';

export interface SignatureData {
    tempat?: string;
    tanggal?: string;
    namaWaliKelas?: string;
    nipWaliKelas?: string;
    namaKepalaSekolah?: string;
    nipKepalaSekolah?: string;
    statusKepsek?: string; // Dynamic label from database (e.g., 'Kepala Sekolah', 'Plt. Kepala Sekolah', etc.)
    layout?: string; // 'classic' atau 'parallel'
}

/**
 * Generate signature section with flexible layout:
 * - Classic: Parent (left), Teacher (right), Principal (centered below)
 * - Parallel: Parent (left), Principal (center), Teacher (right)
 */
export async function generateSignatureSection(
    doc: jsPDF,
    startY: number,
    signatureData: SignatureData,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const layout = signatureData.layout || 'classic';

    let yPos = startY;

    // Check if signature section fits on current page
    const signatureSectionHeight = layout === 'parallel' ? 40 : 65;
    if (yPos + signatureSectionHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;
    }

    const availableWidth = pageWidth - margins.margin_left - margins.margin_right;
    const columnWidth = availableWidth / 3;

    // Column Center X positions
    const col1Center = leftMargin + (columnWidth / 2);
    const col2Center = leftMargin + columnWidth + (columnWidth / 2);
    const col3Center = leftMargin + (columnWidth * 2) + (columnWidth / 2);

    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(10);
    yPos += 5;

    const signatureLineY = yPos + 25;
    const tempat = signatureData.tempat || 'Bantarujeg';
    const tanggal = signatureData.tanggal || '22 Desember 2025';

    // Render classic mode elements (parent left, teacher right) only if NOT parallel
    if (layout !== 'parallel') {
        // LEFT COLUMN: Orang Tua Murid (left-aligned)
        const col1X = leftMargin;
        doc.text('Orang Tua Murid', col1X, yPos, { align: 'left' });

        // Dotted line left-aligned
        const lineLen = Math.min(50, columnWidth - 10);
        const lineStart = col1X;
        for (let x = lineStart; x < lineStart + lineLen; x += 1) {
            doc.text('.', x, signatureLineY);
        }
        doc.setLineWidth(0.3);
        doc.line(lineStart, signatureLineY + 0.5, lineStart + lineLen, signatureLineY + 0.5);

        // RIGHT COLUMN: Date, Place and Wali Kelas (left-aligned)
        const col3X = leftMargin + (columnWidth * 2);
        doc.text(`${tempat}, ${tanggal}`, col3X, yPos, { align: 'left' });
        doc.text('Wali Kelas', col3X, yPos + 5, { align: 'left' });

        await setDejaVuFont(doc, 'bold');
        const namaWali = signatureData.namaWaliKelas || 'Wali Kelas';
        const waliWidth = doc.getTextWidth(namaWali);
        doc.text(namaWali, col3X, signatureLineY, { align: 'left' });
        doc.line(col3X, signatureLineY + 0.5, col3X + waliWidth, signatureLineY + 0.5);

        await setDejaVuFont(doc, 'normal');
        const nipWali = signatureData.nipWaliKelas || '';
        doc.text(nipWali, col3X, signatureLineY + 5, { align: 'left' });
    }

    // PRINCIPAL SECTION
    if (layout === 'parallel') {
        // PARALLEL MODE: All labels on same line, all left-aligned
        // Add extra top margin for parallel mode
        yPos += 5; // Extra spacing

        // Clear and redraw - Labels row (all on same Y)
        await setDejaVuFont(doc, 'normal');
        doc.setFontSize(10);
        const labelY = yPos;
        const statusKepsek = signatureData.statusKepsek || 'Kepala Sekolah';
        doc.text('Orang Tua Murid', leftMargin, labelY, { align: 'left' });
        doc.text(statusKepsek, leftMargin + columnWidth, labelY, { align: 'left' });
        doc.text(`${tempat}, ${tanggal}`, leftMargin + (columnWidth * 2), labelY, { align: 'left' });
        doc.text('Wali Kelas', leftMargin + (columnWidth * 2), labelY + 5, { align: 'left' });

        // Signatures row (all on same Y for parallel)
        const sigY = labelY + 30;

        // Parent dotted line (left-aligned)
        const dotStart = leftMargin;
        const dotEnd = leftMargin + Math.min(50, columnWidth - 10);
        for (let x = dotStart; x < dotEnd; x += 1) {
            doc.text('.', x, sigY);
        }
        doc.setLineWidth(0.3);
        doc.line(dotStart, sigY + 0.5, dotEnd, sigY + 0.5);

        // Principal signature (left-aligned)
        await setDejaVuFont(doc, 'bold');
        const namaKepsek = signatureData.namaKepalaSekolah || 'Kepala Sekolah';
        const kepsekWidth = doc.getTextWidth(namaKepsek);
        const kepsekX = leftMargin + columnWidth;
        doc.text(namaKepsek, kepsekX, sigY, { align: 'left' });
        doc.line(kepsekX, sigY + 0.5, kepsekX + kepsekWidth, sigY + 0.5);

        await setDejaVuFont(doc, 'normal');
        doc.setFontSize(10);
        const nipKepsek = signatureData.nipKepalaSekolah || '';
        doc.text(nipKepsek, kepsekX, sigY + 5, { align: 'left' });

        // Teacher signature (left-aligned, WITH NIP)
        await setDejaVuFont(doc, 'bold');
        const namaWali = signatureData.namaWaliKelas || 'Wali Kelas';
        const waliWidth = doc.getTextWidth(namaWali);
        const waliX = leftMargin + (columnWidth * 2);
        doc.text(namaWali, waliX, sigY, { align: 'left' });
        doc.line(waliX, sigY + 0.5, waliX + waliWidth, sigY + 0.5);

        // NIP Wali Kelas - ensure font is set properly
        await setDejaVuFont(doc, 'normal');
        doc.setFontSize(10);
        const nipWali = signatureData.nipWaliKelas || '';
        if (nipWali) {
            doc.text(nipWali, waliX, sigY + 5, { align: 'left' });
        }

        return sigY + 15; // Extra bottom spacing
    } else {
        // Classic: Principal centered below (but left-aligned text)
        const kepsekY = signatureLineY + 15;
        const kepsekSignY = kepsekY + 25;

        // Use center column for classic principal
        const col2X = leftMargin + columnWidth;

        const statusKepsek = signatureData.statusKepsek || 'Kepala Sekolah';
        doc.text(statusKepsek, col2X, kepsekY, { align: 'left' });

        await setDejaVuFont(doc, 'bold');
        const namaKepsek = signatureData.namaKepalaSekolah || 'Kepala Sekolah';
        const kepsekWidth = doc.getTextWidth(namaKepsek);
        doc.text(namaKepsek, col2X, kepsekSignY, { align: 'left' });
        doc.line(col2X, kepsekSignY + 0.5, col2X + kepsekWidth, kepsekSignY + 0.5);

        await setDejaVuFont(doc, 'normal');
        const nipKepsek = signatureData.nipKepalaSekolah || '';
        doc.text(nipKepsek, col2X, kepsekSignY + 5, { align: 'left' });

        return kepsekSignY + 10;
    }
}

