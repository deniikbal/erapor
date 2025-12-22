import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';

export interface MarginSettings {
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
}

interface NilaiMapelData {
    id_map_mapel: string;
    mata_pelajaran_id: number;
    nm_lokal: string;
    area_kompetensi: string;
    klp_mpl: number;
    nilai_akhir?: number;
    capaian_kompetensi?: string;
    urut_rapor: number;
}

interface KelompokMapelData {
    klp_id: number;
    nama_kelompok: string;
    mapels: NilaiMapelData[];
}

/**
 * Generate table header for Nilai Rapor
 * Columns: No (10mm), Mata Pelajaran (40mm), Nilai Akhir (20mm), Capaian Kompetensi (100mm)
 */
export async function generateNilaiRaporTableHeader(
    doc: jsPDF,
    yPos: number,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Calculate available width for table
    const availableWidth = pageWidth - margins.margin_left - margins.margin_right;

    // Column widths (proportional to available space)
    // Fixed columns: No (10mm), Mata Pelajaran (40mm), Nilai Akhir (20mm)
    // Remaining space goes to Capaian Kompetensi
    const col1Width = 10;   // No (fixed)
    const col2Width = 40;   // Mata Pelajaran (fixed)
    const col3Width = 20;   // Nilai Akhir (fixed)
    const col4Width = availableWidth - col1Width - col2Width - col3Width;  // Capaian Kompetensi (dynamic)

    // Column X positions
    const col1X = leftMargin;
    const col2X = col1X + col1Width;
    const col3X = col2X + col2Width;
    const col4X = col3X + col3Width;

    const headerHeight = 8;

    // Set font and size for header
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);

    // Draw header cells with borders
    doc.setLineWidth(0.3);
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(col1X, yPos, col1Width, headerHeight, 'FD');
    doc.rect(col2X, yPos, col2Width, headerHeight, 'FD');
    doc.rect(col3X, yPos, col3Width, headerHeight, 'FD');
    doc.rect(col4X, yPos, col4Width, headerHeight, 'FD');

    // Header text (centered both horizontally and vertically)
    // For font size 9 in 8mm header: middle (4mm) + font baseline offset (~1mm)
    const textY = yPos + (headerHeight / 2) + (headerHeight * 0.15);
    doc.text('No', col1X + col1Width / 2, textY, { align: 'center' });
    doc.text('Mata Pelajaran', col2X + col2Width / 2, textY, { align: 'center' });
    doc.text('Nilai Akhir', col3X + col3Width / 2, textY, { align: 'center' });
    doc.text('Capaian Kompetensi', col4X + col4Width / 2, textY, { align: 'center' });

    return yPos + headerHeight;
}

/**
 * Generate merged row for Kelompok Mata Pelajaran
 */
export async function generateKelompokRow(
    doc: jsPDF,
    yPos: number,
    kelompokName: string,
    margins: MarginSettings
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalWidth = pageWidth - margins.margin_left - margins.margin_right;

    const rowHeight = 6;

    // Set bold font for kelompok name
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(9);

    // Draw merged cell
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, yPos, totalWidth, rowHeight); // Draw border only, white background

    // Text in merged cell (left-aligned with padding)
    // Clean name: remove suffix after dash (e.g., "Mata Pelajaran Pilihan - IPS" -> "Mata Pelajaran Pilihan")
    let cleanedName = kelompokName;
    if (kelompokName.includes(' - ')) {
        cleanedName = kelompokName.split(' - ')[0];
    }

    // Title case: capitalize first letter of each word
    const titleCase = cleanedName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    // Center text vertically: middle + baseline offset
    const textY = yPos + (rowHeight / 2) + (rowHeight * 0.15);
    doc.text(titleCase, leftMargin + 2, textY);

    return yPos + rowHeight;
}

/**
 * Generate row for mata pelajaran dengan nilai (with text wrapping)
 */
export async function generateMapelRow(
    doc: jsPDF,
    yPos: number,
    rowNumber: number,
    mapel: NilaiMapelData,
    margins: MarginSettings,
    pageHeight: number
): Promise<number> {
    const leftMargin = margins.margin_left;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Calculate available width and dynamic columns (same as header)
    const availableWidth = pageWidth - margins.margin_left - margins.margin_right;
    const col1Width = 10;
    const col2Width = 40;
    const col3Width = 20;
    const col4Width = availableWidth - col1Width - col2Width - col3Width;

    // Column X positions
    const col1X = leftMargin;
    const col2X = col1X + col1Width;
    const col3X = col2X + col2Width;
    const col4X = col3X + col3Width;

    // Set normal font
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    // Text wrapping for mata pelajaran
    const mapelLines = doc.splitTextToSize(mapel.nm_lokal, col2Width - 4);

    // Text wrapping for capaian kompetensi
    const capaianText = mapel.capaian_kompetensi || '-';
    const capaianLines = doc.splitTextToSize(capaianText, col4Width - 4);

    // Calculate row height based on content (minimum 10mm, adjust based on max lines)
    const lineHeight = 3.7; // mm per line
    const maxLines = Math.max(mapelLines.length, capaianLines.length);
    const rowHeight = Math.max(10, maxLines * lineHeight + 4); // +4 for padding

    // Check if we need a new page
    if (yPos + rowHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Reserve space for student header info (will be added later in post-processing)
        // Student header info is ~21mm tall (4 rows + spacing + reduced gap)
        const studentHeaderHeight = 21;
        yPos = margins.margin_top + studentHeaderHeight;

        // Redraw table header on new page (below student header space)
        await generateNilaiRaporTableHeader(doc, yPos, margins);
        yPos += 8; // Actual header height (not 12)

        // Reset font to normal after header
        await setDejaVuFont(doc, 'normal');
        doc.setFontSize(9);
    }

    // Draw row cells
    doc.setLineWidth(0.3);
    doc.rect(col1X, yPos, col1Width, rowHeight);
    doc.rect(col2X, yPos, col2Width, rowHeight);
    doc.rect(col3X, yPos, col3Width, rowHeight);
    doc.rect(col4X, yPos, col4Width, rowHeight);

    // No (centered vertically)
    const centerY = yPos + (rowHeight / 2) + 2;
    doc.text(rowNumber.toString(), col1X + col1Width / 2, centerY, { align: 'center' });

    // Mata Pelajaran (LEFT-aligned and vertically centered)
    const mapelTextY = yPos + (rowHeight / 2) - ((mapelLines.length - 1) * lineHeight / 2) + 2;
    let currentY = mapelTextY;
    mapelLines.forEach((line: string) => {
        doc.text(line, col2X + 2, currentY); // Left align with padding
        currentY += lineHeight;
    });

    // Nilai Akhir (centered vertically)
    const nilaiText = mapel.nilai_akhir ? mapel.nilai_akhir.toString() : '-';
    doc.text(nilaiText, col3X + col3Width / 2, centerY, { align: 'center' });

    // Capaian Kompetensi (justify - rata kiri kanan)
    let textY = yPos + 5;
    capaianLines.forEach((line: string) => {
        doc.text(line, col4X + 2, textY, {
            align: 'justify',
            maxWidth: col4Width - 4
        });
        textY += lineHeight;
    });

    return yPos + rowHeight;
}

/**
 * Generate complete nilai rapor table with kelompok
 */
export async function generateNilaiRaporTable(
    doc: jsPDF,
    startY: number,
    kelompokData: KelompokMapelData[],
    margins: MarginSettings = { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15 }
): Promise<number> {
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = startY;

    // Generate table header
    yPos = await generateNilaiRaporTableHeader(doc, yPos, margins);

    // Generate rows for each kelompok
    for (const kelompok of kelompokData) {
        // Check if kelompok header fits, if not add new page
        if (yPos + 8 > pageHeight - margins.margin_bottom) {
            doc.addPage();

            // Reserve space for student header info
            const studentHeaderHeight = 21;
            yPos = margins.margin_top + studentHeaderHeight;

            await generateNilaiRaporTableHeader(doc, yPos, margins);
            yPos += 8; // Actual header height
        }

        // Kelompok header (merged row)
        yPos = await generateKelompokRow(doc, yPos, kelompok.nama_kelompok, margins);

        // Mata pelajaran rows
        for (let i = 0; i < kelompok.mapels.length; i++) {
            const mapel = kelompok.mapels[i];
            yPos = await generateMapelRow(doc, yPos, i + 1, mapel, margins, pageHeight);
        }
    }

    return yPos;
}

// Helper function to calculate Predikat
export function calculatePredikat(nilai: number): string {
    if (nilai >= 90) return 'A';
    if (nilai >= 80) return 'B';
    if (nilai >= 70) return 'C';
    if (nilai >= 60) return 'D';
    return 'E';
}

// Helper function to determine Fase
export function getFaseByTingkat(tingkat: string | number): string {
    const tingkatNum = typeof tingkat === 'string' ? parseInt(tingkat) : tingkat;
    if (tingkatNum === 10 || tingkatNum === 11) return 'E';
    if (tingkatNum === 12) return 'F';
    return 'N/A';
}
