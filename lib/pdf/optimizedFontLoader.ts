import type { jsPDF } from 'jspdf';
import { loadDejaVuFonts } from './fontLoader';

/**
 * Stateless font setter that always calls doc.setFont.
 * Removed all caching to prevent desynchronization during bulk PDF generation.
 */
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
 * Force set font - identical to setDejaVuFont now as it's no longer cached.
 */
export async function forceSetDejaVuFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): Promise<void> {
    return setDejaVuFont(doc, style);
}

/**
 * Clear font state - now a no-op as there is no cache.
 */
export function clearFontState(_doc: jsPDF): void {
}
