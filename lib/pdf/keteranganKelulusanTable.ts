import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import type { MarginSettings } from './nilaiRaporTable';

export interface KenaikanData {
    kenaikan: number | null;  // 1 = lulus/naik, 0 = tidak
    tingkat: number | null;   // 10, 11, 12
}

/**
 * Generate Keterangan Kelulusan / Kenaikan row
 * 
 * Tingkat 12: "Keterangan Kelulusan : Lulus" / "Keterangan Kelulusan : Tidak Lulus"
 * Tingkat 10: "Keterangan Kenaikan : Naik ke Kelas XI" / "Keterangan Kenaikan : Tidak Naik"
 * Tingkat 11: "Keterangan Kenaikan : Naik ke Kelas XII" / "Keterangan Kenaikan : Tidak Naik"
 */
export async function generateKeteranganKelulusanTable(
    doc: jsPDF,
    startY: number,
    kenaikanData: KenaikanData | null,
    margins: MarginSettings
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableWidth = pageWidth - margins.margin_left - margins.margin_right;
    const rowHeight = 9;

    let yPos = startY;

    // Cek apakah perlu pindah halaman
    if (yPos + rowHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();
        yPos = margins.margin_top + 21;
    }

    // Tentukan teks berdasarkan tingkat dan status kenaikan
    let keterangan = 'Keterangan Kelulusan :  -';

    if (kenaikanData && kenaikanData.tingkat !== null) {
        const tingkat = Number(kenaikanData.tingkat);
        const naik = Number(kenaikanData.kenaikan) === 1;

        if (tingkat === 12) {
            // Kelas 12 → Kelulusan
            keterangan = naik
                ? 'Keterangan Kelulusan :  Lulus'
                : 'Keterangan Kelulusan :  Tidak Lulus';
        } else if (tingkat === 10) {
            // Kelas 10 → Kenaikan ke XI
            keterangan = naik
                ? 'Keterangan Kenaikan :  Naik ke Kelas XI'
                : 'Keterangan Kenaikan :  Tidak Naik';
        } else if (tingkat === 11) {
            // Kelas 11 → Kenaikan ke XII
            keterangan = naik
                ? 'Keterangan Kenaikan :  Naik ke Kelas XII'
                : 'Keterangan Kenaikan :  Tidak Naik';
        } else {
            // Tingkat lain
            keterangan = naik
                ? `Keterangan Kenaikan :  Naik ke Kelas ${tingkat + 1}`
                : 'Keterangan Kenaikan :  Tidak Naik';
        }
    }

    // Draw bordered rectangle
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.rect(margins.margin_left, yPos, tableWidth, rowHeight);

    // Draw text centered & bold
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(10);
    const textY = yPos + (rowHeight / 2) + 1.5;
    doc.text(keterangan, margins.margin_left + tableWidth / 2, textY, { align: 'center' });

    return yPos + rowHeight;
}
