import type { jsPDF } from 'jspdf';
import { loadDejaVuFonts } from './fontLoader';

// Track current font state per PDF instance to avoid redundant setFont calls
const fontStateCache = new WeakMap<jsPDF, { family: string; style: string }>();

/**
 * Optimized font setter that only changes font when needed
 */
export async function setDejaVuFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): Promise<void> {
    try {
        // Load fonts if not already loaded for this instance
        const loaded = await loadDejaVuFonts(doc);

        if (loaded) {
            // Check if font is already set to avoid redundant operations
            const currentState = fontStateCache.get(doc);
            const targetFont = 'DejaVuSansCondensed';

            if (currentState?.family === targetFont && currentState?.style === style) {
                // Font already set, skip
                return;
            }

            // Set font and update cache
            doc.setFont(targetFont, style);
            fontStateCache.set(doc, { family: targetFont, style });
        } else {
            // Fallback to helvetica
            const currentState = fontStateCache.get(doc);
            if (currentState?.family === 'helvetica' && currentState?.style === style) {
                return;
            }

            doc.setFont('helvetica', style);
            fontStateCache.set(doc, { family: 'helvetica', style });
            console.warn('DejaVu font not loaded, using helvetica fallback');
        }
    } catch (error) {
        // Fallback to helvetica on error
        doc.setFont('helvetica', style);
        fontStateCache.set(doc, { family: 'helvetica', style });
        console.error('Error setting font, using helvetica fallback:', error);
    }
}

/**
 * Clear font state when starting a new page (optional, for manual control)
 */
export function clearFontState(doc: jsPDF): void {
    fontStateCache.delete(doc);
}
