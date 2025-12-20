import type { jsPDF } from 'jspdf';
import { setDejaVuFont } from './fontLoader';

interface StudentData {
  nm_siswa: string;
}

interface MarginSettings {
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
}

export async function generateKeteranganPindahPage(
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

  // Table structure
  const tableStartX = margins.margin_left;
  const tableStartY = yPos;
  const colWidths = [25, 30, 50, 65];
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const rowHeight = 25;
  const dataRowHeight = 65;
  const headerRowHeight = 8;
  
  // Table headers
  await setDejaVuFont(doc, 'bold');
  doc.setFontSize(9);
  
  // Draw table border (header + sub-header + 3 data rows)
  const totalTableHeight = headerRowHeight + rowHeight + (dataRowHeight * 3);
  doc.rect(tableStartX, tableStartY, tableWidth, totalTableHeight);
  
  // First row: Merged "KELUAR" header (8mm height)
  doc.setFontSize(11);
  doc.text('KELUAR', tableStartX + (tableWidth / 2), tableStartY + (headerRowHeight / 2) + 2, { align: 'center' });
  
  // Draw horizontal line after merged header
  doc.line(tableStartX, tableStartY + headerRowHeight, tableStartX + tableWidth, tableStartY + headerRowHeight);
  
  // Second row: Sub-headers
  let currentX = tableStartX;
  let currentY = tableStartY + headerRowHeight;
  
  // Draw header cells
  doc.line(currentX, currentY, currentX, currentY + rowHeight);
  doc.text('Tanggal', currentX + (colWidths[0] / 2), currentY + (rowHeight / 2) + 2, { 
    align: 'center', 
    maxWidth: colWidths[0] - 4 
  });
  currentX += colWidths[0];
  
  doc.line(currentX, currentY, currentX, currentY + rowHeight);
  const headerText1 = doc.splitTextToSize('Kelas yang ditinggalkan', colWidths[1] - 4);
  const text1Height = headerText1.length * 4;
  const text1StartY = currentY + (rowHeight / 2) - (text1Height / 2) + 2;
  doc.text(headerText1, currentX + (colWidths[1] / 2), text1StartY, { align: 'center' });
  currentX += colWidths[1];
  
  doc.line(currentX, currentY, currentX, currentY + rowHeight);
  const headerText2 = doc.splitTextToSize('Sebab-sebab Keluar atau Atas Permintaan (Tertulis)', colWidths[2] - 4);
  const text2Height = headerText2.length * 4;
  const text2StartY = currentY + (rowHeight / 2) - (text2Height / 2) + 2;
  doc.text(headerText2, currentX + (colWidths[2] / 2), text2StartY, { align: 'center' });
  currentX += colWidths[2];
  
  doc.line(currentX, currentY, currentX, currentY + rowHeight);
  const headerText3 = doc.splitTextToSize('Tanda Tangan Kepala Sekolah, Stempel Sekolah, dan Tanda Tangan Orang Tua/Wali', colWidths[3] - 4);
  const text3Height = headerText3.length * 4;
  const text3StartY = currentY + (rowHeight / 2) - (text3Height / 2) + 2;
  doc.text(headerText3, currentX + (colWidths[3] / 2), text3StartY, { align: 'center' });
  currentX += colWidths[3];
  
  doc.line(currentX, currentY, currentX, currentY + rowHeight);
  
  // Draw horizontal line after header
  doc.line(tableStartX, currentY + rowHeight, tableStartX + tableWidth, currentY + rowHeight);
  
  // Draw 3 empty rows for data
  await setDejaVuFont(doc, 'normal');
  for (let i = 1; i <= 3; i++) {
    currentY += (i === 1) ? rowHeight : dataRowHeight;
    currentX = tableStartX;
    
    // Draw vertical lines for each column
    for (let j = 0; j < colWidths.length; j++) {
      doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
      
      // Add signature labels in the last column
      if (j === colWidths.length - 1) {
        doc.setFontSize(10);
        
        // Dots above "Kepala Sekolah"
        const dotsY1 = currentY + 8;
        const dotSpacing = 1;
        const dotStartX = currentX + 5;
        const dotEndX = currentX + colWidths[j] - 5;
        for (let x = dotStartX; x < dotEndX; x += dotSpacing) {
          doc.text('.', x, dotsY1);
        }
        
        doc.text('Kepala Sekolah,', currentX + 5, currentY + 12);
        
        // Dots above "NIP" with underline
        const dotsY2 = currentY + 30;
        for (let x = dotStartX; x < dotEndX; x += dotSpacing) {
          doc.text('.', x, dotsY2);
        }
        // Underline for NIP dots
        doc.line(dotStartX, dotsY2 + 1, dotEndX, dotsY2 + 1);
        
        doc.text('NIP:', currentX + 5, currentY + 35);
        doc.text('Orang Tua/Wali,', currentX + 5, currentY + 39);
        
        // Dots below "Orang Tua/Wali" with underline
        const dotsY4 = currentY + 60;
        for (let x = dotStartX; x < dotEndX; x += dotSpacing) {
          doc.text('.', x, dotsY4);
        }
        // Underline for Orang Tua/Wali dots
        doc.line(dotStartX, dotsY4 + 1, dotEndX, dotsY4 + 1);
      }
      
      currentX += colWidths[j];
    }
    
    // Draw right border
    doc.line(currentX, currentY, currentX, currentY + dataRowHeight);
    
    // Draw horizontal line after each row
    doc.line(tableStartX, currentY + dataRowHeight, tableStartX + tableWidth, currentY + dataRowHeight);
  }
}
