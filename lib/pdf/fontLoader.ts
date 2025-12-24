import type { jsPDF } from 'jspdf';

// Cache untuk font yang sudah di-load
declare global {
  interface Window {
    dejavuFontsCache?: {
      normal: string;
      bold: string;
    };
    fontLoadPromise?: Promise<boolean>;
    pdfInstanceFontCache?: WeakSet<jsPDF>;
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

async function ensureFontsLoaded(): Promise<void> {
  // If fonts already cached, return early
  if (window.dejavuFontsCache) {
    return;
  }

  // If loading is in progress, wait
  if (window.fontLoadPromise) {
    await window.fontLoadPromise;
    return;
  }

  // Start loading fonts
  window.fontLoadPromise = (async () => {
    try {
      console.log('Loading DejaVu Sans fonts to cache...');

      const fontPaths = {
        'normal': '/fonts/dejavu-sans/DejaVuSansCondensed.ttf',
        'bold': '/fonts/dejavu-sans/DejaVuSansCondensed-Bold.ttf'
      };

      const cache: any = {};

      for (const [style, fontPath] of Object.entries(fontPaths)) {
        try {
          console.log(`Loading font: DejaVu-${style} from ${fontPath}`);
          const response = await fetch(fontPath);

          if (response.ok) {
            const fontArrayBuffer = await response.arrayBuffer();
            const fontBase64 = arrayBufferToBase64(fontArrayBuffer);
            cache[style] = fontBase64;
            console.log(`Font cached successfully: DejaVu-${style}`);
          } else {
            console.warn(`Failed to load font: DejaVu-${style}, status: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Error loading font DejaVu-${style}:`, error);
        }
      }

      window.dejavuFontsCache = cache;
      console.log('All fonts cached successfully');
      return true;
    } catch (error) {
      console.error('Error loading fonts:', error);
      return false;
    }
  })();

  await window.fontLoadPromise;
}

export async function loadDejaVuFonts(doc: jsPDF): Promise<boolean> {
  try {
    // Check if font is already in this document instance
    const fontList = doc.getFontList();
    if (fontList['DejaVuSansCondensed']) {
      return true;
    }

    // Ensure fonts are loaded to the global cache (base64)
    await ensureFontsLoaded();

    if (!window.dejavuFontsCache) {
      console.warn('DejaVu fonts not in global cache');
      return false;
    }

    // Add fonts to this specific jsPDF instance
    if (window.dejavuFontsCache.normal) {
      doc.addFileToVFS('DejaVuSansCondensed.ttf', window.dejavuFontsCache.normal);
      doc.addFont('DejaVuSansCondensed.ttf', 'DejaVuSansCondensed', 'normal');
    }

    if (window.dejavuFontsCache.bold) {
      doc.addFileToVFS('DejaVuSansCondensed-Bold.ttf', window.dejavuFontsCache.bold);
      doc.addFont('DejaVuSansCondensed-Bold.ttf', 'DejaVuSansCondensed', 'bold');
    }

    return true;
  } catch (error) {
    console.error('Error loading fonts into jsPDF:', error);
    return false;
  }
}

export async function setDejaVuFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): Promise<void> {
  try {
    const loaded = await loadDejaVuFonts(doc);

    if (loaded) {
      doc.setFont('DejaVuSansCondensed', style);
    } else {
      doc.setFont('helvetica', style);
    }
  } catch (error) {
    doc.setFont('helvetica', style);
    console.error('Error setting font:', error);
  }
}
