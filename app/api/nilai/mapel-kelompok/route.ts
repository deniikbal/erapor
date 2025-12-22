import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * Detect peminatan from class name
 */
function detectPeminatan(nm_kelas: string): string | null {
    const upper = nm_kelas.toUpperCase();

    // Check Class XII groupings first (GBIM/SBIM/EBIM)
    if (upper.includes('GBIM')) return 'GBIM';
    if (upper.includes('SBIM')) return 'SBIM';
    if (upper.includes('EBIM')) return 'EBIM';

    // Check Class XI traditional peminatan (kurikulum lama)
    if (upper.includes('IPA') || upper.includes('MIPA')) return 'MIPA';
    if (upper.includes('IPS')) return 'IPS';

    // Check kurikulum merdeka pattern (by mapel name in class)
    const mipaMapels = ['MATEMATIKA', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['EKONOMI', 'GEOGRAFI', 'SEJARAH', 'SOSIOLOGI'];

    for (const mapel of mipaMapels) {
        if (upper.includes(mapel)) return 'MIPA';
    }

    for (const mapel of ipsMapels) {
        if (upper.includes(mapel)) return 'IPS';
    }

    return null; // Kelas X or unknown
}

/**
 * Filter mapel pilihan based on peminatan
 */
function filterMapelPilihan(mapels: any[], peminatan: string | null) {
    if (!peminatan) {
        // Kelas X - return all mapel pilihan
        return mapels;
    }

    // Define mapel groups
    const mipaMapels = ['MATEMATIKA TINGKAT LANJUT', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['GEOGRAFI', 'SEJARAH TINGKAT LANJUT', 'SOSIOLOGI', 'EKONOMI'];

    // Class XII groupings
    const gbimMapels = ['GEOGRAFI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const sbimMapels = ['SEJARAH', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const ebimMapels = ['EKONOMI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];

    return mapels.filter(mapel => {
        const nmUpper = mapel.nm_lokal.toUpperCase();

        if (peminatan === 'MIPA') {
            return mipaMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'IPS') {
            return ipsMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'GBIM') {
            return gbimMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'SBIM') {
            return sbimMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'EBIM') {
            return ebimMapels.some(m => nmUpper.includes(m));
        }

        return false;
    });
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const peserta_didik_id = searchParams.get('peserta_didik_id');
        const tingkat = searchParams.get('tingkat') || '10'; // Default kelas X
        const kurikulum_id = searchParams.get('kurikulum_id') || '10311'; // Kurikulum Merdeka

        if (!peserta_didik_id) {
            return NextResponse.json(
                { error: 'Parameter peserta_didik_id required' },
                { status: 400 }
            );
        }

        // Get student's class info to detect peminatan
        const siswaKelas = await sql`
      SELECT 
        s.peserta_didik_id,
        s.nm_siswa,
        k.nm_kelas,
        k.tingkat_pendidikan_id,
        k.jurusan_id,
        k.nama_jurusan_sp
      FROM tabel_siswa s
      LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
      WHERE s.peserta_didik_id = ${peserta_didik_id}
      LIMIT 1
    `;

        if (siswaKelas.length === 0) {
            return NextResponse.json(
                { error: 'Siswa not found' },
                { status: 404 }
            );
        }

        const siswa = siswaKelas[0];
        const peminatan = detectPeminatan(siswa.nm_kelas || '');

        // Get mata pelajaran dengan kelompok untuk tingkat tertentu
        const mapelData = await sql`
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
        AND m.kurikulum_id = ${kurikulum_id}
      ORDER BY m.klp_mpl, m.urut_rapor
    `;

        // Group by kelompok
        const kelompokMap = new Map();

        mapelData.forEach((mapel) => {
            const klpId = mapel.klp_mpl;
            let kelompokName = mapel.nama_kelompok || 'Tanpa Kelompok';

            // Customize nama kelompok untuk Mata Pelajaran Pilihan
            if (klpId === 2 && peminatan) {
                kelompokName = `Mata Pelajaran Pilihan - ${peminatan}`;
            }

            if (!kelompokMap.has(klpId)) {
                kelompokMap.set(klpId, {
                    klp_id: klpId,
                    nama_kelompok: kelompokName,
                    mapels: []
                });
            }

            kelompokMap.get(klpId).mapels.push({
                id_map_mapel: mapel.id_map_mapel,
                mata_pelajaran_id: mapel.mata_pelajaran_id,
                nm_lokal: mapel.nm_lokal,
                area_kompetensi: mapel.area_kompetensi,
                klp_mpl: mapel.klp_mpl,
                urut_rapor: mapel.urut_rapor,
                nilai_akhir: null,
                capaian_kompetensi: null
            });
        });

        // Filter mapel pilihan based on peminatan
        kelompokMap.forEach((kelompok, klpId) => {
            if (klpId === 2) { // Mata Pelajaran Pilihan
                kelompok.mapels = filterMapelPilihan(kelompok.mapels, peminatan);
            }
        });

        const kelompokData = Array.from(kelompokMap.values());

        // Fetch nilai akhir from tabel_nilaiakhir
        // For Class XII with multi-enrollment: merge nilai from main class and per-subject classes
        // Priority: jenis_rombel=16 (per-subject) > jenis_rombel=1 (main class)
        const nilaiAkhir = await sql`
      SELECT DISTINCT ON (n.mata_pelajaran_id)
        n.mata_pelajaran_id,
        n.nilai_peng,
        n.nilai_ket,
        n.predikat_peng,
        n.predikat_ket
      FROM tabel_nilaiakhir n
      LEFT JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
      LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
      WHERE ak.peserta_didik_id = ${peserta_didik_id}
        AND n.semester_id = '20251'
      ORDER BY 
        n.mata_pelajaran_id,
        k.jenis_rombel DESC NULLS LAST
    `;

        // Fetch capaian kompetensi from tabel_deskripsi
        const deskripsi = await sql`
      SELECT 
        d.mata_pelajaran_id,
        d.deskripsi_peng_m,
        d.deskripsi_ket_m
      FROM tabel_deskripsi d
      WHERE d.peserta_didik_id = ${peserta_didik_id}
        AND d.semester_id = '20251'
    `;

        // Create maps for quick lookup
        const nilaiMap = new Map();
        nilaiAkhir.forEach(n => {
            nilaiMap.set(n.mata_pelajaran_id, {
                nilai_peng: n.nilai_peng,
                nilai_ket: n.nilai_ket,
                predikat_peng: n.predikat_peng,
                predikat_ket: n.predikat_ket
            });
        });

        const deskripsiMap = new Map();
        deskripsi.forEach(d => {
            // Combine deskripsi_peng_m and deskripsi_ket_m with newline
            const capaianParts = [];
            if (d.deskripsi_peng_m) capaianParts.push(d.deskripsi_peng_m);
            if (d.deskripsi_ket_m) capaianParts.push(d.deskripsi_ket_m);
            const combinedCapaian = capaianParts.join('\n'); // Newline separator
            deskripsiMap.set(d.mata_pelajaran_id, combinedCapaian);
        });

        // Merge nilai and deskripsi into mapel data
        kelompokData.forEach(kelompok => {
            kelompok.mapels.forEach((mapel: any) => {
                const nilai = nilaiMap.get(mapel.mata_pelajaran_id);
                const capaian = deskripsiMap.get(mapel.mata_pelajaran_id);

                if (nilai) {
                    // Use nilai_peng directly as nilai_akhir (no averaging)
                    mapel.nilai_akhir = parseFloat(nilai.nilai_peng) || 0;
                }

                if (capaian) {
                    mapel.capaian_kompetensi = capaian;
                }
            });

            // Filter out mapel without nilai (only show mapel that have grades)
            kelompok.mapels = kelompok.mapels.filter((mapel: any) => mapel.nilai_akhir !== null && mapel.nilai_akhir !== 0);
        });

        // Calculate total mapel after filtering
        const totalMapel = kelompokData.reduce((sum, k) => sum + k.mapels.length, 0);

        // Fetch kokurikuler deskripsi
        const kokurikuler = await sql`
            SELECT deskripsi
            FROM tabel_deskripsikurikuler
            WHERE peserta_didik_id = ${peserta_didik_id}
              AND semester_id = '20251'
            LIMIT 1
        `;

        const kokurikulerDeskripsi = kokurikuler.length > 0 ? kokurikuler[0].deskripsi : null;

        // Fetch ekstrakurikuler data
        const ekstrakurikuler = await sql`
            SELECT 
                re.nm_ekskul as nama_ekstra,
                ne.nilai_ekstra,
                ne.deskripsi
            FROM tabel_nilai_ekstra ne
            LEFT JOIN refekstra_kurikuler re ON ne.id_ekskul_baru = re.id_ekskul
            WHERE ne.peserta_didik_id = ${peserta_didik_id}
              AND ne.semester_id = '20251'
              AND ne.deskripsi IS NOT NULL
            ORDER BY re.nm_ekskul
        `;

        const ekstraList = ekstrakurikuler.map(ek => ({
            nama_ekstra: ek.nama_ekstra || 'N/A',
            nilai_ekstra: ek.nilai_ekstra || '-',
            deskripsi: ek.deskripsi || '-'
        }));

        return NextResponse.json({
            success: true,
            peserta_didik_id,
            nama_siswa: siswa.nm_siswa,
            nm_kelas: siswa.nm_kelas,
            peminatan: peminatan || 'Belum ada peminatan (Kelas X)',
            tingkat,
            total_kelompok: kelompokData.length,
            total_mapel: totalMapel,
            kelompok: kelompokData,
            kokurikuler: kokurikulerDeskripsi,
            ekstrakurikuler: ekstraList
        });

    } catch (error) {
        console.error('Error fetching nilai data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch nilai data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
