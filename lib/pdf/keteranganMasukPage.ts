import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './optimizedFontLoader';

interface StudentData {
  nm_siswa: string;
}

interface MarginSettings {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

export async function generateKeteranganMasukPage(
  doc: jsPDF,
  student: StudentData,
  margins: MarginSettings = { margin_top: 23, margin_bottom: 20, margin_left: 20, margin_right: 20 }
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const xCenter = pageWidth / 2;
  let yPos = margins.margin_top;

  // Title
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(14);
  doc.text('KETERANGAN PINDAH SEKOLAH', xCenter, yPos, { align: 'center' });
  yPos += 15;

  // Student name with dots
  await setDejaVuFont(doc, 'normal');
  doc.setFontSize(11);
  doc.text('Nama Peserta Didik  :', margins.margin_left, yPos);
  
  // Draw dots for filling
  const dotsStart = margins.margin_left + 40;
  const dotsEnd = pageWidth - margins.margin_right;
  const dotSpacing = 1;
  for (let x = dotsStart; x < dotsEnd; x += dotSpacing) {
    doc.text('.', x, yPos);
  }
  yPos += 7;

  // Main table structure
  const tableStartX = margins.margin_left;
  const tableStartY = yPos;
  const colWidths = [15, 50, 50, 55]; // NO, Labels, Lines, Signature
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0); // Sum of all column widths
  const headerRowHeight = 8;
  const dataRowHeight = 65;
  
  // Draw main table border
  const totalTableHeight = headerRowHeight + (dataRowHeight * 3);
  doc.rect(tableStartX, tableStartY, tableWidth, totalTableHeight);
  
  // Header row
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(12);
  
  let currentX = tableStartX;
  let currentY = tableStartY;
  
  // Draw header cells and text
  // NO column
  doc.line(currentX, currentY, currentX, currentY + headerRowHeight);
  doc.text('NO', currentX + (colWidths[0] / 2), currentY + (headerRowHeight / 2) + 2, { align: 'center' });
  currentX += colWidths[0];
  
  // MASUK column (spans 3 columns: Labels + Lines + Signature)
  doc.line(currentX, currentY, currentX, currentY + headerRowHeight);
  const masukWidth = colWidths[1] + colWidths[2] + colWidths[3];
  doc.text('MASUK', currentX + (masukWidth / 2), currentY + (headerRowHeight / 2) + 2, { align: 'center' });
  currentX += masukWidth;
  
  // Right border
  doc.line(currentX, currentY, currentX, currentY + headerRowHeight);
  
  // Draw horizontal line after header
  doc.line(tableStartX, currentY + headerRowHeight, tableStartX + tableWidth, currentY + headerRowHeight);
  
  // Data rows
  await setDejaVuFont(doc, 'normal');
  doc.setFontSize(10);
  
  for (let rowNum = 1; rowNum <= 3; rowNum++) {
    currentY += (rowNum === 1) ? headerRowHeight : dataRowHeight;
    currentX = tableStartX;
    
    // Column NO: Numbers aligned with items
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    const itemNumbers = ['1.', '2.', '3.', '4.', '', '', '5.'];
    let numberY = currentY + 8;
    itemNumbers.forEach(number => {
      if (number) {
        doc.text(number, currentX + (colWidths[0] / 2), numberY, { align: 'center' });
      }
      numberY += 8;
    });
    currentX += colWidths[0];
    
    // Column 1: Student info labels
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    const col1Items = [
      'Nama Siswa',
      'Nomor Induk', 
      'Nama Sekolah',
      'Masuk di Sekolah ini:',
      '   a. Tanggal',
      '   b. Di Kelas',
      'Tahun Ajaran'
    ];
    
    let itemY = currentY + 8;
    col1Items.forEach(item => {
      doc.text(item, currentX + 2, itemY);
      itemY += 8;
    });
    currentX += colWidths[1];
    
    // Column 2: Lines for filling (selective lines)
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    let lineY = currentY + 8;
    const showLine = [true, true, true, false, true, true, true];
    
    for (let i = 0; i < 7; i++) {
      if (showLine[i]) {
        const lineStart = currentX + 5;
        const lineEnd = currentX + colWidths[2] - 5;
        doc.line(lineStart, lineY + 3, lineEnd, lineY + 3);
      }
      lineY += 8;
    }
    currentX += colWidths[2];
    
    // Column 3: Signature area
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    
    // Dots for signature
    const sigDotsY1 = currentY + 8;
    const sigDotsStart = currentX + 5;
    const sigDotsEnd = currentX + colWidths[3] - 5;
    for (let x = sigDotsStart; x < sigDotsEnd; x += 1) {
      doc.text('.', x, sigDotsY1);
    }
    
    doc.text('Kepala Sekolah,', currentX + 5, currentY + 15);
    
    // More dots for NIP
    const sigDotsY2 = currentY + 50;
    for (let x = sigDotsStart; x < sigDotsEnd; x += 1) {
      doc.text('.', x, sigDotsY2);
    }
    doc.line(sigDotsStart, sigDotsY2 + 1, sigDotsEnd, sigDotsY2 + 1);
    
    doc.text('NIP.', currentX + 5, currentY + 55);
    
    currentX += colWidths[3];
    
    // Right border
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    
    // Bottom border for this row
    doc.line(tableStartX, currentY + dataRowHeight, tableStartX + tableWidth, currentY + dataRowHeight);
  }
}
