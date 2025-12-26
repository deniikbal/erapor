'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Database, CheckSquare, Square, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sinkronisasi Data</h1>
        <p className="text-muted-foreground">
          Sinkronkan data dari database e-Rapor lokal ke database aplikasi ini
        </p>
      </div>

      <Card className="rounded-sm border-l-4 border-l-emerald-600">
        <CardHeader>
          <CardTitle>Sinkronisasi Database</CardTitle>
          <CardDescription>
            Pilih schema dan tabel yang ingin disinkronkan dari database e-Rapor lokal.
            Data siswa yang sudah diedit di aplikasi ini tidak akan ditimpa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCheckDatabase}
                size="sm"
                variant="outline"
                disabled={checking || syncing}
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memeriksa...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Cek Database
                  </>
                )}
              </Button>

              {schemas.length > 0 && (
                <Button
                  onClick={handleSync}
                  size="sm"
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={syncing || totalSelectedTables === 0}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sinkronkan Data ({totalSelectedTables} tabel)
                    </>
                  )}
                </Button>
              )}
            </div>

            {syncStatus && (
              <Alert>
                <AlertDescription>
                  {syncStatus}
                </AlertDescription>
              </Alert>
            )}

            {lastSync && !syncing && (
              <div className="text-sm text-muted-foreground">
                Terakhir disinkronkan: {new Date(lastSync).toLocaleString('id-ID')}
              </div>
            )}

            {/* Progress Bar */}
            {syncing && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progress Sinkronisasi</span>
                    <span className="text-muted-foreground">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${syncProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                    </div>
                  </div>
                  {currentSyncTable && (
                    <p className="text-sm text-blue-600 font-medium animate-pulse">
                      📊 Sedang memproses: {currentSyncTable}
                    </p>
                  )}
                </div>

                {/* Sync Logs */}
                {syncLogs.length > 0 && (
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-2 text-gray-700">Log Sinkronisasi:</h4>
                    <div className="space-y-1 font-mono text-xs">
                      {syncLogs.map((log, idx) => (
                        <div key={idx} className="text-green-700 animate-fadeIn">
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
              <div className="mt-6 space-y-4">
                <h3 className="font-medium">Pilih Schema dan Tabel:</h3>
                <div className="border rounded-lg divide-y">
                  {schemas.map((schema) => (
                    <div key={schema.name} className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSchemaFullySelected(schema.name, schema.tables)}
                          onCheckedChange={() => toggleSchemaSelection(schema.name, schema.tables)}
                          className={isSchemaPartiallySelected(schema.name) && !isSchemaFullySelected(schema.name, schema.tables) ? 'data-[state=unchecked]:bg-gray-300' : ''}
                        />
                        <button
                          onClick={() => toggleSchema(schema.name)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-gray-50 p-2 rounded -m-2"
                        >
                          {expandedSchemas.has(schema.name) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Database className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium">{schema.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {schema.tableCount} tabel, {schema.totalRows.toLocaleString()} record
                            </div>
                          </div>
                        </button>
                      </div>

                      {expandedSchemas.has(schema.name) && (
                        <div className="ml-11 mt-3 space-y-2 border-l-2 border-gray-200 pl-4">
                          {schema.tables.map((table) => (
                            <div key={table.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                checked={isTableSelected(schema.name, table.name)}
                                onCheckedChange={() => toggleTableSelection(schema.name, table.name)}
                              />
                              <div className="flex-1">
                                <div className="font-mono text-sm">{table.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {table.columnCount} kolom, {table.rowCount.toLocaleString()} record
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

            <div className="mt-6 space-y-4">
              <h3 className="font-medium">Catatan Penting:</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
                <li>Tabel selain <code className="bg-muted px-1 rounded">tabel_siswa</code> dan <code className="bg-muted px-1 rounded">tabel_siswa_pelengkap</code> akan disinkronkan secara paksa (data lama akan dihapus)</li>
                <li>Data siswa yang sudah diedit di aplikasi ini tidak akan ditimpa saat sinkronisasi</li>
                <li>Proses sinkronisasi hanya satu arah: database lokal → database aplikasi</li>
                <li>Pastikan database lokal e-Rapor aktif sebelum menjalankan sinkronisasi</li>
                <li>Cek database terlebih dahulu untuk melihat schema dan tabel yang tersedia</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}