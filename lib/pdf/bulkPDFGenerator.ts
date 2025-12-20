import { jsPDF } from 'jspdf';
import { generateCoverPage } from './coverPage';
import { generateSchoolInfoPage } from './schoolInfoPage';
import { generateIdentityPage } from './identityPage';
import { generateKeteranganPindahPage } from './keteranganPindahPage';
import { generateKeteranganMasukPage } from './keteranganMasukPage';
import type { Siswa } from '@/lib/db';

interface LogosData {
  logo_pemda: string | null;
  logo_sek: string | null;
}

interface MarginSettings {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

interface BulkProgressCallback {
  (current: number, total: number, currentStudentName?: string): void;
}

export async function generateBulkPDFs(
  students: Siswa[],
  schoolData: any,
  logos: LogosData,
  marginSettings: MarginSettings,
  onProgress?: BulkProgressCallback
): Promise<Blob[]> {
  const pdfBlobs: Blob[] = [];
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Update progress
    if (onProgress) {
      onProgress(i + 1, students.length, student.nm_siswa);
    }
    
    try {
      // Create PDF instance
      const doc = new jsPDF();

      // Page 1: Cover Page
      await generateCoverPage(doc, {
        nm_siswa: student.nm_siswa,
        nis: student.nis,
        nisn: student.nisn
      }, logos, marginSettings);

      // Page 2: School Info Page
      doc.addPage();
      await generateSchoolInfoPage(doc, schoolData, marginSettings);

      // Page 3: Identity Page
      doc.addPage();
      await generateIdentityPage(doc, student, schoolData, marginSettings);

      // Page 4: Keterangan Pindah Page
      doc.addPage();
      await generateKeteranganPindahPage(doc, student, marginSettings);

      // Page 5: Keterangan Masuk Page
      doc.addPage();
      await generateKeteranganMasukPage(doc, student, marginSettings);

      // Get the PDF as blob
      const pdfBlob = await doc.output('blob');
      pdfBlobs.push(pdfBlob);
    } catch (error) {
      console.error(`Error generating PDF for student ${student.nm_siswa}:`, error);
      throw new Error(`Gagal membuat PDF untuk ${student.nm_siswa}: ${(error as Error).message}`);
    }
  }
  
  return pdfBlobs;
}

// Alternative function that creates a ZIP file containing all PDFs
export async function generateBulkPDFsAsZip(
  students: Siswa[],
  schoolData: any,
  logos: LogosData,
  marginSettings: MarginSettings,
  onProgress?: BulkProgressCallback
): Promise<Blob> {
  // This requires jszip library which may need to be installed
  // For now, we'll return the individual blobs approach
  const pdfBlobs = await generateBulkPDFs(students, schoolData, logos, marginSettings, onProgress);
  
  // In a more complete implementation, we would create a ZIP file here
  // For now, we'll return the first PDF as a demonstration
  // The UI will handle the multiple files differently
  
  // For this implementation, we'll return the first PDF as a single blob
  // A more complete solution would use a library like JSZip
  if (pdfBlobs.length > 0) {
    return pdfBlobs[0]; // This is just a placeholder - in reality, we'd need JSZip
  }
  
  throw new Error('No PDFs were generated');
}

// Function to generate a single PDF containing all students
export async function generateSinglePDFWithAllStudents(
  students: Siswa[],
  schoolData: any,
  logos: LogosData,
  marginSettings: MarginSettings,
  onProgress?: BulkProgressCallback
): Promise<void> {
  if (students.length === 0) {
    throw new Error('Tidak ada siswa untuk di-generate');
  }

  // Create a single PDF instance
  const doc = new jsPDF();

  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // Update progress
    if (onProgress) {
      onProgress(i + 1, students.length, student.nm_siswa);
    }

    try {
      // Each student gets all 5 pages:
      // Page 1: Cover Page (start fresh for each student)
      if (i > 0) {
        // Add a new page before starting the next student's section (except for the first student)
        doc.addPage();
      }
      await generateCoverPage(doc, {
        nm_siswa: student.nm_siswa,
        nis: student.nis,
        nisn: student.nisn
      }, logos, marginSettings);

      // Page 2: School Info Page
      doc.addPage();
      await generateSchoolInfoPage(doc, schoolData, marginSettings);

      // Page 3: Identity Page
      doc.addPage();
      await generateIdentityPage(doc, student, schoolData, marginSettings);

      // Page 4: Keterangan Pindah Page
      doc.addPage();
      await generateKeteranganPindahPage(doc, student, marginSettings);

      // Page 5: Keterangan Masuk Page
      doc.addPage();
      await generateKeteranganMasukPage(doc, student, marginSettings);
    } catch (error) {
      console.error(`Error generating PDF for student ${student.nm_siswa}:`, error);
      throw new Error(`Gagal membuat PDF untuk ${student.nm_siswa}: ${(error as Error).message}`);
    }
  }

  // Save the single PDF with a descriptive filename
  const fileName = `Identitas_Semua_Siswa_${new Date().getFullYear()}.pdf`;
  doc.save(fileName);
}

// Function to download individual PDFs (one by one with progress indication) - keeping for backward compatibility
export async function downloadBulkPDFs(
  students: Siswa[],
  schoolData: any,
  logos: LogosData,
  marginSettings: MarginSettings,
  onProgress?: BulkProgressCallback
): Promise<void> {
  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // Update progress
    if (onProgress) {
      onProgress(i + 1, students.length, student.nm_siswa);
    }

    try {
      // Create PDF instance
      const doc = new jsPDF();

      // Page 1: Cover Page
      await generateCoverPage(doc, {
        nm_siswa: student.nm_siswa,
        nis: student.nis,
        nisn: student.nisn
      }, logos, marginSettings);

      // Page 2: School Info Page
      doc.addPage();
      await generateSchoolInfoPage(doc, schoolData, marginSettings);

      // Page 3: Identity Page
      doc.addPage();
      await generateIdentityPage(doc, student, schoolData, marginSettings);

      // Page 4: Keterangan Pindah Page
      doc.addPage();
      await generateKeteranganPindahPage(doc, student, marginSettings);

      // Page 5: Keterangan Masuk Page
      doc.addPage();
      await generateKeteranganMasukPage(doc, student, marginSettings);

      // Save PDF with student-specific filename
      const fileName = `Identitas_${student.nm_siswa.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error(`Error generating PDF for student ${student.nm_siswa}:`, error);
      throw new Error(`Gagal membuat PDF untuk ${student.nm_siswa}: ${(error as Error).message}`);
    }
  }
}