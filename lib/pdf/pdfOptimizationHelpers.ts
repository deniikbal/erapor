import type { jsPDF } from 'jspdf';

// Track current states per PDF instance to avoid redundant calls
const lineWidthCache = new WeakMap<jsPDF, number>();
const fillColorCache = new WeakMap<jsPDF, string>();
const fontSizeCache = new WeakMap<jsPDF, number>();

/**
 * Optimized setters for PDF state. Using WeakMap to handle multi-instance (bulk) correctly.
 */
export function setOptimizedLineWidth(doc: jsPDF, width: number): void {
    if (lineWidthCache.get(doc) !== width) {
        doc.setLineWidth(width);
        lineWidthCache.set(doc, width);
    }
}

export function setOptimizedFillColor(doc: jsPDF, r: number, g: number, b: number): void {
    const colorKey = `${r},${g},${b}`;
    if (fillColorCache.get(doc) !== colorKey) {
        doc.setFillColor(r, g, b);
        fillColorCache.set(doc, colorKey);
    }
}

export function setOptimizedFontSize(doc: jsPDF, size: number): void {
    if (fontSizeCache.get(doc) !== size) {
        doc.setFontSize(size);
        fontSizeCache.set(doc, size);
    }
}

export function clearOptimizationCaches(doc: jsPDF): void {
    lineWidthCache.delete(doc);
    fillColorCache.delete(doc);
    fontSizeCache.delete(doc);
}

export function updateFillColorCache(doc: jsPDF, r: number, g: number, b: number): void {
    fillColorCache.set(doc, `${r},${g},${b}`);
}

export function updateLineWidthCache(doc: jsPDF, width: number): void {
    lineWidthCache.set(doc, width);
}

