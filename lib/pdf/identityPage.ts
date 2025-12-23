import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';
import { formatDate, capitalizeWords, toUpperCase, getBase64Image } from './helpers';

interface StudentIdentityData {
  nm_siswa: string;
  nis: string;
  nisn: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_dalam_kel?: string | null;
  anak_ke?: string | null;
  alamat_siswa?: string | null;
  telepon_siswa?: string | null;
  sekolah_asal?: string | null;
  diterima_kelas?: string | null;
  nm_ayah?: string | null;
  nm_ibu?: string | null;
  alamat_ortu?: string | null;
  telepon_ortu?: string | null;
  pekerjaan_ayah?: string | null;
  pekerjaan_ibu?: string | null;
  nm_wali?: string | null;
  alamat_wali?: string | null;
  telepon_wali?: string | null;
  pekerjaan_wali?: string | null;
}

interface MarginSettings {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

interface SchoolData {
  nama: string;
  nm_kepsek: string | null;
  nip_kepsek: string | null;
  kab_kota: string | null;
}

export async function generateIdentityPage(
  doc: jsPDF,
  student: StudentIdentityData,
  schoolData: SchoolData,
  margins: MarginSettings = { margin_top: 23, margin_bottom: 20, margin_left: 20, margin_right: 20 }
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = margins.margin_left;
  let yPos = margins.margin_top;

  // Load Pass Photo
  let photoBase64 = '';
  try {
    photoBase64 = await getBase64Image('/img/pp.jpg') || '';
  } catch (error) {
    console.error('Error loading photo:', error);
  }

  // Title
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(14);
  doc.text('IDENTITAS PESERTA DIDIK', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 13;
  doc.setFontSize(11);
  await setDejaVuFont(doc, 'normal');

  // Helper function to add rows
  const addRow = (no: string, label: string, value: string, isSubItem: boolean = false) => {
    const xNo = margin;
    const xLabel = margin + 10;
    const xColon = margin + 70;
    const xValue = margin + 75;
    
    if (no) doc.text(no, xNo, yPos);
    doc.text(label, xLabel, yPos);
    doc.text(':', xColon, yPos);
    
    if (value) {
      const maxWidth = pageWidth - xValue - margins.margin_right;
      const lines = doc.splitTextToSize(value, maxWidth);
      lines.forEach((line: string, i: number) => {
        doc.text(line, xValue, yPos + (i * 5));
      });
      yPos += (lines.length - 1) * 5 + 7;
    } else {
      yPos += 7;
    }
  };

  // Student data
  addRow('1.', 'Nama Lengkap Peserta Didik', student.nm_siswa || '');
  addRow('2.', 'Nomor Induk/NISN', `${student.nis || ''} / ${student.nisn || ''}`);
  
  // Format birth date
  let birthDateFormatted = '';
  if (student.tanggal_lahir) {
    if (student.tanggal_lahir.match(/^\d{4}-\d{2}-\d{2}/)) {
      birthDateFormatted = formatDate(student.tanggal_lahir);
    } else {
      birthDateFormatted = student.tanggal_lahir;
    }
  }
  const birthInfo = student.tempat_lahir && birthDateFormatted 
    ? `${student.tempat_lahir}, ${birthDateFormatted}` 
    : (student.tempat_lahir || '');
  addRow('3.', 'Tempat ,Tanggal Lahir', birthInfo);
  
  addRow('4.', 'Jenis Kelamin', student.jenis_kelamin || '');
  addRow('5.', 'Agama', student.agama || '');
  addRow('6.', 'Status dalam Keluarga', student.status_dalam_kel || '');
  addRow('7.', 'Anak ke', student.anak_ke || '');
  addRow('8.', 'Alamat Peserta Didik', student.alamat_siswa || '');
  addRow('9.', 'Nomor Telepon Rumah', student.telepon_siswa || '');
  addRow('10.', 'Sekolah Asal', toUpperCase(student.sekolah_asal));
  
  addRow('11.', 'Diterima di sekolah ini', '');
  addRow('', 'Di kelas', student.diterima_kelas || 'X');
  addRow('', 'Pada tanggal', '14 Juli 2025');
  
  addRow('12.', 'Nama Orang Tua', '');
  addRow('', 'a. Ayah', capitalizeWords(student.nm_ayah), true);
  addRow('', 'b. Ibu', capitalizeWords(student.nm_ibu), true);
  
  addRow('13.', 'Alamat Orang Tua', student.alamat_ortu || '');
  addRow('', 'Nomor Telepon Rumah', student.telepon_ortu || '', true);
  
  addRow('14.', 'Pekerjaan Orang Tua :', '');
  addRow('', 'a. Ayah', student.pekerjaan_ayah || '', true);
  addRow('', 'b. Ibu', student.pekerjaan_ibu || '', true);
  
  addRow('15.', 'Nama Wali Siswa', student.nm_wali || '');
  addRow('16.', 'Alamat Wali Peserta Didik', student.alamat_wali || '');
  addRow('', 'Nomor Telepon Rumah', student.telepon_wali || '', true);
  addRow('17.', 'Pekerjaan Wali Peserta Didik', student.pekerjaan_wali || '');

  // Signature section
  yPos += 10;
  const signatureStartY = yPos;
  const photoX = margin + 47;
  const signatureX = pageWidth - margins.margin_right - 80;
  
  // Add photo if available
  if (photoBase64) {
    try {
      const format = photoBase64.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(photoBase64, format, photoX, signatureStartY, 30, 40);
    } catch (error) {
      console.error('Error adding photo:', error);
      // Draw placeholder box
      doc.rect(photoX, signatureStartY, 30, 40);
      doc.setFontSize(8);
      doc.text('Foto 3x4', photoX + 15, signatureStartY + 22, { align: 'center' });
    }
  } else {
    doc.rect(photoX, signatureStartY, 30, 40);
    doc.setFontSize(8);
    doc.text('Foto 3x4', photoX + 15, signatureStartY + 22, { align: 'center' });
  }
  
  // Signature area
  yPos = signatureStartY + 4;
  await setDejaVuFont(doc, 'normal');
  doc.setFontSize(11);
  
  // Get tempat from school data
  const tempat = schoolData.kab_kota 
    ? schoolData.kab_kota.replace(/^Kab\. |^Kota /, '').trim()
    : 'Bantarujeg';
  
  doc.text(`${tempat}, 14 Juli 2025`, signatureX, yPos);
  yPos += 5;
  doc.text('Kepala Sekolah', signatureX, yPos);
  
  yPos += 24;
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(10);
  const namaKepala = schoolData.nm_kepsek || 'Dr. H. Toto Warsito, S.Ag., M.Ag.';
  doc.text(namaKepala, signatureX, yPos);
  
  // Underline nama kepala sekolah
  try {
    const textWidth = doc.getTextWidth(namaKepala);
    doc.line(signatureX, yPos + 1, signatureX + textWidth, yPos + 1);
  } catch (error) {
    doc.line(signatureX, yPos + 1, signatureX + (namaKepala.length * 2.5), yPos + 1);
  }
  
  yPos += 5;
  doc.setFontSize(10);
  const nipKepala = schoolData.nip_kepsek || '19730302 199802 1 002';
  doc.text(`NIP. ${nipKepala}`, signatureX, yPos);
}
