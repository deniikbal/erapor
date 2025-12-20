import type { jsPDF } from 'jspdf';

// Cache untuk font yang sudah di-load
declare global {
  interface Window {
    fontsLoaded?: boolean;
    fontLoadPromise?: Promise<boolean>;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function loadDejaVuFonts(doc: jsPDF): Promise<boolean> {
  // Check if already loaded
  if (window.fontsLoaded) {
    console.log('Fonts already loaded');
    return true;
  }
  
  // Check if loading is in progress
  if (window.fontLoadPromise) {
    console.log('Font loading in progress, waiting...');
    return window.fontLoadPromise;
  }
  
  // Start loading fonts
  window.fontLoadPromise = (async () => {
    try {
      console.log('Loading DejaVu Sans fonts...');
      
      const fontPaths = {
        'DejaVuSansCondensed-normal': '/fonts/dejavu-sans/DejaVuSansCondensed.ttf',
        'DejaVuSansCondensed-bold': '/fonts/dejavu-sans/DejaVuSansCondensed-Bold.ttf'
      };
      
      for (const [fontKey, fontPath] of Object.entries(fontPaths)) {
        try {
          console.log(`Loading font: ${fontKey} from ${fontPath}`);
          const response = await fetch(fontPath);
          
          if (response.ok) {
            const fontArrayBuffer = await response.arrayBuffer();
            const fontBase64 = arrayBufferToBase64(fontArrayBuffer);
            
            const [fontName, fontStyle] = fontKey.split('-');
            
            // Add font to jsPDF
            doc.addFileToVFS(`${fontName}.ttf`, fontBase64);
            doc.addFont(`${fontName}.ttf`, fontName, fontStyle);
            
            console.log(`Font loaded successfully: ${fontKey}`);
          } else {
            console.warn(`Failed to load font: ${fontKey}, status: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Error loading font ${fontKey}:`, error);
        }
      }
      
      window.fontsLoaded = true;
      console.log('All fonts loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading fonts:', error);
      return false;
    }
  })();
  
  return window.fontLoadPromise;
}

export async function setDejaVuFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): Promise<void> {
  try {
    const loaded = await loadDejaVuFonts(doc);
    
    if (loaded && window.fontsLoaded) {
      doc.setFont('DejaVuSansCondensed', style);
      console.log(`Font set to DejaVuSansCondensed-${style}`);
    } else {
      // Fallback to helvetica
      doc.setFont('helvetica', style);
      console.warn('DejaVu font not loaded, using helvetica fallback');
    }
  } catch (error) {
    // Fallback to helvetica on error
    doc.setFont('helvetica', style);
    console.error('Error setting font, using helvetica fallback:', error);
  }
}
