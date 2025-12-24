import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';

interface StudentData {
    nm_siswa: string;
    nis: string;
    nisn: string | null;
    nm_kelas?: string | null;
}

interface SchoolData {
    nama: string;
    alamat: string;
}

interface SemesterData {
    nama_semester: string;
    tahun_ajaran_id: string;
}

interface HeaderInfo {
    student: StudentData;
    school: SchoolData;
    semester: SemesterData;
    kelas: string;
    fase: string;
}

interface MarginSettings {
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;
}

export async function generateNilaiRaporHeader(
    doc: jsPDF,
    headerInfo: HeaderInfo,
    margins: MarginSettings = { margin_top: 15, margin_bottom: 15, margin_left: 15, margin_right: 15 }
): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margins.margin_top;

    // Set font untuk header
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(10);

    const leftCol = margins.margin_left;
    const midCol = pageWidth / 2 + 25;  // Increased from 25 to 30
    const colonLeft = leftCol + 35;
    const colonMid = midCol + 35;        // Increased from 35 to 40 for more space

    // Left column - Student Info
    // Nama Murid
    doc.text('Nama Murid', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(headerInfo.student.nm_siswa.toUpperCase(), colonLeft + 5, yPos);

    // Right column - Kelas
    await setDejaVuFont(doc, 'normal');
    doc.text('Kelas', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(headerInfo.kelas, colonMid + 5, yPos);

    yPos += 4;

    // NIS/NISN
    await setDejaVuFont(doc, 'normal');
    doc.text('NIS/NISN', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    const nisNisn = `${headerInfo.student.nis} / ${headerInfo.student.nisn || '-'}`;
    doc.text(nisNisn, colonLeft + 5, yPos);

    // Fase
    await setDejaVuFont(doc, 'normal');
    doc.text('Fase', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(headerInfo.fase, colonMid + 5, yPos);

    yPos += 4;

    // Sekolah
    await setDejaVuFont(doc, 'normal');
    doc.text('Sekolah', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(headerInfo.school.nama, colonLeft + 5, yPos);

    // Semester
    await setDejaVuFont(doc, 'normal');
    doc.text('Semester', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    const semesterText = headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2';
    doc.text(semesterText, colonMid + 5, yPos);

    yPos += 4;

    // Alamat
    await setDejaVuFont(doc, 'normal');
    doc.text('Alamat', leftCol, yPos);
    doc.text(':', colonLeft, yPos);
    await setDejaVuFont(doc, 'normal');
    doc.text(headerInfo.school.alamat, colonLeft + 5, yPos);

    // Tahun Ajaran
    await setDejaVuFont(doc, 'normal');
    doc.text('Tahun Ajaran', midCol, yPos);
    doc.text(':', colonMid, yPos);
    await setDejaVuFont(doc, 'normal');
    const tahunAjaran = `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`;
    doc.text(tahunAjaran, colonMid + 5, yPos);

    yPos += 3;

    // Garis pemisah (dynamic width based on margins)
    const lineWidth = pageWidth - margins.margin_left - margins.margin_right;
    doc.setLineWidth(0.3);
    doc.line(leftCol, yPos, leftCol + lineWidth, yPos);

    // Add spacing: 6mm visual gap + font baseline offset (~4mm for size 12)
    yPos += 10;  // 6mm gap + 4mm baseline offset = 10mm total

    // Title: LAPORAN HASIL BELAJAR
    await setDejaVuFont(doc, 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, yPos, { align: 'center' });

    yPos += 5;

    // Ensure font is reset to normal before returning
    await setDejaVuFont(doc, 'normal');
    doc.setFontSize(9);

    return yPos; // Return position for next content
}


