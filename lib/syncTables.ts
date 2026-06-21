/**
 * Single source of truth for sync-time table classification.
 *
 * SELECTIVE = upsert per-record, preserves rows marked is_locally_edited
 * FORCED   = truncate + reinsert, always overwrites
 *
 * Keep this list in sync between UI badges (sync page) and backend behavior
 * (sync stream). The check endpoint exposes it so the UI never lies.
 */
export const SELECTIVE_SYNC_TABLES: readonly string[] = [
  // user_login: preserve password/salt if the row was edited in the cloud
  'user_login',
  // tabel_siswa*: preserve local edits made in the cloud (e.g. phone, address)
  'tabel_siswa',
  'tabel_siswa_pelengkap',
  // kehadiran + catatan wali: wali kelas may edit these in the web app
  'tabel_kehadiran',
  'tabel_cat_wali',
] as const;

export function isSelectiveSyncTable(tableName: string): boolean {
  return SELECTIVE_SYNC_TABLES.includes(tableName);
}