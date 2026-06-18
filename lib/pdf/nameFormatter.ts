/**
 * Format Indonesian-style name with academic titles (gelar).
 *
 * Indonesian convention places the back-gelar AFTER the name, separated by a
 * comma (e.g. "Deni, S.Pd"). The front-gelar (if any) is placed before the
 * name with a single space.
 *
 * Examples:
 *   formatNamaDenganGelar('Deni', '',     'S.Pd')  -> 'Deni, S.Pd'
 *   formatNamaDenganGelar('Deni', 'Dr.',  'S.Pd')  -> 'Dr. Deni, S.Pd'
 *   formatNamaDenganGelar('Deni', 'Dr.',  '')       -> 'Dr. Deni'
 *   formatNamaDenganGelar('Deni', '',     '')       -> 'Deni'
 *   formatNamaDenganGelar('',     'Dr.',  'S.Pd')   -> 'Dr. S.Pd'   (no name, falls back to a simple join)
 *   formatNamaDenganGelar('',     '',     '')       -> ''
 *
 * The fallback case (no name) returns the two gelar joined with a single
 * space so the caller still gets something non-empty rather than a silent
 * blank signature line.
 */
export function formatNamaDenganGelar(
    nama: string | null | undefined,
    gelarDepan: string | null | undefined,
    gelarBelakang: string | null | undefined
): string {
    const namaTrim = (nama ?? '').trim();
    const gdTrim = (gelarDepan ?? '').trim();
    const gbTrim = (gelarBelakang ?? '').trim();

    // Edge case: no name at all - return the two gelar joined by a space.
    if (!namaTrim) {
        return [gdTrim, gbTrim].filter(Boolean).join(' ');
    }

    // Build from the middle out: start with the name, append back-gelar
    // (comma-separated), then prepend front-gelar (space-separated).
    let result = namaTrim;
    if (gbTrim) {
        result = `${result}, ${gbTrim}`;
    }
    if (gdTrim) {
        result = `${gdTrim} ${result}`;
    }
    return result;
}
