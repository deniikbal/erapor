import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import { setOptimizedLineWidth, setOptimizedFillColor, setOptimizedFontSize, updateFillColorCache } from './pdfOptimizationHelpers';
import { optimizedSplitTextToSize } from './textSplitCache';

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
    setOptimizedFontSize(doc, 9);

    // Draw header cells with borders
    setOptimizedLineWidth(doc, 0.3);
    setOptimizedFillColor(doc, 248, 248, 255); // Header fill #f8f8ff
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

    // Reset draw and fill color to default (black text, white fill for next elements)
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);

    // Update cache to reflect the new state
    updateFillColorCache(doc, 255, 255, 255);


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
    setOptimizedFontSize(doc, 9);

    // Draw merged cell
    setOptimizedLineWidth(doc, 0.3);
    doc.rect(leftMargin, yPos, totalWidth, rowHeight); // Draw border only, white background

    // Text in merged cell (left-aligned with padding)
    // Remove suffix after dash for cleaner display (e.g., "Mata Pelajaran Pilihan - GBIM" -> "Mata Pelajaran Pilihan")
    let cleanedName = kelompokName;
    if (kelompokName.includes(' - ')) {
        cleanedName = kelompokName.split(' - ')[0];
    }

    // Center text vertically: middle + baseline offset
    const textY = yPos + (rowHeight / 2) + (rowHeight * 0.15);
    doc.text(cleanedName, leftMargin + 2, textY);

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
    setOptimizedFontSize(doc, 9);

    // Text wrapping for mata pelajaran (using optimized cache)
    const mapelLines = optimizedSplitTextToSize(doc, mapel.nm_lokal, col2Width - 3); // Reduced padding (from 4 to 3)

    // Text wrapping for capaian kompetensi (using optimized cache)
    const capaianText = mapel.capaian_kompetensi || '-';
    const capaianLines = optimizedSplitTextToSize(doc, capaianText, col4Width - 3); // Reduced padding (from 4 to 3)

    const lineHeight = 3.7; // mm per line
    const rowHeight = computeMapelRowHeight(doc, mapel, margins);

    // Check if we need a new page
    if (yPos + rowHeight > pageHeight - margins.margin_bottom) {
        doc.addPage();

        // Re-establish font after page break
        await setDejaVuFont(doc, 'normal');

        // Reserve space for student header info (will be added later in post-processing)
        // Student header info is ~21mm tall (4 rows + spacing + reduced gap)
        const studentHeaderHeight = STUDENT_HEADER_RESERVED_HEIGHT;
        yPos = margins.margin_top + studentHeaderHeight;

        // Redraw table header on new page (below student header space)
        await generateNilaiRaporTableHeader(doc, yPos, margins);
        yPos += TABLE_HEADER_HEIGHT; // Actual header height (not 12)

        // Reset font to normal after header
        await setDejaVuFont(doc, 'normal');
        setOptimizedFontSize(doc, 9);
    }

    // Draw row cells
    setOptimizedLineWidth(doc, 0.3);
    doc.rect(col1X, yPos, col1Width, rowHeight);
    doc.rect(col2X, yPos, col2Width, rowHeight);
    doc.rect(col3X, yPos, col3Width, rowHeight);
    doc.rect(col4X, yPos, col4Width, rowHeight);

    // No (centered vertically)
    const centerY = yPos + (rowHeight / 2) + 1.2; // Adjusted offset
    doc.text(rowNumber.toString(), col1X + col1Width / 2, centerY, { align: 'center' });

    // Mata Pelajaran (LEFT-aligned and vertically centered)
    const mapelTextY = yPos + (rowHeight / 2) - ((mapelLines.length - 1) * lineHeight / 2) + 1.2; // Adjusted offset
    let currentY = mapelTextY;
    mapelLines.forEach((line: string) => {
        doc.text(line, col2X + 1.5, currentY); // Left align with 1.5mm padding
        currentY += lineHeight;
    });

    // Nilai Akhir (centered vertically)
    const nilaiText = mapel.nilai_akhir ? mapel.nilai_akhir.toString() : '-';
    doc.text(nilaiText, col3X + col3Width / 2, centerY, { align: 'center' });

    // Capaian Kompetensi (justify - rata kiri kanan)
    let textY = yPos + 3.2; // Start closer to top
    capaianLines.forEach((line: string) => {
        doc.text(line, col4X + 1.5, textY, {
            align: 'justify',
            maxWidth: col4Width - 3
        });
        textY += lineHeight;
    });

    return yPos + rowHeight;
}

/**
 * Heights used by generateNilaiRaporTable. Defined as constants so the
 * "does the next kelompok + at least one mapel row fit?" check stays in sync
 * with the actual draw routines.
 */
const TABLE_HEADER_HEIGHT = 8;
const KELOMPOK_ROW_HEIGHT = 6;
// ponytail: compute mapel row height from actual content so multi-line deskripsi
// doesn't strand the kelompok header on the previous page.
function computeMapelRowHeight(
    doc: jsPDF,
    mapel: NilaiMapelData,
    margins: MarginSettings
): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const availableWidth = pageWidth - margins.margin_left - margins.margin_right;
    const col2Width = 40;
    const col4Width = availableWidth - 10 - 40 - 20;

    const mapelLines = optimizedSplitTextToSize(doc, mapel.nm_lokal, col2Width - 3);
    const capaianText = mapel.capaian_kompetensi || '-';
    const capaianLines = optimizedSplitTextToSize(doc, capaianText, col4Width - 3);

    const lineHeight = 3.7;
    const maxLines = Math.max(mapelLines.length, capaianLines.length);
    return Math.max(10, maxLines * lineHeight + 3);
}
// Reserved vertical space at the top of continuation pages for the student
// header info (Nama Murid, NIS, Sekolah, dst.) that is added later in
// post-processing.
const STUDENT_HEADER_RESERVED_HEIGHT = 21;

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
    // ponytail: track whether a kelompok has already been drawn on the current
    // page. The "keep kelompok together" page break must NOT fire for the first
    // kelompok on a page — the table header is already drawn, so moving the
    // kelompok would only strand that header and leave the page body empty.
    let kelompokDrawnOnPage = false;
    for (const kelompok of kelompokData) {
        // ponytail: keep entire kelompok together — header + all mapels must
        // fit on one page, otherwise move the whole kelompok to a new page.
        // Otherwise a long deskripsi in a later mapel strands the header.
        await setDejaVuFont(doc, 'normal');
        setOptimizedFontSize(doc, 9);
        let kelompokTotalHeight = KELOMPOK_ROW_HEIGHT;
        for (const m of kelompok.mapels) {
            kelompokTotalHeight += computeMapelRowHeight(doc, m, margins);
        }
        const overflowsPage = yPos + kelompokTotalHeight > pageHeight - margins.margin_bottom;
        if (overflowsPage && kelompokDrawnOnPage) {
            doc.addPage();

            // Re-establish font after page break
            await setDejaVuFont(doc, 'normal');

            // Reserve space for student header info
            yPos = margins.margin_top + STUDENT_HEADER_RESERVED_HEIGHT;

            await generateNilaiRaporTableHeader(doc, yPos, margins);
            yPos += TABLE_HEADER_HEIGHT;
            kelompokDrawnOnPage = false;
        }

        // Kelompok header (merged row)
        yPos = await generateKelompokRow(doc, yPos, kelompok.nama_kelompok, margins);

        // Mata pelajaran rows. generateMapelRow paginates per-row, so a kelompok
        // taller than a full page (or the first kelompok on a page) overflows
        // gracefully here instead of stranding the table header above.
        for (let i = 0; i < kelompok.mapels.length; i++) {
            const mapel = kelompok.mapels[i];
            yPos = await generateMapelRow(doc, yPos, i + 1, mapel, margins, pageHeight);
        }

        // A kelompok now occupies the current page (whichever page the last
        // mapel row landed on after any internal page break).
        kelompokDrawnOnPage = true;
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
// ponytail: matches the kokurikuler UI (Fase E = Kelas 10, Fase F = Kelas 11-12)
export function getFaseByTingkat(tingkat: string | number): string {
    const tingkatNum = typeof tingkat === 'string' ? parseInt(tingkat) : tingkat;
    if (tingkatNum === 10) return 'E';
    if (tingkatNum === 11 || tingkatNum === 12) return 'F';
    return 'N/A';
}
