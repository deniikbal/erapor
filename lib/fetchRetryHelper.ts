/**
 * Fetch with retry mechanism for handling intermittent API failures
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, method, body, etc.)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in milliseconds before first retry (default: 1000ms)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // If response is OK or a client error (4xx), return immediately
            // Don't retry client errors as they indicate bad request, not found, etc.
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }

            // Server error (5xx) - will retry
            if (response.status >= 500) {
                lastError = new Error(`Server error: ${response.status} ${response.statusText}`);

                // If this is the last attempt, return the error response
                if (attempt === maxRetries - 1) {
                    return response;
                }

                // Wait before retry
                const delay = initialDelay * Math.pow(2, attempt);
                console.log(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}) - URL: ${url}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Other status codes, return as-is
            return response;

        } catch (error: any) {
            lastError = error;

            // Check if it's a network error that we should retry
            const isNetworkError =
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('ETIMEDOUT') ||
                error?.message?.includes('ECONNREFUSED') ||
                error?.message?.includes('network') ||
                error?.name === 'TypeError';

            // If not a network error or last attempt, throw immediately
            if (!isNetworkError || attempt === maxRetries - 1) {
                throw error;
            }

            // Exponential backoff: wait before retry
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}) - URL: ${url}`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Max retries exceeded');
}

/**
 * Fetch with retry and automatic JSON parsing
 * Throws descriptive error if response is not ok
 */
export async function fetchJsonWithRetry<T = any>(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    const response = await fetchWithRetry(url, options, maxRetries, initialDelay);

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}
