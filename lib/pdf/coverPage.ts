import type { jsPDF } from 'jspdf';
import { getBase64Image } from './helpers';
import { setDejaVuFont } from './optimizedFontLoader';

interface StudentData {
  nm_siswa: string;
  nis: string;
  nisn: string | null;
}

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

export async function generateCoverPage(
  doc: jsPDF, 
  student: StudentData, 
  logos: LogosData,
  margins: MarginSettings = { margin_top: 25, margin_bottom: 20, margin_left: 20, margin_right: 20 }
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const xCenter = pageWidth / 2;
  let yPos = margins.margin_top;

  // 1. Logo Pemda (Top)
  if (logos && logos.logo_pemda) {
    console.log('Attempting to load logo_pemda:', logos.logo_pemda);
    const logoData = await getBase64Image(logos.logo_pemda);
    if (logoData) {
      const w = 45; 
      const h = 50;
      // Detect image format from base64 string
      const format = logoData.includes('image/png') ? 'PNG' : 'JPEG';
      console.log('Adding logo_pemda to PDF, format:', format);
      doc.addImage(logoData, format, xCenter - (w/2), yPos, w, h);
      yPos += 65; 
    } else { 
      console.warn('Logo pemda not loaded, skipping');
      yPos += 40; 
    }
  } else { 
    console.log('No logo_pemda provided');
    yPos += 40; 
  }

  // 2. School Title
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(20);
  doc.text('SEKOLAH MENENGAH ATAS', xCenter, yPos, { align: 'center' });
  yPos += 8;
  doc.text('( SMA )', xCenter, yPos, { align: 'center' });
  yPos += 20;

  // 3. Logo Sekolah (Middle)
  if (logos && logos.logo_sek) {
    console.log('Attempting to load logo_sek:', logos.logo_sek);
    const logoData = await getBase64Image(logos.logo_sek);
    if (logoData) {
      const w = 45; 
      const h = 50;
      // Detect image format from base64 string
      const format = logoData.includes('image/png') ? 'PNG' : 'JPEG';
      console.log('Adding logo_sek to PDF, format:', format);
      doc.addImage(logoData, format, xCenter - (w/2), yPos, w, h);
      yPos += 55; 
    } else { 
      console.warn('Logo sekolah not loaded, skipping');
      yPos += 55; 
    }
  } else { 
    console.log('No logo_sek provided');
    yPos += 55; 
  }
  
  yPos += 15;

  // 4. Student Name
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(18);
  doc.text('Nama Peserta Didik', xCenter, yPos, { align: 'center' });
  yPos += 3;
  
  // Name Box
  const boxWidth = 130;
  const boxHeight = 10;
  const xBox = xCenter - (boxWidth / 2);
  doc.rect(xBox, yPos, boxWidth, boxHeight);
  doc.setFontSize(18);
  doc.text(student.nm_siswa ? student.nm_siswa.toUpperCase() : '', xCenter, yPos + 8, { align: 'center' });
  
  yPos += 25;

  // 5. NISN / NIS
  doc.setFontSize(18);
  doc.text('NISN / NIS', xCenter, yPos, { align: 'center' });
  yPos += 3;
  
  // NISN Box
  doc.rect(xBox, yPos, boxWidth, boxHeight);
  doc.setFontSize(18);
  const nisnNis = `${student.nisn || ''} / ${student.nis || ''}`;
  doc.text(nisnNis, xCenter, yPos + 8, { align: 'center' });

  // 6. Footer
  const yFooter = pageHeight - 45;
  doc.setFontSize(18);
  doc.text('KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH', xCenter, yFooter, { align: 'center' });
  doc.text('REPUBLIK INDONESIA', xCenter, yFooter + 8, { align: 'center' });
}
