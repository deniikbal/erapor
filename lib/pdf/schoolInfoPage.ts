import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';

interface SchoolData {
  nama: string;
  npsn: string | null;
  nss: string | null;
  alamat: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kab_kota: string | null;
  propinsi: string | null;
  website: string | null;
  email: string | null;
}

interface MarginSettings {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

export async function generateSchoolInfoPage(
  doc: jsPDF,
  schoolData: SchoolData,
  margins: MarginSettings = { margin_top: 25, margin_bottom: 20, margin_left: 20, margin_right: 20 }
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const xCenter = pageWidth / 2;
  let yPos = margins.margin_top;

  // Title
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(16);
  doc.text('SEKOLAH MENENGAH ATAS', xCenter, yPos, { align: 'center' });
  yPos += 8;
  doc.text('( SMA )', xCenter, yPos, { align: 'center' });
  yPos += 15;

  // School information table
  await setDejaVuFont(doc, 'normal');
  doc.setFontSize(13);
  
  const leftCol = margins.margin_left + 11;
  const colonCol = margins.margin_left + 50;
  const rightCol = margins.margin_left + 55;
  const lineHeight = 10;

  const schoolInfoData = [
    ['Nama Sekolah', schoolData.nama || '-'],
    ['NPSN', schoolData.npsn || '-'],
    ['NIS/NSS/NDS', schoolData.nss || '-'],
    ['Alamat Sekolah', schoolData.alamat || '-'],
    ['Kelurahan / Desa', schoolData.kelurahan || '-'],
    ['Kecamatan', schoolData.kecamatan || '-'],
    ['Kota/Kabupaten', schoolData.kab_kota || '-'],
    ['Provinsi', schoolData.propinsi || '-'],
    ['Website', schoolData.website || '-'],
    ['E-mail', schoolData.email || '-']
  ];

  schoolInfoData.forEach(([label, value]) => {
    doc.text(label, leftCol, yPos);
    doc.text(':', colonCol, yPos);
    
    // Handle long text with wrapping
    const maxWidth = pageWidth - rightCol - margins.margin_right;
    const lines = doc.splitTextToSize(value, maxWidth);
    
    lines.forEach((line: string, index: number) => {
      doc.text(line, rightCol, yPos + (index * 5));
    });
    
    yPos += lines.length > 1 ? (lines.length * 5 + 5) : lineHeight;
  });
}
