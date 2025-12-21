import type { jsPDF } from 'jspdf';

interface FooterData {
    nm_kelas: string;
    nm_siswa: string;
    nis: string;
    pageNumber: number;
}

interface MarginSettings {
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
}

/**
 * Generate footer for Nilai Rapor
 * Format: "XI IPS 1 | ADE NURHIDAYAT | 242510253" (left)  "Halaman : 1" (right)
 */
export function generateNilaiRaporFooter(
    doc: jsPDF,
    footerData: FooterData,
    margins: MarginSettings
): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Footer position (from bottom)
    const footerY = pageHeight - margins.margin_bottom + 14;
    const lineY = footerY - 6;

    // Draw horizontal line (fixed 170mm width)
    doc.setLineWidth(0.5);
    doc.line(margins.margin_left, lineY, margins.margin_left + 170, lineY);

    // Set font to Courier Bold (monospace) for darker/clearer text
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);

    // Left side: "XI IPS 1 | ADE NURHIDAYAT | 242510253"
    const leftText = `${footerData.nm_kelas.toUpperCase()} | ${footerData.nm_siswa.toUpperCase()} | ${footerData.nis}`;
    doc.text(leftText, margins.margin_left, footerY);

    // Right side: "Halaman : 1" (aligned to right edge of 170mm)
    const rightText = `Halaman : ${footerData.pageNumber}`;
    doc.text(rightText, margins.margin_left + 170, footerY, { align: 'right' });
}
