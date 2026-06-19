import { getDbClient } from '@/lib/db';

/**
 * Convenience alias for the Neon SQL template tag function returned by
 * `getDbClient()`. We can't import the type directly (Neon's tagged-template
 * signature is complex), so we infer it.
 */
type NeonSql = ReturnType<typeof getDbClient>;

/**
 * Single-row metadata table tracking the last e-Rapor sync from local DB to
 * Neon Postgres. Stored in `public.tabel_sync_metadata` and auto-created on
 * first use.
 */
export interface SyncMetadata {
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'error' | null;
  last_sync_duration_ms: number | null;
  last_tables_synced: number | null;
  last_records_processed: number | null;
  last_sync_by: string | null;
  last_sync_message: string | null;
}

export interface SyncMetadataInput {
  status: 'success' | 'failed' | 'error';
  durationMs: number;
  tablesSynced: number;
  recordsProcessed: number;
  user: string;
  message?: string;
}

const SYNC_METADATA_ID = 1;

/**
 * Ensure the metadata table exists. Idempotent — safe to call on every sync.
 */
export async function ensureSyncMetadataTable(neonDb: NeonSql): Promise<void> {
  try {
    // `@neondatabase/serverless`'s `neon()` does NOT expose `.unsafe()` (that's
    // a `postgres-js` API). Use the tagged-template form directly, which is
    // safe for parameterless DDL.
    await neonDb`
      CREATE TABLE IF NOT EXISTS public.tabel_sync_metadata (
        id INTEGER PRIMARY KEY,
        last_sync_at TIMESTAMPTZ,
        last_sync_status TEXT,
        last_sync_duration_ms INTEGER,
        last_tables_synced INTEGER,
        last_records_processed INTEGER,
        last_sync_by TEXT,
        last_sync_message TEXT
      )
    `;
  } catch (error) {
    // Table might already exist with slightly different shape; ignore.
    console.error('ensureSyncMetadataTable error:', error);
  }
}

/**
 * Upsert the single metadata row. Best-effort — caller should wrap in
 * try/catch so that metadata failures don't break the sync response.
 */
export async function recordSyncMetadata(
  neonDb: NeonSql,
  data: SyncMetadataInput
): Promise<void> {
  try {
    await neonDb`
      INSERT INTO public.tabel_sync_metadata (
        id,
        last_sync_at,
        last_sync_status,
        last_sync_duration_ms,
        last_tables_synced,
        last_records_processed,
        last_sync_by,
        last_sync_message
      ) VALUES (
        ${SYNC_METADATA_ID},
        CURRENT_TIMESTAMP,
        ${data.status},
        ${data.durationMs},
        ${data.tablesSynced},
        ${data.recordsProcessed},
        ${data.user},
        ${data.message ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        last_sync_at = EXCLUDED.last_sync_at,
        last_sync_status = EXCLUDED.last_sync_status,
        last_sync_duration_ms = EXCLUDED.last_sync_duration_ms,
        last_tables_synced = EXCLUDED.last_tables_synced,
        last_records_processed = EXCLUDED.last_records_processed,
        last_sync_by = EXCLUDED.last_sync_by,
        last_sync_message = EXCLUDED.last_sync_message
    `;
  } catch (error) {
    console.error('recordSyncMetadata error:', error);
  }
}

/**
 * Fetch the metadata row. Returns null if the table doesn't exist yet (very
 * first run before any sync) so callers can render a "never synced" state.
 */
export async function getSyncMetadata(neonDb: NeonSql): Promise<SyncMetadata | null> {
  try {
    const rows = await neonDb`
      SELECT
        last_sync_at,
        last_sync_status,
        last_sync_duration_ms,
        last_tables_synced,
        last_records_processed,
        last_sync_by,
        last_sync_message
      FROM public.tabel_sync_metadata
      WHERE id = ${SYNC_METADATA_ID}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0] as SyncMetadata;
  } catch (error) {
    // Table doesn't exist yet — return null so caller renders "never synced"
    console.error('getSyncMetadata error:', error);
    return null;
  }
}

/**
 * Compute "x minutes ago" / "x hours ago" style string from an ISO timestamp.
 * Returns null if input is falsy or invalid.
 */
export function formatRelativeTime(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;

  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'baru saja';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} detik yang lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari yang lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan yang lalu`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} tahun yang lalu`;
}

/**
 * Format an ISO timestamp as Indonesian-style date+time.
 * Example output: "18 Juni 2026, 14.32 WIB".
 */
export function formatSyncTimestamp(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;

  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hour}.${minute} WIB`;
}