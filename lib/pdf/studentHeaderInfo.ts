import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import type { MarginSettings } from './nilaiRaporTable';

interface StudentHeaderInfo {
    nm_siswa: string;
    nm_kelas: string;
    nis: string;
    nisn: string;
    fase: string;
    nama_sekolah: string;
    alamat_sekolah: string;
    semester: string;
    tahun_ajaran: string;
}

/**
 * Generate student info header that appears on every page
 * EXACT same format as page 1 header
 */
export async function generateStudentHeaderInfo(
    doc: jsPDF,
    yPos: number,
    studentInfo: StudentHeaderInfo,
    margins: MarginSettings
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Same column positions as page 1
    const leftCol = margins.margin_left;
    const midCol = pageWidth / 2 + 25;
    const colonLeft = leftCol + 35;
    const colonMid = midCol + 35;

    // Set font - same as page 1
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(10);

    // Row 1: Nama Murid & Kelas
    doc.text('Nama Murid', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.nm_siswa.toUpperCase(), colonLeft + 5, yPos);

    await setDejaVuFont(doc, 'normal');
    doc.text('Kelas', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.nm_kelas, colonMid + 5, yPos);

    yPos += 5;

    // Row 2: NIS/NISN & Fase
    await setDejaVuFont(doc, 'normal');
    doc.text('NIS/NISN', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    const nisNisn = `${studentInfo.nis} / ${studentInfo.nisn || '-'}`;
    doc.text(nisNisn, colonLeft + 5, yPos);

    await setDejaVuFont(doc, 'normal');
    doc.text('Fase', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.fase, colonMid + 5, yPos);

    yPos += 5;

    // Row 3: Sekolah & Semester
    await setDejaVuFont(doc, 'normal');
    doc.text('Sekolah', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.nama_sekolah, colonLeft + 5, yPos);

    await setDejaVuFont(doc, 'normal');
    doc.text('Semester', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.semester, colonMid + 5, yPos);

    yPos += 5;

    // Row 4: Alamat & Tahun Ajaran
    await setDejaVuFont(doc, 'normal');
    doc.text('Alamat', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.alamat_sekolah, colonLeft + 5, yPos);

    await setDejaVuFont(doc, 'normal');
    doc.text('Tahun Ajaran', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(studentInfo.tahun_ajaran, colonMid + 5, yPos);

    yPos += 3;

    // Garis pemisah (dynamic width based on margins)
    const lineWidth = pageWidth - margins.margin_left - margins.margin_right;
    doc.setLineWidth(0.5);
    doc.line(leftCol, yPos, leftCol + lineWidth, yPos);

    yPos += 4; // Reduced spacing to eliminate gap with table

    return yPos;
}
