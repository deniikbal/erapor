import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

/**
 * Detect peminatan from class name (replikasi dari mapel-kelompok/route.ts)
 */
function detectPeminatan(nm_kelas: string): string | null {
    const upper = nm_kelas.toUpperCase();

    if (upper.includes('GBIM')) return 'GBIM';
    if (upper.includes('SBIM')) return 'SBIM';
    if (upper.includes('EBIM')) return 'EBIM';

    if (upper.includes('IPA') || upper.includes('MIPA')) return 'MIPA';
    if (upper.includes('IPS')) return 'IPS';

    const mipaMapels = ['MATEMATIKA', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['EKONOMI', 'GEOGRAFI', 'SEJARAH', 'SOSIOLOGI'];

    for (const mapel of mipaMapels) {
        if (upper.includes(mapel)) return 'MIPA';
    }

    for (const mapel of ipsMapels) {
        if (upper.includes(mapel)) return 'IPS';
    }

    return null;
}

/**
 * Format nama kelompok berdasarkan klp_id (replikasi dari mapel-kelompok/route.ts)
 */
function formatNamaKelompok(klpId: number, namaKelompok?: string | null): string {
    if (klpId === 1) return 'Mata Pelajaran Wajib';
    if (klpId === 2) return 'Mata Pelajaran Pilihan';
    if (klpId === 6) return 'Muatan Lokal';
    return namaKelompok || 'Lainnya';
}

interface BatchStudentInput {
    peserta_didik_id: string;
    tingkat: string;
}

/**
 * BATCH ENDPOINT untuk optimasi generate PDF massal.
 *
 * Menggabungkan 4 endpoint per-siswa menjadi 1 request untuk seluruh kelas:
 *   - /api/nilai/mapel-kelompok
 *   - /api/kehadiran
 *   - /api/catatan-wali
 *   - /api/kenaikan
 *
 * Response shape per-siswa IDENTIK dengan endpoint aslinya, agar
 * PDF renderer tidak perlu diubah:
 *   - mapel: { kelompok[], kokurikuler, ekstrakurikuler[] }
 *   - kehadiran: { peserta_didik_id, sakit, izin, alpha }
 *   - catatan_wali: { peserta_didik_id, deskripsi }
 *   - kenaikan: { kenaikan, tingkat }
 *
 * Query count: ~9 query untuk seluruh kelas (vs 7 query x N siswa sebelumnya).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);

        if (!body || !Array.isArray(body.students) || body.students.length === 0) {
            return NextResponse.json(
                { error: 'Body harus berisi array "students" (peserta_didik_id + tingkat)' },
                { status: 400, headers: { 'Cache-Control': 'no-store' } }
            );
        }

        const students: BatchStudentInput[] = body.students.map((s: any) => ({
            peserta_didik_id: String(s.peserta_didik_id),
            tingkat: String(s.tingkat || '10'),
        }));

        // De-dup student ids (safety)
        const studentIds = Array.from(new Set(students.map(s => s.peserta_didik_id)));
        const semesterIdParam: string | undefined = body.semester_id ? String(body.semester_id) : undefined;

        if (studentIds.length === 0) {
            return NextResponse.json(
                { success: true, semester_id: semesterIdParam || null, students: {}, errors: {} },
                { status: 200, headers: { 'Cache-Control': 'no-store' } }
            );
        }

        const sql = getDbClient();

        // 1. Ambil semester aktif (sekali untuk seluruh batch)
        let semesterId = semesterIdParam;
        if (!semesterId) {
            const activeSemester = await sql`
                SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
            `;
            semesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : null;
        }

        // Response map - diisi default kosong dulu, agar siswa tanpa data tetap ada entry-nya
        const resultMap: Record<string, any> = {};
        const errorsMap: Record<string, string> = {};
        for (const id of studentIds) {
            resultMap[id] = {
                mapel: { kelompok: [], kokurikuler: null, ekstrakurikuler: [] },
                kehadiran: { peserta_didik_id: id, sakit: 0, izin: 0, alpha: 0 },
                catatan_wali: { peserta_didik_id: id, deskripsi: '-' },
                kenaikan: { kenaikan: null, tingkat: null },
            };
        }

        if (!semesterId) {
            // Tidak ada semester aktif — kembalikan semua default (sama seperti endpoint lama)
            return NextResponse.json(
                { success: true, semester_id: null, students: resultMap, errors: errorsMap },
                { status: 200, headers: { 'Cache-Control': 'no-store' } }
            );
        }

        // 2. Ambil info siswa + kelas (batch) untuk deteksi peminatan & validasi
        const siswaKelasBatch = await retryQuery(async () => sql`
            SELECT
                s.peserta_didik_id,
                s.nm_siswa,
                k.nm_kelas,
                k.tingkat_pendidikan_id
            FROM tabel_siswa s
            LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            WHERE s.peserta_didik_id = ANY(${studentIds})
              AND k.semester_id = ${semesterId}
        `);

        // Map: peserta_didik_id -> { nm_kelas, tingkat }
        const siswaInfoMap = new Map<string, { nm_siswa: string; nm_kelas: string; tingkat: string }>();
        for (const row of siswaKelasBatch) {
            siswaInfoMap.set(row.peserta_didik_id, {
                nm_siswa: row.nm_siswa,
                nm_kelas: row.nm_kelas || '',
                tingkat: row.tingkat_pendidikan_id ? String(row.tingkat_pendidikan_id) : '10',
            });
        }

        // Daftar tingkat unik (biasanya 1 per kelas) — untuk ambil mapel sekali
        const uniqueTingkats = Array.from(new Set(
            students.map(s => s.tingkat)
        ));

        // 3. Ambil mapel per tingkat (batch per tingkat, lalu merge ke cache per tingkat)
        const mapelByTingkat = new Map<string, any[]>();
        await Promise.all(uniqueTingkats.map(async (tingkat) => {
            try {
                const rows = await retryQuery(async () => sql`
                    SELECT
                        m.id_map_mapel,
                        m.mata_pelajaran_id,
                        m.nm_lokal,
                        m.area_kompetensi,
                        m.klp_mpl,
                        m.urut_rapor,
                        k.nama as nama_kelompok,
                        k.jns_klp
                    FROM tabel_map_mapelk2013 m
                    LEFT JOIN ref_klp_mapel k ON m.klp_mpl = k.klp_id AND k.jenjang = 'SMA'
                    WHERE m.tingkat_pendidikan_id = ${tingkat}
                    ORDER BY m.klp_mpl, m.urut_rapor
                `);
                mapelByTingkat.set(tingkat, rows);
            } catch (err) {
                console.error(`[batch] Gagal ambil mapel untuk tingkat ${tingkat}:`, err);
                mapelByTingkat.set(tingkat, []);
            }
        }));

        // 4. Batch query nilai akhir (semua siswa sekaligus)
        const nilaiAkhirBatch = await retryQuery(async () => sql`
            SELECT DISTINCT ON (ak.peserta_didik_id, n.mata_pelajaran_id)
                ak.peserta_didik_id,
                n.mata_pelajaran_id,
                n.nilai_peng,
                n.nilai_ket,
                n.predikat_peng,
                n.predikat_ket
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            WHERE ak.peserta_didik_id = ANY(${studentIds})
              AND n.semester_id = ${semesterId}
            ORDER BY
                ak.peserta_didik_id,
                n.mata_pelajaran_id,
                n.nilai_peng DESC NULLS LAST
        `);

        // Map: peserta_didik_id -> Map(mata_pelajaran_id -> nilai)
        const nilaiMapByStudent = new Map<string, Map<string, any>>();
        for (const n of nilaiAkhirBatch) {
            if (!nilaiMapByStudent.has(n.peserta_didik_id)) {
                nilaiMapByStudent.set(n.peserta_didik_id, new Map());
            }
            nilaiMapByStudent.get(n.peserta_didik_id)!.set(n.mata_pelajaran_id, n);
        }

        // 5. Batch query deskripsi / capaian kompetensi
        const deskripsiBatch = await retryQuery(async () => sql`
            SELECT
                d.peserta_didik_id,
                d.mata_pelajaran_id,
                d.deskripsi_peng_m,
                d.deskripsi_ket_m
            FROM tabel_deskripsi d
            WHERE d.peserta_didik_id = ANY(${studentIds})
              AND d.semester_id = ${semesterId}
        `);

        const deskripsiMapByStudent = new Map<string, Map<string, string>>();
        for (const d of deskripsiBatch) {
            if (!deskripsiMapByStudent.has(d.peserta_didik_id)) {
                deskripsiMapByStudent.set(d.peserta_didik_id, new Map());
            }
            const capaianParts: string[] = [];
            if (d.deskripsi_peng_m) capaianParts.push(d.deskripsi_peng_m);
            if (d.deskripsi_ket_m) capaianParts.push(d.deskripsi_ket_m);
            deskripsiMapByStudent.get(d.peserta_didik_id)!.set(d.mata_pelajaran_id, capaianParts.join('\n'));
        }

        // 6. Batch query kokurikuler deskripsi
        const kokurikulerBatch = await retryQuery(async () => sql`
            SELECT peserta_didik_id, deskripsi
            FROM tabel_deskripsikurikuler
            WHERE peserta_didik_id = ANY(${studentIds})
              AND semester_id = ${semesterId}
        `);
        const kokurikulerMap = new Map<string, string>();
        for (const k of kokurikulerBatch) {
            // Ambil yang pertama per siswa (konsisten dengan LIMIT 1 di endpoint lama)
            if (!kokurikulerMap.has(k.peserta_didik_id)) {
                kokurikulerMap.set(k.peserta_didik_id, k.deskripsi);
            }
        }

        // 7. Batch query ekstrakurikuler
        const ekstraBatch = await retryQuery(async () => sql`
            SELECT
                ne.peserta_didik_id,
                re.nm_ekskul as nama_ekstra,
                ne.nilai_ekstra,
                ne.deskripsi
            FROM tabel_nilai_ekstra ne
            LEFT JOIN refekstra_kurikuler re ON ne.id_ekskul_baru = re.id_ekskul
            WHERE ne.peserta_didik_id = ANY(${studentIds})
              AND ne.semester_id = ${semesterId}
              AND ne.deskripsi IS NOT NULL
            ORDER BY ne.peserta_didik_id, re.nm_ekskul
        `);
        const ekstraMapByStudent = new Map<string, any[]>();
        for (const e of ekstraBatch) {
            if (!ekstraMapByStudent.has(e.peserta_didik_id)) {
                ekstraMapByStudent.set(e.peserta_didik_id, []);
            }
            ekstraMapByStudent.get(e.peserta_didik_id)!.push({
                nama_ekstra: e.nama_ekstra || 'N/A',
                nilai_ekstra: e.nilai_ekstra || '-',
                deskripsi: e.deskripsi || '-',
            });
        }

        // 8. Batch query kehadiran
        const kehadiranBatch = await retryQuery(async () => sql`
            SELECT *
            FROM tabel_kehadiran
            WHERE peserta_didik_id = ANY(${studentIds})
              AND semester_id = ${semesterId}
        `);
        const kehadiranMap = new Map<string, any>();
        for (const row of kehadiranBatch) {
            // Ambil yang pertama per siswa (konsisten dengan LIMIT 1)
            if (!kehadiranMap.has(row.peserta_didik_id)) {
                const alpha = row.alpha ?? row.tanpa_keterangan ?? row.alpa ?? row.tk ?? 0;
                kehadiranMap.set(row.peserta_didik_id, {
                    peserta_didik_id: row.peserta_didik_id,
                    sakit: row.sakit ?? 0,
                    izin: row.izin ?? 0,
                    alpha,
                });
            }
        }

        // 9. Batch query catatan wali
        const catatanBatch = await retryQuery(async () => sql`
            SELECT *
            FROM tabel_cat_wali
            WHERE peserta_didik_id = ANY(${studentIds})
              AND semester_id = ${semesterId}
        `);
        const catatanMap = new Map<string, string>();
        for (const c of catatanBatch) {
            if (!catatanMap.has(c.peserta_didik_id)) {
                catatanMap.set(c.peserta_didik_id, c.deskripsi || '-');
            }
        }

        // 10. Batch query kenaikan
        const kenaikanBatch = await retryQuery(async () => sql`
            SELECT peserta_didik_id, kenaikan, tingkat
            FROM tabel_kenaikan
            WHERE peserta_didik_id = ANY(${studentIds})
              AND semester_id = ${semesterId}
        `);
        const kenaikanMap = new Map<string, any>();
        for (const k of kenaikanBatch) {
            if (!kenaikanMap.has(k.peserta_didik_id)) {
                kenaikanMap.set(k.peserta_didik_id, { kenaikan: k.kenaikan, tingkat: k.tingkat });
            }
        }

        // 11. Assemble data per siswa (replikasi filter logic dari mapel-kelompok/route.ts)
        for (const student of students) {
            const { peserta_didik_id, tingkat } = student;

            try {
                const mapelRows = mapelByTingkat.get(tingkat) || [];
                const nilaiMap = nilaiMapByStudent.get(peserta_didik_id) || new Map();
                const deskripsiMap = deskripsiMapByStudent.get(peserta_didik_id) || new Map();

                // Group by kelompok (logika identik dengan mapel-kelompok/route.ts)
                const kelompokMap = new Map<number, any>();
                for (const mapel of mapelRows) {
                    const klpId = Number(mapel.klp_mpl);
                    const kelompokName = formatNamaKelompok(klpId, mapel.nama_kelompok);

                    if (!kelompokMap.has(klpId)) {
                        kelompokMap.set(klpId, {
                            klp_id: klpId,
                            nama_kelompok: kelompokName,
                            mapels: [],
                        });
                    }

                    kelompokMap.get(klpId)!.mapels.push({
                        id_map_mapel: mapel.id_map_mapel,
                        mata_pelajaran_id: mapel.mata_pelajaran_id,
                        nm_lokal: mapel.nm_lokal,
                        area_kompetensi: mapel.area_kompetensi,
                        klp_mpl: mapel.klp_mpl,
                        urut_rapor: mapel.urut_rapor,
                        nilai_akhir: null,
                        capaian_kompetensi: null,
                    });
                }

                const kelompokData = Array.from(kelompokMap.values());

                // Merge nilai + deskripsi ke mapel (identik dengan endpoint lama)
                kelompokData.forEach(kelompok => {
                    kelompok.mapels.forEach((mapel: any) => {
                        const nilai = nilaiMap.get(mapel.mata_pelajaran_id);
                        const capaian = deskripsiMap.get(mapel.mata_pelajaran_id);

                        if (nilai) {
                            mapel.nilai_akhir = parseFloat(nilai.nilai_peng) || 0;
                        }
                        if (capaian) {
                            mapel.capaian_kompetensi = capaian;
                        }
                    });

                    // Filter mapel tanpa nilai (sama persis: null atau 0)
                    kelompok.mapels = kelompok.mapels.filter(
                        (mapel: any) => mapel.nilai_akhir !== null && mapel.nilai_akhir !== 0
                    );
                });

                // Filter kelompok kosong
                const finalKelompokData = kelompokData.filter(k => k.mapels.length > 0);

                const siswaInfo = siswaInfoMap.get(peserta_didik_id);
                const peminatan = siswaInfo
                    ? (detectPeminatan(siswaInfo.nm_kelas) || 'Belum ada peminatan (Kelas X)')
                    : 'Belum ada peminatan (Kelas X)';

                resultMap[peserta_didik_id] = {
                    mapel: {
                        // Field tambahan untuk konsistensi dengan response lama (tidak dipakai renderer, tapi ada)
                        success: true,
                        peserta_didik_id,
                        nama_siswa: siswaInfo?.nm_siswa || '',
                        nm_kelas: siswaInfo?.nm_kelas || '',
                        peminatan,
                        tingkat,
                        total_kelompok: finalKelompokData.length,
                        total_mapel: finalKelompokData.reduce((sum, k) => sum + k.mapels.length, 0),
                        // Field yang DIPAKAI renderer PDF:
                        kelompok: finalKelompokData,
                        kokurikuler: kokurikulerMap.get(peserta_didik_id) ?? null,
                        ekstrakurikuler: ekstraMapByStudent.get(peserta_didik_id) || [],
                    },
                    kehadiran: kehadiranMap.get(peserta_didik_id) || {
                        peserta_didik_id,
                        sakit: 0,
                        izin: 0,
                        alpha: 0,
                    },
                    catatan_wali: {
                        peserta_didik_id,
                        deskripsi: catatanMap.get(peserta_didik_id) ?? '-',
                    },
                    kenaikan: kenaikanMap.get(peserta_didik_id) || { kenaikan: null, tingkat: null },
                };
            } catch (err) {
                // Error isolation: siswa ini gagal, lanjut siswa lain
                console.error(`[batch] Gagal proses siswa ${peserta_didik_id}:`, err);
                errorsMap[peserta_didik_id] = err instanceof Error ? err.message : String(err);
                // resultMap[peserta_didik_id] tetap pakai default kosong yang sudah di-set di awal
            }
        }

        return NextResponse.json(
            { success: true, semester_id: semesterId, students: resultMap, errors: errorsMap },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error) {
        console.error('[batch] Fatal error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch batch nilai data',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
