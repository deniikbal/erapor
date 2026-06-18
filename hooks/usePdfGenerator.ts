'use client';

import { useEffect } from 'react';

/**
 * Type for the loaded PDF generator modules. Keeping this as a loose record so
 * individual generators can be picked by property without TypeScript ceremony.
 */
export type PdfGeneratorModules = {
  jsPDF: any;
  loadDejaVuFonts: any;
  generateNilaiRaporHeader: any;
  getFaseByTingkat: any;
  generateNilaiRaporTable: any;
  generateKokurikulerTable: any;
  generateEkstrakurikulerTable: any;
  generateKetidakhadiranTable: any;
  generateCatatanWaliTable: any;
  generateKeteranganKelulusanTable: any;
  generateTanggapanOrtuTable: any;
  generateSignatureSection: any;
  generateNilaiRaporFooter: any;
  generateStudentHeaderInfo: any;
  fetchWithRetry: any;
};

let cachedPromise: Promise<PdfGeneratorModules> | null = null;

/**
 * Preload the entire PDF generator stack (jsPDF + every lib/pdf/* module +
 * DejaVu fonts). Subsequent calls return the cached promise, so the actual
 * work only runs once per browser session.
 *
 * Call this from a useEffect on mount or any time before the user clicks
 * "Cetak PDF" to remove the 2-4 second cold-start delay from the click path.
 */
export function preloadPdfGenerator(): Promise<PdfGeneratorModules> {
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async (): Promise<PdfGeneratorModules> => {
    const [
      jspdfMod,
      pageMod,
      tableMod,
      fontLoaderMod,
      kokurikulerMod,
      ekstraMod,
      kehadiranMod,
      catatanMod,
      kelulusanMod,
      tanggapanMod,
      signatureMod,
      footerMod,
      headerInfoMod,
      fetchRetryMod,
    ] = await Promise.all([
      import('jspdf'),
      import('@/lib/pdf/nilaiRaporPage'),
      import('@/lib/pdf/nilaiRaporTable'),
      import('@/lib/pdf/fontLoader'),
      import('@/lib/pdf/kokurikulerTable'),
      import('@/lib/pdf/ekstrakurikulerTable'),
      import('@/lib/pdf/ketidakhadiranTable'),
      import('@/lib/pdf/catatanWaliTable'),
      import('@/lib/pdf/keteranganKelulusanTable'),
      import('@/lib/pdf/tanggapanOrtuTable'),
      import('@/lib/pdf/signatureSection'),
      import('@/lib/pdf/nilaiRaporFooter'),
      import('@/lib/pdf/studentHeaderInfo'),
      import('@/lib/fetchRetryHelper'),
    ]);

    // Warm up the font cache by registering the fonts into a throw-away doc.
    // This avoids paying the first-doc font cost inside the real generation loop.
    try {
      const warmupDoc = new jspdfMod.jsPDF();
      await fontLoaderMod.loadDejaVuFonts(warmupDoc);
    } catch (err) {
      // Non-fatal: the real loadDejaVuFonts call will retry on the actual doc
      console.warn('PDF font warmup failed (will retry on real doc):', err);
    }

    return {
      jsPDF: jspdfMod.jsPDF,
      loadDejaVuFonts: fontLoaderMod.loadDejaVuFonts,
      generateNilaiRaporHeader: pageMod.generateNilaiRaporHeader,
      getFaseByTingkat: tableMod.getFaseByTingkat,
      generateNilaiRaporTable: tableMod.generateNilaiRaporTable,
      generateKokurikulerTable: kokurikulerMod.generateKokurikulerTable,
      generateEkstrakurikulerTable: ekstraMod.generateEkstrakurikulerTable,
      generateKetidakhadiranTable: kehadiranMod.generateKetidakhadiranTable,
      generateCatatanWaliTable: catatanMod.generateCatatanWaliTable,
      generateKeteranganKelulusanTable: kelulusanMod.generateKeteranganKelulusanTable,
      generateTanggapanOrtuTable: tanggapanMod.generateTanggapanOrtuTable,
      generateSignatureSection: signatureMod.generateSignatureSection,
      generateNilaiRaporFooter: footerMod.generateNilaiRaporFooter,
      generateStudentHeaderInfo: headerInfoMod.generateStudentHeaderInfo,
      fetchWithRetry: fetchRetryMod.fetchWithRetry,
    };
  })();

  return cachedPromise;
}

/**
 * React hook that triggers the preload once on mount. Safe to call from any
 * client component; the actual work is deduplicated by the module-level cache.
 */
export function usePdfGeneratorPreload(): void {
  useEffect(() => {
    preloadPdfGenerator().catch((err) => {
      console.warn('PDF generator preload failed:', err);
    });
  }, []);
}
