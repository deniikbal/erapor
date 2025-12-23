import type { jsPDF } from 'jspdf';

// Cache for text splitting results
interface TextSplitCacheKey {
    text: string;
    width: number;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
}

class TextSplitCache {
    private cache = new Map<string, string[]>();
    private maxCacheSize = 500; // Limit cache size

    private createKey(key: TextSplitCacheKey): string {
        return `${key.text}_${key.width}_${key.fontSize}_${key.fontFamily}_${key.fontStyle}`;
    }

    get(key: TextSplitCacheKey): string[] | undefined {
        return this.cache.get(this.createKey(key));
    }

    set(key: TextSplitCacheKey, value: string[]): void {
        // Simple LRU: if cache is full, delete oldest entry
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(this.createKey(key), value);
    }

    clear(): void {
        this.cache.clear();
    }
}

const globalTextSplitCache = new TextSplitCache();

/**
 * Optimized text splitting with caching
 */
export function optimizedSplitTextToSize(
    doc: jsPDF,
    text: string,
    maxWidth: number
): string[] {
    // Get current font properties
    const fontSize = (doc.internal as any).getFontSize();
    const fontFamily = (doc.internal as any).getFont().fontName;
    const fontStyle = (doc.internal as any).getFont().fontStyle;

    const cacheKey: TextSplitCacheKey = {
        text,
        width: maxWidth,
        fontSize,
        fontFamily,
        fontStyle,
    };

    // Check cache first
    const cached = globalTextSplitCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Not in cache, compute
    const result = doc.splitTextToSize(text, maxWidth);

    // Store in cache
    globalTextSplitCache.set(cacheKey, result);

    return result;
}

/**
 * Clear text split cache (useful for memory management)
 */
export function clearTextSplitCache(): void {
    globalTextSplitCache.clear();
}
