import type { jsPDF } from 'jspdf';
import { loadDejaVuFonts } from './fontLoader';

// NOTE on previous "style cache":
// We intentionally do NOT cache the last-set style anymore. The footer
// (`nilaiRaporFooter.ts`) calls `doc.setFont('courier', 'bold')` directly,
// bypassing this module. A style-cache would think "DejaVu normal is still
// active" after the footer ran, and skip the actual doc.setFont() call on the
// next setDejaVuFont(), leaving the doc in Courier for subsequent pages.
//
// The expensive part (loading the DejaVu font files into the doc) is still
// cached in `fontLoader.ts` via a per-document WeakSet, so we keep the big
// win without the bug. The setFont() call itself is cheap (~0.1ms).

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
        console.error('Error in setDejaVuFont:', error);
    }
}

/**
 * Force re-apply font (kept as alias for backwards compatibility).
 */
export async function forceSetDejaVuFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): Promise<void> {
    return setDejaVuFont(doc, style);
}

/**
 * Reserved for future use. With the new approach there's no per-document style
 * cache to clear, so this is currently a no-op. Kept exported because callers
 * (bulk PDF loops) call it before doc.addPage() and we want to preserve that
 * call-site contract.
 */
export function clearFontState(_doc: jsPDF): void {
    // intentionally empty - see note above
}
