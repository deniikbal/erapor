import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';
import type { MarginSettings } from './nilaiRaporTable';

export interface SignatureData {
    tempat?: string;
    tanggal?: string;
    namaWaliKelas?: string;
    nipWaliKelas?: string;
    namaKepalaSekolah?: string;
    nipKepalaSekolah?: string;
}

/**
 * Generate signature section with 3 columns:
 * - Left: Parent signature
 * - Center: Principal signature
 * - Right: Date, place, and teacher signature
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

    let yPos = startY;

    // Check if signature section fits on current page
    const signatureSectionHeight = 40; // Approximate height needed
    if (yPos + signatureSectionHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Reserve space for student header info
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;
    }

    // Calculate available width and divide into 3 columns
    const availableWidth = pageWidth - margins.margin_left - margins.margin_right;
    const columnWidth = availableWidth / 3; // Divide into 3 equal parts

    // Column X positions
    const col1X = leftMargin; // Left column (Orang Tua)
    const col2X = leftMargin + columnWidth; // Center column (Kepala Sekolah)
    const col3X = leftMargin + (columnWidth * 2); // Right column (Wali Kelas)

    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(10);

    // Add spacing before signatures
    yPos += 5;

    // Define common signature Y position for alignment
    const signatureLineY = yPos + 25; // Common Y for both parent and teacher signatures (increased from 20 to 30)

    // LEFT COLUMN: Orang Tua Murid
    let currentY = yPos;
    doc.text('Orang Tua Murid', col1X, currentY);

    // Dotted line for parent signature (aligned with teacher signature)
    const dotLineStart = col1X;
    const dotLineEnd = col1X + Math.min(50, columnWidth - 5);
    for (let x = dotLineStart; x < dotLineEnd; x += 1) {
        doc.text('.', x, signatureLineY);
    }

    // Add underline below dotted line
    const parentUnderlineY = signatureLineY + 0.5;
    doc.setLineWidth(0.3);
    doc.line(dotLineStart, parentUnderlineY, dotLineEnd, parentUnderlineY);

    // RIGHT COLUMN: Date, Place and Wali Kelas
    currentY = yPos;
    const tempat = signatureData.tempat || 'Bantarujeg';
    const tanggal = signatureData.tanggal || '22 Desember 2025';
    doc.text(`${tempat}, ${tanggal}`, col3X, currentY, { align: 'left' });

    currentY += 5;
    doc.text('Wali Kelas', col3X, currentY);

    // Teacher name and NIP (aligned with parent signature)
    await setDejaVuFont(doc, 'bold');
    const namaWali = signatureData.namaWaliKelas || 'Revi indika, S.Pd.';
    const waliTextWidth = doc.getTextWidth(namaWali);
    doc.text(namaWali, col3X, signatureLineY);

    // Add underline below teacher name
    const waliUnderlineY = signatureLineY + 0.5;
    doc.setLineWidth(0.3);
    doc.line(col3X, waliUnderlineY, col3X + waliTextWidth, waliUnderlineY);

    currentY = signatureLineY + 5;
    await setDejaVuFont(doc, 'normal');
    const nipWali = signatureData.nipWaliKelas || 'NIP 199404162024212033';
    doc.text(nipWali, col3X, currentY);

    // CENTER COLUMN: Kepala Sekolah (positioned below others)
    currentY = yPos + 30; // Position below parent and teacher (adjusted for increased spacing)
    doc.text('Kepala SMAN 1 Bantarujeg', col2X + 5, currentY, { align: 'left' });

    currentY += 25; // Increased space for principal signature (from 20 to 25)

    // Principal name and NIP
    await setDejaVuFont(doc, 'bold');
    const namaKepsek = signatureData.namaKepalaSekolah || 'Ading Rochendy, S.Pd., M.Pd.';
    const kepsekTextWidth = doc.getTextWidth(namaKepsek);
    doc.text(namaKepsek, col2X + (columnWidth / 2), currentY, { align: 'center' });

    // Underline the name
    const underlineY = currentY + 0.5;
    const underlineStart = col2X + (columnWidth / 2) - (kepsekTextWidth / 2);
    const underlineEnd = col2X + (columnWidth / 2) + (kepsekTextWidth / 2);
    doc.setLineWidth(0.3);
    doc.line(underlineStart, underlineY, underlineEnd, underlineY);

    currentY += 5;
    await setDejaVuFont(doc, 'normal');
    const nipKepsek = signatureData.nipKepalaSekolah || 'NIP 197109291995121002';
    // Align NIP with name's left edge
    const kepsekNameStartX = col2X + (columnWidth / 2) - (kepsekTextWidth / 2);
    doc.text(nipKepsek, kepsekNameStartX, currentY);

    // Return Y position after signature section
    return currentY + 5;
}
