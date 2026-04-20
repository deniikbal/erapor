'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Database, CheckSquare, Square, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TableInfo = {
  name: string;
  columnCount: number;
  rowCount: number;
};

type SchemaInfo = {
  name: string;
  tables: TableInfo[];
  tableCount: number;
  totalRows: number;
};

export default function SyncPage() {
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<Map<string, Set<string>>>(new Map());
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncTable, setCurrentSyncTable] = useState('');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [showConfirmSync, setShowConfirmSync] = useState(false);

  const selectiveSyncTables = [
    'tabel_siswa', 'tabel_siswa_pelengkap',
    'tabel_kehadiran', 'tabel_cat_wali',
    'user_login'
  ];

  const handleCheckDatabase = async () => {
    setChecking(true);
    setSyncStatus('Memeriksa database lokal...');

    try {
      // Get current user from localStorage
      const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;

      if (!currentUserStr) {
        throw new Error('User tidak ditemukan. Silakan login kembali.');
      }

      const user = JSON.parse(currentUserStr);
      if (user.level !== 'Admin') {
        throw new Error('Hanya admin yang dapat memeriksa database.');
      }

      const response = await fetch('/api/sync/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`,
        },
        body: JSON.stringify({ userId: user.id, level: user.level }),
      });

      let data;
      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      try {
        data = await response.json();
      } catch (parseError) {
        // Use cloned response to get text since original was consumed
        let responseText = 'Could not read response text';
        try {
          responseText = await clonedResponse.text();
        } catch (textError) {
          console.error('Error reading response text:', textError);
        }
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error(`Response is not valid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('Check API response:', data);
        throw new Error(data.error || `Check failed with status ${response.status}`);
      }

      setSchemas(data.schemas || []);
      setSyncStatus(`Ditemukan ${data.totalSchemas} schema dengan total ${data.schemas.reduce((sum: number, s: SchemaInfo) => sum + s.totalRows, 0)} record`);
      toast.success(`Berhasil memuat ${data.totalSchemas} schema dari database lokal`);
    } catch (error) {
      console.error('Check error:', error);
      setSyncStatus(`Error: ${(error as Error).message}`);
      toast.error(`Gagal memeriksa database: ${(error as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  const handleSync = async () => {
    if (selectedSchemas.size === 0) {
      toast.error('Pilih minimal satu tabel untuk disinkronkan');
      return;
    }

    setSyncing(true);
    setSyncStatus('Memulai proses sinkronisasi...');
    setSyncProgress(0);
    setCurrentSyncTable('');
    setSyncLogs([]);

    try {
      // Get current user from localStorage
      const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;

      if (!currentUserStr) {
        throw new Error('User tidak ditemukan. Silakan login kembali.');
      }

      const user = JSON.parse(currentUserStr);
      if (user.level !== 'Admin') {
        throw new Error('Hanya admin yang dapat melakukan sinkronisasi.');
      }

      // Build selected schemas data
      const selectedSchemasData = Array.from(selectedSchemas.entries()).map(([schemaName, tables]) => ({
        name: schemaName,
        selectedTables: Array.from(tables)
      }));

      const totalTables = Array.from(selectedSchemas.values()).reduce((sum, tables) => sum + tables.size, 0);

      const response = await fetch('/api/sync/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          userId: user.id,
          level: user.level,
          selectedSchemas: selectedSchemasData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Sync failed with status ${response.status}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream reader not available');
      }

      let buffer = '';
      let completedTables = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setCurrentSyncTable(`${data.schema}.${data.table}`);
              setSyncStatus(`Menyinkronkan ${data.schema}.${data.table}...`);
              const newLog = `✓ ${data.schema}.${data.table} (${data.records} record)`;
              setSyncLogs(prev => [...prev, newLog]);
            } else if (data.type === 'complete') {
              completedTables++;
              const progress = Math.round((completedTables / totalTables) * 100);
              setSyncProgress(progress);
            } else if (data.type === 'done') {
              setLastSync(new Date().toISOString());
              setSyncStatus(`Sync berhasil! ${data.tablesSynced} tabel dan ${data.totalRecords} record telah disinkronkan`);
              setSyncProgress(100);
              toast.success(`Sync berhasil: ${data.tablesSynced} tabel dan ${data.totalRecords} record`);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus(`Error: ${(error as Error).message}`);
      toast.error(`Gagal sinkronisasi: ${(error as Error).message}`);
      setSyncProgress(0);
    } finally {
      setSyncing(false);
    }
  };

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const toggleSchemaSelection = (schemaName: string, tables: TableInfo[]) => {
    const newSelected = new Map(selectedSchemas);

    if (newSelected.has(schemaName)) {
      const currentTables = newSelected.get(schemaName)!;
      if (currentTables.size === tables.length) {
        // All selected, deselect all
        newSelected.delete(schemaName);
      } else {
        // Some selected, select all
        newSelected.set(schemaName, new Set(tables.map(t => t.name)));
      }
    } else {
      // None selected, select all
      newSelected.set(schemaName, new Set(tables.map(t => t.name)));
    }

    setSelectedSchemas(newSelected);
  };

  const toggleTableSelection = (schemaName: string, tableName: string) => {
    const newSelected = new Map(selectedSchemas);

    if (!newSelected.has(schemaName)) {
      newSelected.set(schemaName, new Set([tableName]));
    } else {
      const schemaTables = newSelected.get(schemaName)!;
      if (schemaTables.has(tableName)) {
        schemaTables.delete(tableName);
        if (schemaTables.size === 0) {
          newSelected.delete(schemaName);
        }
      } else {
        schemaTables.add(tableName);
      }
    }

    setSelectedSchemas(newSelected);
  };

  const isSchemaFullySelected = (schemaName: string, tables: TableInfo[]) => {
    return selectedSchemas.has(schemaName) && selectedSchemas.get(schemaName)!.size === tables.length;
  };

  const isSchemaPartiallySelected = (schemaName: string) => {
    return selectedSchemas.has(schemaName) && selectedSchemas.get(schemaName)!.size > 0;
  };

  const isTableSelected = (schemaName: string, tableName: string) => {
    return selectedSchemas.has(schemaName) && selectedSchemas.get(schemaName)!.has(tableName);
  };

  const totalSelectedTables = Array.from(selectedSchemas.values()).reduce((sum, tables) => sum + tables.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Sinkronisasi Data
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Sinkronkan data dari database e-Rapor lokal ke database pusat aplikasi.
        </p>
      </div>

      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
          <CardTitle className="text-sm font-bold text-[#1e3a8a]">Kontrol Sinkronisasi</CardTitle>
          <p className="text-[10px] text-slate-500 italic">
            Pilih schema dan tabel yang ingin disinkronkan. Data siswa lokal yang telah diubah tidak akan ditimpa.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCheckDatabase}
                size="sm"
                variant="outline"
                disabled={checking || syncing}
                className="h-8 text-[11px] font-bold border-blue-100 text-[#1e3a8a] uppercase tracking-tight"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Memeriksa...
                  </>
                ) : (
                  <>
                    <Database className="h-3.5 w-3.5 mr-1.5" />
                    Cek Database
                  </>
                )}
              </Button>

              {schemas.length > 0 && (
                <Button
                  onClick={() => setShowConfirmSync(true)}
                  size="sm"
                  variant="default"
                  className="h-8 text-[11px] font-bold bg-[#1e3a8a] hover:bg-black text-white uppercase tracking-tight"
                  disabled={syncing || totalSelectedTables === 0}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Proses Sync...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      SINKRONKAN ({totalSelectedTables} TABEL)
                    </>
                  )}
                </Button>
              )}
            </div>

            {syncStatus && (
              <Alert className="py-2 px-3 bg-blue-50/50 border-blue-100 rounded-sm">
                <AlertDescription className="text-[11px] font-medium text-[#1e3a8a] flex items-center gap-2">
                  <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                  {syncStatus}
                </AlertDescription>
              </Alert>
            )}

            {lastSync && !syncing && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                TERAKHIR SYNC: {new Date(lastSync).toLocaleString('id-ID')}
              </div>
            )}

            {/* Progress Bar */}
            {syncing && (
              <div className="space-y-2 py-2 border-t border-b border-slate-50 my-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-slate-500">Progress Sinkronisasi</span>
                    <span className="text-[#1e3a8a]">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${syncProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                    </div>
                  </div>
                  {currentSyncTable && (
                    <p className="text-[10px] text-[#1e3a8a] font-black italic animate-pulse">
                      ⚡ SEDANG MEMPROSES: {currentSyncTable}
                    </p>
                  )}
                </div>

                {/* Sync Logs */}
                {syncLogs.length > 0 && (
                  <div className="border border-slate-100 rounded-sm p-3 bg-slate-50/50 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                    <h4 className="text-[10px] font-black mb-2 text-slate-400 uppercase tracking-widest">Logs:</h4>
                    <div className="space-y-0.5 font-mono text-[9px]">
                      {syncLogs.map((log, idx) => (
                        <div key={idx} className="text-blue-700 font-bold border-l-2 border-blue-200 pl-2 py-0.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schema and Table Selection */}
            {schemas.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider pl-1 border-l-2 border-[#1e3a8a]">Pilih Schema dan Tabel:</h3>
                <div className="border border-slate-100 rounded-sm divide-y overflow-hidden shadow-sm bg-white">
                  {schemas.map((schema) => (
                    <div key={schema.name} className="bg-white">
                      <div className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={isSchemaFullySelected(schema.name, schema.tables)}
                          onCheckedChange={() => toggleSchemaSelection(schema.name, schema.tables)}
                          className={isSchemaPartiallySelected(schema.name) && !isSchemaFullySelected(schema.name, schema.tables) ? 'data-[state=unchecked]:bg-slate-200 h-4 w-4' : 'h-4 w-4 border-[#1e3a8a] data-[state=checked]:bg-[#1e3a8a]'}
                        />
                        <button
                          onClick={() => toggleSchema(schema.name)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                           <div className="flex-1">
                            <div className="font-black text-xs text-[#1e3a8a] uppercase tracking-tight">{schema.name}</div>
                            <div className="text-[10px] font-medium text-slate-400 italic">
                              {schema.tableCount} tabel • {schema.totalRows.toLocaleString()} record
                            </div>
                          </div>
                          {expandedSchemas.has(schema.name) ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {expandedSchemas.has(schema.name) && (
                        <div className="bg-slate-50/50 py-1 px-3 space-y-1 border-t border-slate-50">
                          {schema.tables.map((table) => (
                            <div key={table.name} className="flex items-center gap-3 p-2 hover:bg-white transition-colors rounded-sm border border-transparent hover:border-blue-100 group">
                              <Checkbox
                                checked={isTableSelected(schema.name, table.name)}
                                onCheckedChange={() => toggleTableSelection(schema.name, table.name)}
                                className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-[#1e3a8a]"
                              />
                              <div className="flex-1">
                                <div className="font-mono text-[11px] font-bold text-slate-600 group-hover:text-[#1e3a8a] flex items-center gap-2">
                                  {table.name}
                                  {selectiveSyncTables.includes(table.name) ? (
                                    <Badge variant="outline" className="h-4 text-[7px] px-1 py-0 border-green-200 bg-green-50 text-green-700 font-black uppercase">Selective</Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-4 text-[7px] px-1 py-0 border-amber-200 bg-amber-50 text-amber-700 font-black uppercase">Forced</Badge>
                                  )}
                                </div>
                                <div className="text-[9px] font-medium text-slate-400">
                                  {table.columnCount} kolom • {table.rowCount.toLocaleString()} record
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 p-3 rounded bg-blue-50 border border-blue-100 shadow-sm transition-all hover:shadow-md">
              <h3 className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" /> Info Mekanisme Sinkronisasi:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="h-4 text-[7px] px-1 py-0 border-green-200 bg-green-50 text-green-700 font-black uppercase">Selective Sync</Badge>
                    <span className="text-[10px] font-bold text-slate-600">Aman (Tidak Menimpa Editan)</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Data yang sudah pernah Anda edit di web atau data rahasia seperti Password tidak akan ditimpa oleh data dari database lokal.
                    <br/><span className="font-bold underline text-green-700">Berlaku untuk: data siswa, kehadiran, catatan wali, & login.</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="h-4 text-[7px] px-1 py-0 border-amber-200 bg-amber-50 text-amber-700 font-black uppercase">Forced Sync</Badge>
                    <span className="text-[10px] font-bold text-slate-600">Timpa Total (Reset & Update)</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Data lama di cloud akan dihapus dahulu, kemudian diisi ulang sepenuhnya dari database lokal. Pastikan data di e-Rapor lokal sudah diperbarui.
                    <br/><span className="font-bold underline text-amber-700">Berlaku untuk: referensi kelas, mapel, nilai, & data umum lainnya.</span>
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog open={showConfirmSync} onOpenChange={setShowConfirmSync}>
              <AlertDialogContent className="rounded-sm border-blue-100 max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-black text-[#1e3a8a] uppercase tracking-tight flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Konfirmasi Sinkronisasi
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[11px] text-slate-500 py-2 leading-relaxed">
                    Anda akan menyinkronkan <span className="font-bold text-[#1e3a8a]">{totalSelectedTables} tabel</span> dari database lokal ke cloud.
                    <br/><br/>
                    Untuk keamanan, sistem akan melakukan <span className="font-black italic">backup otomatis</span> pada tabel yang di-forced sync sebelum data diperbarui.
                    <br/><br/>
                    Lanjutkan proses?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
                  <AlertDialogCancel className="h-8 text-[10px] font-bold uppercase tracking-tight rounded-sm flex-1 sm:flex-none">Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      setShowConfirmSync(false);
                      handleSync();
                    }}
                    className="h-8 text-[10px] font-bold uppercase tracking-tight rounded-sm bg-[#1e3a8a] hover:bg-black flex-1 sm:flex-none"
                  >
                    Ya, Jalankan Sync
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}