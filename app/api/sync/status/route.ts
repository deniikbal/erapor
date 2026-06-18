import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import {
  ensureSyncMetadataTable,
  getSyncMetadata,
  formatRelativeTime,
  formatSyncTimestamp,
  type SyncMetadata,
} from '@/lib/syncMetadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SyncStatusResponse {
  metadata: SyncMetadata | null;
  relativeTime: string | null;
  formattedTimestamp: string | null;
  hasEverSynced: boolean;
}

export async function GET() {
  try {
    const neonDb = getDbClient();

    // Make sure the table exists (cheap no-op after first sync)
    await ensureSyncMetadataTable(neonDb);

    const metadata = await getSyncMetadata(neonDb);

    const response: SyncStatusResponse = {
      metadata,
      relativeTime: formatRelativeTime(metadata?.last_sync_at),
      formattedTimestamp: formatSyncTimestamp(metadata?.last_sync_at),
      hasEverSynced: metadata?.last_sync_at != null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      {
        metadata: null,
        relativeTime: null,
        formattedTimestamp: null,
        hasEverSynced: false,
        error: 'Terjadi kesalahan saat mengambil status sinkronisasi',
      },
      { status: 500 }
    );
  }
}