/**
 * Retry helper for database queries with exponential backoff
 */
export async function retryQuery<T>(
    queryFn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await queryFn();
        } catch (error: any) {
            lastError = error;

            // Check if it's a timeout error
            const isTimeout =
                error?.message?.includes('ETIMEDOUT') ||
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('Error connecting to database');

            // If not a timeout or last attempt, throw immediately
            if (!isTimeout || attempt === maxRetries - 1) {
                throw error;
            }

            // Exponential backoff: wait before retry
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`Database timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Query with timeout wrapper
 */
export async function queryWithTimeout<T>(
    queryFn: () => Promise<T>,
    timeoutMs: number = 30000
): Promise<T> {
    return Promise.race([
        queryFn(),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
    ]);
}
