import type { jsPDF } from 'jspdf';

// Track current line width state per PDF instance
const lineWidthCache = new WeakMap<jsPDF, number>();

/**
 * Optimized line width setter that only changes when needed
 */
export function setOptimizedLineWidth(doc: jsPDF, width: number): void {
    const currentWidth = lineWidthCache.get(doc);

    if (currentWidth !== width) {
        doc.setLineWidth(width);
        lineWidthCache.set(doc, width);
    }
}

/**
 * Optimized fill color setter that caches color state
 */
const fillColorCache = new WeakMap<jsPDF, string>();

export function setOptimizedFillColor(doc: jsPDF, r: number, g: number, b: number): void {
    const colorKey = `${r},${g},${b}`;
    const currentColor = fillColorCache.get(doc);

    if (currentColor !== colorKey) {
        doc.setFillColor(r, g, b);
        fillColorCache.set(doc, colorKey);
    }
}

/**
 * Optimized font size setter
 */
const fontSizeCache = new WeakMap<jsPDF, number>();

export function setOptimizedFontSize(doc: jsPDF, size: number): void {
    const currentSize = fontSizeCache.get(doc);

    if (currentSize !== size) {
        doc.setFontSize(size);
        fontSizeCache.set(doc, size);
    }
}

/**
 * Clear all optimization caches (useful when starting fresh)
 */
export function clearOptimizationCaches(doc: jsPDF): void {
    lineWidthCache.delete(doc);
    fillColorCache.delete(doc);
    fontSizeCache.delete(doc);
}

/**
 * Update fill color cache manually (when using direct setFillColor)
 */
export function updateFillColorCache(doc: jsPDF, r: number, g: number, b: number): void {
    const colorKey = `${r},${g},${b}`;
    fillColorCache.set(doc, colorKey);
}

/**
 * Update line width cache manually (when using direct setLineWidth)
 */
export function updateLineWidthCache(doc: jsPDF, width: number): void {
    lineWidthCache.set(doc, width);
}

