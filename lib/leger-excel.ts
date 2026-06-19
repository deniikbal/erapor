/**
 * Shared utilities for Leger Rapor Excel generation.
 *
 * - `getExcelCol`         : Convert 0-based column index to Excel letter
 * - `STYLE_FILL_HEADER`   : Standard header fill (mint)
 * - `STYLE_FILL_TOP10`    : Light green for top-10 rank
 * - `STYLE_BORDER_THIN`   : Thin border on all sides
 * - `applyHeaderCell`     : Apply standard header cell styling
 * - `applyDataCellBorder` : Apply thin border to a data cell
 * - `triggerExcelDownload`: Trigger browser download for an ExcelJS workbook
 */

import ExcelJS from 'exceljs';

// =====================================================================
// Common styles
// =====================================================================

const HEADER_FILL: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF99FFD6' },
};

const TOP10_FILL: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' },
};

const THIN_BORDER: ExcelJS.Borders = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
    diagonal: {},
};

// =====================================================================
// Helpers
// =====================================================================

/** Convert 0-based column index to Excel letter (0=A, 25=Z, 26=AA, ...). */
export function getExcelCol(index: number): string {
    let col = '';
    let n = index;
    while (n >= 0) {
        col = String.fromCharCode(65 + (n % 26)) + col;
        n = Math.floor(n / 26) - 1;
    }
    return col;
}

/** Apply standard header styling to a cell (mint fill, bold, centered, border). */
export function applyHeaderCell(
    cell: ExcelJS.Cell,
    value: ExcelJS.CellValue,
    options: { size?: number; wrap?: boolean } = {}
): void {
    const { size = 10, wrap = true } = options;
    cell.value = value;
    cell.font = { bold: true, size };
    cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: wrap,
    };
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER as unknown as Partial<ExcelJS.Borders>;
}

/** Apply thin border to a cell. */
export function applyDataCellBorder(cell: ExcelJS.Cell): void {
    cell.border = THIN_BORDER as unknown as Partial<ExcelJS.Borders>;
}

/** Apply light-green fill (for top-10 rank). */
export function applyTop10Fill(cell: ExcelJS.Cell): void {
    cell.fill = TOP10_FILL;
}

/** Trigger browser download for an ExcelJS workbook buffer. */
export function triggerExcelDownload(
    buffer: ArrayBuffer,
    filename: string
): void {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/** Sanitize a string for safe use in a filename. */
export function safeFilename(input: string): string {
    return input.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_');
}

// =====================================================================
// All-Semester Leger Builder
// =====================================================================

export interface AllSemesterBlock {
    semester: SemesterOption;
    data: LegerApiResponse;
}

export interface AllSemesterLegerInput {
    sekolahNama: string;
    kelasNama: string;
    blocks: AllSemesterBlock[]; // chronological order (oldest → newest)
}

/**
 * Build an Excel workbook for "Leger Semua Semester" — values only.
 *
 * New layout: grouped by SUBJECT (not by semester).
 *   Row 1     : Title (merged across all columns)
 *   Row 2-4   : School / Class / info
 *   Row 5     : Subject group headers (full subject name, merged across its semester columns)
 *   Row 6-7   : "SMT 1", "SMT 2", ... (vertical-merged per cell)
 *   Row 8+    : Student rows with grades only
 *   Row N+2   : "Keterangan Mapel" (full list of subjects)
 *
 * Subjects appearing in any semester are unioned and laid out in their
 * first-seen order. Each subject gets `numSemesters` columns (one per SMT),
 * with empty cells where that subject wasn't offered in a given semester.
 */
export function buildAllSemesterLegerWorkbook(
    input: AllSemesterLegerInput
): ExcelJS.Workbook {
    const { sekolahNama, kelasNama, blocks } = input;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leger Semua Semester');

    // --- Collect union of all students (sorted by name) ---
    const studentMap = new Map<string, { peserta_didik_id: string; nm_siswa: string; nisn?: string; nis?: string }>();
    blocks.forEach((b) => {
        (b.data.students || []).forEach((s) => {
            if (!studentMap.has(s.peserta_didik_id)) {
                studentMap.set(s.peserta_didik_id, s);
            }
        });
    });
    const allStudents = Array.from(studentMap.values()).sort((a, b) =>
        a.nm_siswa.localeCompare(b.nm_siswa, 'id', { numeric: true, sensitivity: 'base' })
    );

    // --- Collect union of all subjects (in first-seen order) ---
    // Use the subject object from the first semester block that contains it
    // so we keep nm_mapel, nm_ringkas, etc. consistent.
    const subjectMap = new Map<string, {
        mata_pelajaran_id: string;
        nm_mapel?: string;
        nm_ringkas?: string;
        nm_lokal?: string;
    }>();
    blocks.forEach((b) => {
        (b.data.subjects || []).forEach((s) => {
            if (!subjectMap.has(s.mata_pelajaran_id)) {
                subjectMap.set(s.mata_pelajaran_id, s);
            }
        });
    });
    const allSubjects = Array.from(subjectMap.values());

    // --- Number of columns per subject ---
    // Each subject gets `semesterCount` SMT columns + 1 RATA-RATA column.
    // The number of SMT columns is fixed at MIN_SEMESTER_COLS so the
    // worksheet template is consistent across schools/classes: even when
    // a class only has data for some semesters, the empty SMT columns
    // (SMT 4, SMT 5, SMT 6, ...) are still rendered with the header.
    // If the school has more than MIN_SEMESTER_COLS semesters of data
    // we extend the template so no data is lost.
    const MIN_SEMESTER_COLS = 6;
    const semesterCount = Math.max(blocks.length, MIN_SEMESTER_COLS);
    const colsPerSubject = semesterCount > 0 ? semesterCount + 1 : 0;
    const totalCols = 4 + allSubjects.length * colsPerSubject;
    const lastColChar = getExcelCol(totalCols - 1);

    // --- Column widths ---
    worksheet.columns = [
        { width: 5 },   // NO
        { width: 30 },  // NAMA
        { width: 12 },  // NISN
        { width: 12 },  // NIS
        ...Array.from({ length: totalCols - 4 }, (_, i) => {
            // Last column of each subject block is RATA-RATA - make it wider
            const isAverage = colsPerSubject > 0 && ((i + 1) % colsPerSubject) === 0;
            return { width: isAverage ? 11 : 7 };
        }),
    ];

    // Highlight fill for RATA-RATA cells (light yellow)
    const AVERAGE_FILL: ExcelJS.FillPattern = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE699' },
    };

    // --- Row 1: Title ---
    worksheet.getCell('A1').value = `LEGER NILAI RAPOR SISWA — SEMUA SEMESTER`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(`A1:${lastColChar}1`);

    // --- Row 2-4: School/Class info ---
    worksheet.getCell('A2').value = 'SEKOLAH';
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('C2').value = `: ${sekolahNama}`;
    worksheet.getCell('A3').value = 'KELAS';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('C3').value = `: ${kelasNama}`;
    worksheet.getCell('A4').value = 'SEMESTER';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('C4').value = `: Semua Semester`;

    // --- Row 5-7: Headers (NO, NAMA, NISN, NIS merged rows 5-7) ---
    ['A5:A7', 'B5:B7', 'C5:C7', 'D5:D7'].forEach((range, idx) => {
        worksheet.mergeCells(range);
        const startCell = range.split(':')[0];
        const labels = ['NO', 'NAMA SISWA', 'NISN', 'NIS'];
        applyHeaderCell(worksheet.getCell(startCell), labels[idx], { size: 10 });
    });

    // --- Row 5: Subject group header (full subject name, merged across SMT + RATA-RATA columns) ---
    if (allSubjects.length === 0) {
        // Fallback: extend the fixed headers across the row
        const cell = worksheet.getCell(`E5`);
        worksheet.mergeCells(`E5:${lastColChar}5`);
        applyHeaderCell(cell, 'Tidak ada data mata pelajaran', { size: 10 });
    } else {
        allSubjects.forEach((subject, sIdx) => {
            const blockStartIdx = 4 + sIdx * colsPerSubject;
            const blockEndIdx = blockStartIdx + colsPerSubject - 1;
            if (blockEndIdx < blockStartIdx) return;

            const startCol = getExcelCol(blockStartIdx);
            const endCol = getExcelCol(blockEndIdx);
            worksheet.mergeCells(`${startCol}5:${endCol}5`);
            const cell = worksheet.getCell(`${startCol}5`);
            // Use full subject name (nm_mapel) as the user requested
            const fullName = subject.nm_mapel || subject.nm_lokal || subject.nm_ringkas || 'Mapel';
            // wrap=false so the subject name stays on a single line
            applyHeaderCell(cell, fullName, { size: 9, wrap: false });
        });
    }

    // --- Row 6-7: "SMT n" per subject block + "RATA-RATA" as the last column ---
    if (allSubjects.length > 0 && semesterCount > 0) {
        allSubjects.forEach((subject, sIdx) => {
            const blockStartIdx = 4 + sIdx * colsPerSubject;

            // SMT columns — always labeled "SMT 1" .. "SMT n" so the
            // template stays consistent regardless of available data.
            for (let semIdx = 0; semIdx < semesterCount; semIdx++) {
                const colIdx = blockStartIdx + semIdx;
                const col = getExcelCol(colIdx);
                worksheet.mergeCells(`${col}6:${col}7`);
                const cell = worksheet.getCell(`${col}6`);
                const semLabel = `SMT ${semIdx + 1}`;
                applyHeaderCell(cell, semLabel, { size: 8, wrap: false });
            }

            // RATA-RATA column (last column of this subject's block)
            const avgColIdx = blockStartIdx + semesterCount;
            const avgCol = getExcelCol(avgColIdx);
            worksheet.mergeCells(`${avgCol}6:${avgCol}7`);
            const avgCell = worksheet.getCell(`${avgCol}6`);
            applyHeaderCell(avgCell, 'RATA-RATA', { size: 8, wrap: false });
            // Apply distinct fill so the average column stands out
            avgCell.fill = AVERAGE_FILL;
        });
    }

    // --- Row 8+: Student data ---
    const dataStartRow = 8;
    if (allStudents.length === 0) {
        const cell = worksheet.getCell(`A${dataStartRow}`);
        cell.value = 'Tidak ada data siswa';
        cell.font = { italic: true, color: { argb: 'FF64748B' } };
        worksheet.mergeCells(`A${dataStartRow}:${lastColChar}${dataStartRow}`);
        return workbook;
    }

    allStudents.forEach((siswa, index) => {
        const rowNum = dataStartRow + index;

        // NO, NAMA, NISN, NIS
        const noCell = worksheet.getCell(`A${rowNum}`);
        noCell.value = index + 1;
        noCell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyDataCellBorder(noCell);

        const namaCell = worksheet.getCell(`B${rowNum}`);
        namaCell.value = siswa.nm_siswa;
        applyDataCellBorder(namaCell);

        const nisnCell = worksheet.getCell(`C${rowNum}`);
        nisnCell.value = siswa.nisn || '-';
        nisnCell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyDataCellBorder(nisnCell);

        const nisCell = worksheet.getCell(`D${rowNum}`);
        nisCell.value = siswa.nis || '-';
        nisCell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyDataCellBorder(nisCell);

        // Per-subject × per-semester grades + RATA-RATA
        allSubjects.forEach((subject, sIdx) => {
            const blockStartIdx = 4 + sIdx * colsPerSubject;
            let sum = 0;
            let count = 0;

            // SMT columns
            for (let semIdx = 0; semIdx < semesterCount; semIdx++) {
                const colIdx = blockStartIdx + semIdx;
                const col = getExcelCol(colIdx);
                const cell = worksheet.getCell(`${col}${rowNum}`);

                const semBlock = blocks[semIdx];
                const gradeMap = semBlock?.data?.grades || {};
                const g = gradeMap[siswa.peserta_didik_id]?.[subject.mata_pelajaran_id];

                cell.value = g !== undefined && g !== null ? g : '-';
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                applyDataCellBorder(cell);

                // Accumulate for average (only numeric grades count)
                const numG = typeof g === 'number' ? g : Number(g);
                if (g !== undefined && g !== null && !Number.isNaN(numG)) {
                    sum += numG;
                    count += 1;
                }
            }

            // RATA-RATA column (last column of this subject's block)
            const avgColIdx = blockStartIdx + semesterCount;
            const avgCol = getExcelCol(avgColIdx);
            const avgCell = worksheet.getCell(`${avgCol}${rowNum}`);
            if (count > 0) {
                const avg = sum / count;
                avgCell.value = avg;
                avgCell.numFmt = '0.00';
                avgCell.font = { bold: true };
            } else {
                avgCell.value = '-';
            }
            avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
            applyDataCellBorder(avgCell);
            // Light-yellow fill to highlight the average column
            avgCell.fill = AVERAGE_FILL;
        });
    });

    // --- Keterangan Mapel (footer) ---
    const footerStartRow = dataStartRow + allStudents.length + 2;
    const headerCell = worksheet.getCell(`A${footerStartRow}`);
    headerCell.value = 'Keterangan Mapel:';
    headerCell.font = { bold: true, size: 11 };

    let currRow = footerStartRow + 1;
    allSubjects.forEach((subject) => {
        const fullName = subject.nm_mapel || subject.nm_lokal || 'N/A';
        const ringkas = subject.nm_ringkas;
        const cell = worksheet.getCell(`A${currRow}`);
        // Show both ringkas and full name when they differ
        cell.value = ringkas && ringkas !== fullName
            ? `${ringkas} : ${fullName}`
            : fullName;
        cell.font = { size: 10 };
        currRow += 1;
    });

    return workbook;
}

// =====================================================================
// Data fetchers
// =====================================================================

export interface LegerApiResponse {
    students: Array<{ peserta_didik_id: string; nm_siswa: string; nisn?: string; nis?: string }>;
    subjects: Array<{ mata_pelajaran_id: string; nm_mapel?: string; nm_ringkas?: string; nm_lokal?: string }>;
    grades: Record<string, Record<string, number | string | null>>;
    ekskul?: Array<{ id: string; name: string }>;
    ekskulValues?: Record<string, Record<string, string>>;
    attendance?: Record<string, { s: number; i: number; a: number }>;
}

export interface SemesterOption {
    semester_id: string;
    nama_semester: string;
    tahun_ajaran_id?: string;
    semester?: string;
    periode_aktif?: string;
}

/**
 * Fetch leger data for a specific class & semester from the API.
 * Returns null if the request fails.
 */
export async function fetchLegerData(
    rombonganBelajarId: string,
    semesterId: string
): Promise<LegerApiResponse | null> {
    try {
        const res = await fetch(
            `/api/leger?rombongan_belajar_id=${rombonganBelajarId}&semester_id=${semesterId}`
        );
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error(`fetchLegerData error for semester ${semesterId}:`, error);
        return null;
    }
}

/** Fetch all available semesters, sorted DESC (newest first). */
export async function fetchAllSemesters(): Promise<SemesterOption[]> {
    try {
        const res = await fetch('/api/semester');
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || data.semester || []) as SemesterOption[];
    } catch (error) {
        console.error('fetchAllSemesters error:', error);
        return [];
    }
}

/** Fetch school data (best-effort, returns empty object on failure). */
export async function fetchSekolahData(): Promise<any> {
    try {
        const res = await fetch('/api/sekolah');
        if (!res.ok) return {};
        return await res.json();
    } catch {
        return {};
    }
}

// =====================================================================
// Stats helpers
// =====================================================================

export interface StudentStats {
    sum: number;
    avg: number;
    rank: number;
}

export type StudentStatsMap = Record<string, StudentStats>;

/**
 * Calculate per-student sum/avg/rank from a grade map + subject list.
 * Handles ties (same sum ⇒ same rank).
 */
export function calculateStudentStats(
    students: Array<{ peserta_didik_id: string }>,
    subjects: Array<{ mata_pelajaran_id: string }>,
    gradeMap: Record<string, Record<string, any>>
): StudentStatsMap {
    const stats: StudentStatsMap = {};
    const sums: Array<{ id: string; sum: number }> = [];

    students.forEach((siswa) => {
        let sum = 0;
        let count = 0;
        subjects.forEach((subject) => {
            const g = gradeMap[siswa.peserta_didik_id]?.[subject.mata_pelajaran_id];
            if (g !== undefined && g !== null) {
                sum += Number(g);
                count += 1;
            }
        });
        const avg = count > 0 ? sum / count : 0;
        stats[siswa.peserta_didik_id] = { sum, avg, rank: 0 };
        sums.push({ id: siswa.peserta_didik_id, sum });
    });

    // Sort descending by sum, assign rank with tie handling
    sums.sort((a, b) => b.sum - a.sum);
    let currentRank = 0;
    let previousSum: number | null = null;
    sums.forEach((item) => {
        if (item.sum !== previousSum) {
            currentRank += 1;
            previousSum = item.sum;
        }
        if (stats[item.id]) {
            stats[item.id].rank = currentRank;
        }
    });

    return stats;
}
