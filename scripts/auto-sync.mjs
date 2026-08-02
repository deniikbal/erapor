// Auto-sync e-Rapor: tunggu server siap, lalu panggil /api/sync/check &
// /api/sync/stream tanpa perlu buka halaman & klik-klik.
//
// Jalankan manual:  node scripts/auto-sync.mjs
// Butuh Node 18+ (memakai fetch bawaan).
//
// Semua dikerjakan di Node (tidak bergantung pada curl/timeout/ping) agar
// jalan di Windows meski System32 tidak ada di PATH.

import { spawn } from 'node:child_process';

const BASE_URL = process.env.SYNC_BASE_URL || 'http://localhost:3000';
const ADMIN_USER = process.env.SYNC_USER || 'auto-sync';
// SYNC_START_DEV=0 -> jangan auto-jalankan "pnpm dev" (anggap server sudah ada)
const START_DEV = process.env.SYNC_START_DEV !== '0';

// Opsional: batasi tabel yang disync. Kosongkan ([]) = sync SEMUA tabel.
// Contoh: const ONLY_TABLES = ['tabel_siswa', 'tabel_cat_wali', 'tabel_kehadiran'];
const ONLY_TABLES = [];

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ADMIN_USER}`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isServerUp() {
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    return true; // respon apa pun (termasuk 404) = server hidup
  } catch {
    return false;
  }
}

function startDevServer() {
  // Buka "pnpm dev" di jendela CMD baru yang tetap hidup setelah script selesai.
  const comspec = process.env.ComSpec || 'cmd.exe';
  const child = spawn(comspec, ['/c', 'start "erapor-dev" cmd /k pnpm dev'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    windowsVerbatimArguments: true,
  });
  child.unref();
}

async function ensureServerReady() {
  if (await isServerUp()) {
    console.log('[auto-sync] Server sudah berjalan.');
    return;
  }

  if (START_DEV) {
    console.log('[auto-sync] Server belum jalan. Menjalankan "pnpm dev" di jendela baru...');
    startDevServer();
  } else {
    console.log('[auto-sync] Server belum jalan. Menunggu server dinyalakan manual...');
  }

  process.stdout.write('[auto-sync] Menunggu server siap');
  const maxWaitMs = 150000; // ~2.5 menit
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    await sleep(2000);
    if (await isServerUp()) {
      console.log('\n[auto-sync] Server siap.');
      return;
    }
    process.stdout.write('.');
  }
  throw new Error('Server tidak siap setelah ~2.5 menit. Cek jendela "erapor-dev".');
}

async function runSync() {
  // 1. Cek database lokal -> daftar schema & tabel
  console.log(`[auto-sync] Memeriksa database lokal via ${BASE_URL} ...`);
  const checkRes = await fetch(`${BASE_URL}/api/sync/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: ADMIN_USER, level: 'Admin' }),
  });

  if (!checkRes.ok) {
    throw new Error(`Check gagal (HTTP ${checkRes.status}): ${await checkRes.text()}`);
  }

  const check = await checkRes.json();
  const schemas = check.schemas || [];

  // 2. Pilih SEMUA tabel (atau hanya yang ada di ONLY_TABLES bila diisi)
  const selectedSchemas = schemas
    .map((s) => {
      let tableNames = (s.tables || []).map((t) => t.name);
      if (ONLY_TABLES.length > 0) {
        tableNames = tableNames.filter((name) => ONLY_TABLES.includes(name));
      }
      return { name: s.name, selectedTables: tableNames };
    })
    .filter((s) => s.selectedTables.length > 0);

  const totalTables = selectedSchemas.reduce((sum, s) => sum + s.selectedTables.length, 0);

  if (totalTables === 0) {
    console.log('[auto-sync] Tidak ada tabel untuk disync. Cek koneksi DB lokal / ONLY_TABLES.');
    return;
  }

  console.log(`[auto-sync] Akan sync ${totalTables} tabel dari ${selectedSchemas.length} schema. Mulai...\n`);

  // 3. Jalankan sync (streaming Server-Sent Events)
  const res = await fetch(`${BASE_URL}/api/sync/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: ADMIN_USER, level: 'Admin', selectedSchemas }),
  });

  if (!res.ok) {
    throw new Error(`Sync gagal (HTTP ${res.status}): ${await res.text()}`);
  }

  // 4. Baca stream SSE & tampilkan progres
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = 0;
  let hadError = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      let evt;
      try {
        evt = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      if (evt.type === 'progress') {
        process.stdout.write(`  -> ${evt.schema}.${evt.table} (${evt.mode}) ...\n`);
      } else if (evt.type === 'complete') {
        completed++;
        console.log(`  OK [${completed}/${totalTables}] ${evt.schema}.${evt.table} - ${evt.records} record`);
      } else if (evt.type === 'done') {
        const secs = Math.round((evt.durationMs || 0) / 1000);
        console.log(`\n[auto-sync] SELESAI  ${evt.tablesSynced} tabel, ${evt.totalRecords} record dalam ${secs}s.`);
      } else if (evt.type === 'error') {
        hadError = true;
        console.error(`  ERROR: ${evt.message}`);
      }
    }
  }

  if (hadError) process.exitCode = 1;
}

async function main() {
  await ensureServerReady();
  await runSync();
}

main().catch((err) => {
  console.error(`\n[auto-sync] GAGAL: ${err.message}`);
  process.exit(1);
});
