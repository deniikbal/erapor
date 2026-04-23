'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { Siswa, User, MarginSettings, Kelas } from '@/lib/db';
import { FileText, Settings as SettingsIcon, Loader2, Download, DownloadCloud, Check, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getCurrentUser } from '@/lib/auth-client';

export default function AdminNilaiRaporPage() {
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [selectedKelas, setSelectedKelas] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadingSiswa, setLoadingSiswa] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeSemester, setActiveSemester] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [generatingBulk, setGeneratingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentStudent: '' });
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [showDebug, setShowDebug] = useState(false);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100));
        console.log(`[PDF-ADMIN-DEBUG] ${msg}`);
    };

    const [openCombobox, setOpenCombobox] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Margin settings state
    const [marginSettings, setMarginSettings] = useState({
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 20,
        margin_right: 20,
        ttd_layout: 'classic'
    });
    const [savingMargin, setSavingMargin] = useState(false);

    useEffect(() => {
        const initUser = async () => {
            const user = await getCurrentUser();
            if (!user) {
                setError('User tidak ditemukan. Silakan login kembali.');
                setLoading(false);
                return;
            }

            // Support both 'Admin' and 'Administrator'
            if (user.level !== 'Admin' && user.level !== 'Administrator') {
                setError('Hanya admin yang dapat mengakses halaman ini');
                setLoading(false);
                return;
            }

            setCurrentUser(user);

            // Fetch active semester
            try {
                const semRes = await fetch('/api/semester/active');
                const semData = await semRes.json();
                if (semRes.ok && semData.data) {
                    setActiveSemester(semData.data);
                }
            } catch (err) {
                console.error('Error fetching active semester:', err);
            }

            fetchKelas();
            if (user.ptk_id) {
                fetchMarginSettings(user.ptk_id);
            }
        };

        initUser();
    }, []);

    const fetchKelas = async () => {
        try {
            const response = await fetch('/api/kelas');
            const data = await response.json();

            if (!response.ok || data.error) {
                setError(data.error || 'Gagal mengambil data kelas');
                return;
            }

            setKelasList(data.kelas || []);
        } catch (err) {
            setError('Terjadi kesalahan saat mengambil data kelas');
        } finally {
            setLoading(false);
        }
    };

    const fetchSiswaByKelas = async (kelasId: string) => {
        setLoadingSiswa(true);
        try {
            const response = await fetch(`/api/kelas/${kelasId}/anggota`);
            const data = await response.json();

            if (!response.ok || data.error) {
                toast.error(data.error || 'Gagal mengambil data siswa');
                setSiswaList([]);
                return;
            }

            setSiswaList(data.siswa || []);
        } catch (err) {
            toast.error('Terjadi kesalahan saat mengambil data siswa');
            setSiswaList([]);
        } finally {
            setLoadingSiswa(false);
        }
    };

    const handleKelasChange = (kelasId: string) => {
        setSelectedKelas(kelasId);
        setCurrentPage(1); // Reset to page 1 when class changes
        if (kelasId) {
            fetchSiswaByKelas(kelasId);
        } else {
            setSiswaList([]);
        }
    };

    const fetchMarginSettings = async (ptk_id: string) => {
        try {
            const response = await fetch(`/api/margin-settings?ptk_id=${ptk_id}`);
            const data = await response.json();

            if (response.ok && data.data) {
                setMarginSettings({
                    margin_top: Number(data.data.margin_top) || 20,
                    margin_bottom: Number(data.data.margin_bottom) || 20,
                    margin_left: Number(data.data.margin_left) || 20,
                    margin_right: Number(data.data.margin_right) || 20,
                    ttd_layout: data.data.ttd_layout || 'classic'
                });
            }
        } catch (err) {
            console.error('Error fetching margin settings:', err);
        }
    };

    const handleSaveMargin = async () => {
        if (!currentUser?.ptk_id) {
            toast.error('PTK ID tidak ditemukan');
            return;
        }

        setSavingMargin(true);
        try {
            const response = await fetch('/api/margin-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ptk_id: currentUser.ptk_id,
                    ...marginSettings
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                toast.error(data.error || 'Gagal menyimpan pengaturan margin');
                return;
            }

            toast.success('Pengaturan margin berhasil disimpan');
        } catch (err) {
            toast.error('Terjadi kesalahan saat menyimpan pengaturan');
        } finally {
            setSavingMargin(false);
        }
    };

    const handleGeneratePDF = async (siswa: Siswa) => {
        setGeneratingPdf(siswa.peserta_didik_id);
        setDebugLogs([]);
        addLog(`=== Memulai ADMIN Generate PDF untuk: ${siswa.nm_siswa} ===`);

        try {
            toast.info('Menyiapkan data rapor...');
            addLog('Mengimpor library jspdf dan modul pendukung...');

            const [
                { jsPDF },
                { generateNilaiRaporHeader },
                { getFaseByTingkat, generateNilaiRaporTable },
                { loadDejaVuFonts },
                { generateKokurikulerTable },
                { generateEkstrakurikulerTable },
                { generateKetidakhadiranTable },
                { generateCatatanWaliTable },
                { generateKeteranganKelulusanTable },
                { generateTanggapanOrtuTable },
                { generateSignatureSection },
                { generateNilaiRaporFooter },
                { generateStudentHeaderInfo }
            ] = await Promise.all([
                import('jspdf'),
                import('@/lib/pdf/nilaiRaporPage'),
                import('@/lib/pdf/nilaiRaporTable'),
                import('@/lib/pdf/fontLoader'),
                import('@/lib/pdf/kokurikulerTable'),
                import('@/lib/pdf/ekstrakurikulerTable'),
                import('@/lib/pdf/ketidakhadiranTable'),
                import('@/lib/pdf/catatanWaliTable'),
                import('@/lib/pdf/keteranganKelulusanTable'),
                import('@/lib/pdf/tanggapanOrtuTable'),
                import('@/lib/pdf/signatureSection'),
                import('@/lib/pdf/nilaiRaporFooter'),
                import('@/lib/pdf/studentHeaderInfo')
            ]);
            addLog('Library berhasil diimpor.');

            addLog('Mengambil data dari server (API)...');
            const [
                sekolahRes, 
                mapelRes, 
                kehadiranRes, 
                catatanWaliRes, 
                kenaikanRes,
                tanggalRaporRes, 
                kelasRes,
                guruRes
            ] = await Promise.all([
                fetch('/api/sekolah'),
                fetch(`/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`),
                fetch(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`),
                fetch(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}&semester_id=${activeSemester?.semester_id}`),
                fetch(`/api/kenaikan?peserta_didik_id=${siswa.peserta_didik_id}&semester_id=${activeSemester?.semester_id}`),
                fetch('/api/tanggalrapor'),
                fetch('/api/kelas'),
                fetch('/api/guru')
            ]);

            addLog('Parsing JSON data...');
            const [
                sekolahData,
                mapelData,
                kehadiranData,
                catatanWaliData,
                kenaikanData,
                tanggalRaporData,
                allKelasData,
                guruData
            ] = await Promise.all([
                sekolahRes.json(),
                mapelRes.json(),
                kehadiranRes.json(),
                catatanWaliRes.json(),
                kenaikanRes.json(),
                tanggalRaporRes.json(),
                kelasRes.json(),
                guruRes.json()
            ]);

            if (!sekolahRes.ok || sekolahData.error) throw new Error('Gagal mengambil data sekolah');
            addLog('Data sekolah berhasil dimuat.');
            if (!mapelRes.ok) throw new Error('Gagal mengambil data mata pelajaran');
            addLog('Data mata pelajaran berhasil dimuat.');

            toast.info('Memasukkan data ke PDF...');
            addLog('Inisialisasi dokumen jsPDF...');

            const doc = new jsPDF({
                compress: true,
                putOnlyUsedFonts: true,
                floatPrecision: 2
            });

            addLog('Memuat fonts DejaVu...');
            await loadDejaVuFonts(doc);

            const fase = siswa.tingkat_pendidikan_id ? getFaseByTingkat(siswa.tingkat_pendidikan_id) : 'E';
            addLog(`Fase ditentukan: ${fase}`);
            
            // Header Info
            const headerInfo = {
                student: { nm_siswa: siswa.nm_siswa, nis: siswa.nis, nisn: siswa.nisn, nm_kelas: siswa.nm_kelas },
                school: { nama: sekolahData.sekolah?.nama || 'SMAN 1 BANTARUJEG', alamat: sekolahData.sekolah?.alamat || 'Jl. Siliwangi No. 119 Bantarujeg' },
                semester: { 
                    nama_semester: activeSemester?.nama || '2025/2026 Ganjil', 
                    tahun_ajaran_id: activeSemester?.tahun_ajaran_id || '2025',
                    semester: activeSemester?.semester
                },
                kelas: siswa.nm_kelas || '-',
                fase: fase
            };

            addLog('Generate Header...');
            let yPos = await generateNilaiRaporHeader(doc, headerInfo, marginSettings);

            addLog('Generate Tabel Nilai...');
            yPos = await generateNilaiRaporTable(doc, yPos, mapelData.kelompok, marginSettings);

            // Kokurikuler
            if (mapelData.kokurikuler) {
                addLog('Generate Tabel Kokurikuler...');
                yPos += 5;
                yPos = await generateKokurikulerTable(doc, yPos, mapelData.kokurikuler, marginSettings);
            }

            // Ekstrakurikuler
            if (mapelData.ekstrakurikuler && mapelData.ekstrakurikuler.length > 0) {
                addLog('Generate Tabel Ekstrakurikuler...');
                yPos += 5;
                yPos = await generateEkstrakurikulerTable(doc, yPos, mapelData.ekstrakurikuler, marginSettings);
            }

            // Kehadiran & Catatan
            if (kehadiranRes.ok && kehadiranData) {
                addLog('Generate Tabel Kehadiran & Catatan Wali...');
                yPos += 5;
                if (yPos + 27 > doc.internal.pageSize.getHeight() - marginSettings.margin_bottom) {
                    doc.addPage();
                    addLog('Tambah halaman baru untuk tabel kehadiran.');
                    yPos = marginSettings.margin_top + 21;
                }
                const tablesStartY = yPos;
                const kehadiranEndY = await generateKetidakhadiranTable(doc, tablesStartY, kehadiranData, marginSettings);
                const catatanWaliX = marginSettings.margin_left + 53 + 5;
                const catatanWaliEndY = await generateCatatanWaliTable(doc, tablesStartY, catatanWaliX, catatanWaliRes.ok ? catatanWaliData : null, marginSettings);
                yPos = Math.max(kehadiranEndY, catatanWaliEndY);
            }

            // Keterangan Kelulusan (Hanya tampil di Semester Genap / Semester 2)
            if (activeSemester?.semester === '2' || activeSemester?.semester === 2) {
                addLog('Generate Keterangan Kelulusan (Semester Genap)...');
                yPos += 5;
                yPos = await generateKeteranganKelulusanTable(doc, yPos, kenaikanData, marginSettings);
            }

            // Tanggapan Ortu
            addLog('Generate Tabel Tanggapan...');
            yPos += 3;
            yPos = await generateTanggapanOrtuTable(doc, yPos, marginSettings);

            // Signatures
            addLog('Generate Signature Section...');
            const studentClass = allKelasData.kelas?.find((k: any) => k.rombongan_belajar_id === selectedKelas);
            let namaWaliKelas = studentClass?.nama_wali_kelas || 'Wali Kelas';
            if (studentClass?.ptk_id) {
                const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);
                if (guruInfo) {
                    const gd = (guruInfo.gelar_depan || '').trim();
                    const gb = (guruInfo.gelar_belakang || '').trim();
                    const nm = (guruInfo.nama || studentClass.nama_wali_kelas || 'Wali Kelas').trim();
                    namaWaliKelas = [gd, nm, gb].filter(part => part !== '').join(' ');
                }
            }

            const formatTgl = (iso: string) => {
                const d = new Date(iso);
                const b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                return `${d.getDate()} ${b[d.getMonth()]} ${d.getFullYear()}`;
            };

            const tglRaw = tanggalRaporData.data?.[0]?.tanggal;
            const signature = {
                tempat: tanggalRaporData.data?.[0]?.tempat_ttd || 'Bantarujeg',
                tanggal: tglRaw ? formatTgl(tglRaw) : '22 Desember 2025',
                namaWaliKelas: namaWaliKelas,
                nipWaliKelas: studentClass?.nip_wali_kelas ? `NIP ${studentClass.nip_wali_kelas}` : '',
                namaKepalaSekolah: sekolahData.sekolah?.nm_kepsek || 'Kepala Sekolah',
                nipKepalaSekolah: sekolahData.sekolah?.nip_kepsek ? `NIP ${sekolahData.sekolah.nip_kepsek}` : '',
                statusKepsek: tanggalRaporData.data?.[0]?.status_kepsek || 'Kepala Sekolah',
                layout: marginSettings.ttd_layout || 'classic'
            };

            yPos += 5;
            await generateSignatureSection(doc, yPos, signature, marginSettings);

            // Footers
            const totalPages = doc.getNumberOfPages();
            const sHeader = {
                nm_siswa: siswa.nm_siswa, nm_kelas: siswa.nm_kelas || '-', nis: siswa.nis || '-', nisn: siswa.nisn || '-', fase,
                nama_sekolah: headerInfo.school.nama, alamat_sekolah: headerInfo.school.alamat,
                semester: headerInfo.semester.semester || (headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2'),
                tahun_ajaran: `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`
            };

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                if (i > 1) await generateStudentHeaderInfo(doc, marginSettings.margin_top, sHeader, marginSettings);
                generateNilaiRaporFooter(doc, { nm_kelas: siswa.nm_kelas || '-', nm_siswa: siswa.nm_siswa, nis: siswa.nis || '-', pageNumber: i }, marginSettings);
            }

            // Save Robust
            const fileName = `Nilai_Rapor_ADMIN_${siswa.nm_siswa.replace(/\s+/g, '_')}.pdf`;
            addLog('Konversi PDF ke Blob...');
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 60000);

            toast.success(`PDF Nilai Rapor untuk ${siswa.nm_siswa} berhasil diunduh`);
            addLog('=== PROSES SELESAI SUKSES ===');
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            addLog('!!! ERROR ADMIN PDF: ' + errMsg);
            console.error('Error generating PDF:', err);
            toast.error('Gagal generate PDF: ' + errMsg);
        } finally {
            setGeneratingPdf(null);
        }
    };

    const handleGenerateBulkPDFs = async () => {
        if (siswaList.length === 0) {
            toast.error('Tidak ada siswa untuk di-generate');
            return;
        }

        setGeneratingBulk(true);
        setBulkProgress({ current: 0, total: siswaList.length, currentStudent: '' });
        setDebugLogs([]);
        addLog(`=== Memulai ADMIN BULK PDF untuk ${siswaList.length} siswa ===`);

        try {
            toast.info('Mempersiapkan PDF Nilai Rapor untuk semua siswa...');
            addLog('Mengimpor library massal...');

            const [
                { jsPDF },
                { generateNilaiRaporHeader },
                { getFaseByTingkat, generateNilaiRaporTable },
                { loadDejaVuFonts },
                { generateKokurikulerTable },
                { generateEkstrakurikulerTable },
                { generateKetidakhadiranTable },
                { generateCatatanWaliTable },
                { generateKeteranganKelulusanTable },
                { generateTanggapanOrtuTable },
                { generateSignatureSection },
                { generateNilaiRaporFooter },
                { generateStudentHeaderInfo },
                { fetchWithRetry }
            ] = await Promise.all([
                import('jspdf'),
                import('@/lib/pdf/nilaiRaporPage'),
                import('@/lib/pdf/nilaiRaporTable'),
                import('@/lib/pdf/fontLoader'),
                import('@/lib/pdf/kokurikulerTable'),
                import('@/lib/pdf/ekstrakurikulerTable'),
                import('@/lib/pdf/ketidakhadiranTable'),
                import('@/lib/pdf/catatanWaliTable'),
                import('@/lib/pdf/keteranganKelulusanTable'),
                import('@/lib/pdf/tanggapanOrtuTable'),
                import('@/lib/pdf/signatureSection'),
                import('@/lib/pdf/nilaiRaporFooter'),
                import('@/lib/pdf/studentHeaderInfo'),
                import('@/lib/fetchRetryHelper')
            ]);
            addLog('Library massal siap.');

            addLog('Mengambil data umum sekolah & guru...');
            const [sekolahRes, tanggalRaporRes, guruRes, allKelasRes] = await Promise.all([
                fetch('/api/sekolah'),
                fetch('/api/tanggalrapor'),
                fetch('/api/guru'),
                fetch('/api/kelas')
            ]);

            const sekolahData = await sekolahRes.json();
            const tanggalRaporData = await tanggalRaporRes.json();
            const guruData = await guruRes.json();
            const allKelasData = await allKelasRes.json();

            if (!sekolahRes.ok || sekolahData.error) throw new Error('Gagal mengambil data sekolah');
            addLog('Data umum berhasil dimuat.');

            addLog('Inisialisasi dokumen jsPDF (Admin Bulk)...');
            const doc = new jsPDF({
                compress: true,
                floatPrecision: 2
            });

            await loadDejaVuFonts(doc);
            let isFirstStudent = true;
            const failedStudents: { name: string; error: string }[] = [];

            for (let i = 0; i < siswaList.length; i++) {
                const siswa = siswaList[i];
                addLog(`---> Memproses Siswa ${i + 1}/${siswaList.length}: ${siswa.nm_siswa}`);
                
                try {
                    setBulkProgress({ current: i + 1, total: siswaList.length, currentStudent: siswa.nm_siswa });
                    
                    if (i > 0) {
                        doc.addPage();
                        const { clearFontState } = await import('@/lib/pdf/optimizedFontLoader');
                        clearFontState(doc);
                    }
                    
                    const studentStartPage = doc.getNumberOfPages();
                    const fase = siswa.tingkat_pendidikan_id ? getFaseByTingkat(siswa.tingkat_pendidikan_id) : 'E';

                    // Fetch student data with retry
                    const [mapelRes, kehadiranRes, catatanWaliRes, kenaikanRes] = await Promise.all([
                        fetchWithRetry(`/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`, undefined, 2, 500),
                        fetchWithRetry(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`, undefined, 2, 500),
                        fetchWithRetry(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}&semester_id=${activeSemester?.semester_id}`, undefined, 2, 500),
                        fetchWithRetry(`/api/kenaikan?peserta_didik_id=${siswa.peserta_didik_id}&semester_id=${activeSemester?.semester_id}`, undefined, 2, 500),
                    ]);

                    if (!mapelRes.ok) throw new Error(`Gagal ambil nilai ${siswa.nm_siswa}`);
                    const [mapelData, kehadiranData, catatanWaliData, kenaikanData] = await Promise.all([
                        mapelRes.json(),
                        kehadiranRes.json(),
                        catatanWaliRes.json(),
                        kenaikanRes.json()
                    ]);

                    const headerInfo = {
                        student: { nm_siswa: siswa.nm_siswa, nis: siswa.nis, nisn: siswa.nisn, nm_kelas: siswa.nm_kelas },
                        school: { nama: sekolahData.sekolah?.nama || 'SMAN 1 BANTARUJEG', alamat: sekolahData.sekolah?.alamat || 'Jl. Siliwangi No. 119 Bantarujeg' },
                        semester: { 
                    nama_semester: activeSemester?.nama || '2025/2026 Ganjil', 
                    tahun_ajaran_id: activeSemester?.tahun_ajaran_id || '2025',
                    semester: activeSemester?.semester
                },
                        kelas: siswa.nm_kelas || '-',
                        fase: fase
                    };

                    let yPos = await generateNilaiRaporHeader(doc, headerInfo, marginSettings);
                    yPos = await generateNilaiRaporTable(doc, yPos, mapelData.kelompok, marginSettings);

                    if (mapelData.kokurikuler) {
                        yPos += 5;
                        yPos = await generateKokurikulerTable(doc, yPos, mapelData.kokurikuler, marginSettings);
                    }

                    if (mapelData.ekstrakurikuler?.length > 0) {
                        yPos += 5;
                        yPos = await generateEkstrakurikulerTable(doc, yPos, mapelData.ekstrakurikuler, marginSettings);
                    }

                    if (kehadiranRes.ok && kehadiranData) {
                        yPos += 5;
                        if (yPos + 27 > doc.internal.pageSize.getHeight() - marginSettings.margin_bottom) {
                            doc.addPage();
                            yPos = marginSettings.margin_top + 21;
                        }
                        const tableStartAt = yPos;
                        const kEndY = await generateKetidakhadiranTable(doc, tableStartAt, kehadiranData, marginSettings);
                        const cWaliX = marginSettings.margin_left + 53 + 5;
                        const cEndY = await generateCatatanWaliTable(doc, tableStartAt, cWaliX, catatanWaliRes.ok ? catatanWaliData : null, marginSettings);
                        yPos = Math.max(kEndY, cEndY);
                    }

                    // Keterangan Kelulusan (Hanya tampil di Semester Genap / Semester 2)
                    if (activeSemester?.semester === '2' || activeSemester?.semester === 2) {
                        yPos += 5;
                        yPos = await generateKeteranganKelulusanTable(doc, yPos, kenaikanData, marginSettings);
                    }

                    yPos += 3;
                    yPos = await generateTanggapanOrtuTable(doc, yPos, marginSettings);

                    const studentClass = allKelasData.kelas?.find((k: any) => k.rombongan_belajar_id === selectedKelas);
                    let namaWaliKelas = studentClass?.nama_wali_kelas || 'Wali Kelas';
                    if (studentClass?.ptk_id) {
                        const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);
                        if (guruInfo) {
                            const gd = (guruInfo.gelar_depan || '').trim();
                            const gb = (guruInfo.gelar_belakang || '').trim();
                            const nm = (guruInfo.nama || studentClass.nama_wali_kelas || 'Wali Kelas').trim();
                            namaWaliKelas = [gd, nm, gb].filter(part => part !== '').join(' ');
                        }
                    }

                    const formatTgl = (iso: string) => {
                        const d = new Date(iso);
                        const b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        return `${d.getDate()} ${b[d.getMonth()]} ${d.getFullYear()}`;
                    };

                    const tglRaw = tanggalRaporData.data?.[0]?.tanggal;
                    const signature = {
                        tempat: tanggalRaporData.data?.[0]?.tempat_ttd || 'Bantarujeg',
                        tanggal: tglRaw ? formatTgl(tglRaw) : '22 Desember 2025',
                        namaWaliKelas: namaWaliKelas,
                        nipWaliKelas: studentClass?.nip_wali_kelas ? `NIP ${studentClass.nip_wali_kelas}` : '',
                        namaKepalaSekolah: sekolahData.sekolah?.nm_kepsek || 'Kepala Sekolah',
                        nipKepalaSekolah: sekolahData.sekolah?.nip_kepsek ? `NIP ${sekolahData.sekolah.nip_kepsek}` : '',
                        statusKepsek: tanggalRaporData.data?.[0]?.status_kepsek || 'Kepala Sekolah',
                        layout: marginSettings.ttd_layout || 'classic'
                    };

                    yPos += 5;
                    await generateSignatureSection(doc, yPos, signature, marginSettings);

                    const studentEndPage = doc.getNumberOfPages();
                    const sHeader = {
                        nm_siswa: siswa.nm_siswa, nm_kelas: siswa.nm_kelas || '-', nis: siswa.nis || '-', nisn: siswa.nisn || '-', fase,
                        nama_sekolah: headerInfo.school.nama, alamat_sekolah: headerInfo.school.alamat,
                        semester: headerInfo.semester.semester || (headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2'),
                        tahun_ajaran: `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`
                    };

                    let pageNum = 1;
                    for (let pIdx = studentStartPage; pIdx <= studentEndPage; pIdx++) {
                        doc.setPage(pIdx);
                        if (pIdx > studentStartPage) await generateStudentHeaderInfo(doc, marginSettings.margin_top, sHeader, marginSettings);
                        generateNilaiRaporFooter(doc, { nm_kelas: siswa.nm_kelas || '-', nm_siswa: siswa.nm_siswa, nis: siswa.nis || '-', pageNumber: pageNum++ }, marginSettings);
                    }
                    addLog(`[OK] Selesai ${siswa.nm_siswa}`);
                } catch (err) {
                    addLog(`!!! GAGAL pada ${siswa.nm_siswa}: ${err}`);
                    failedStudents.push({ name: siswa.nm_siswa, error: String(err) });
                }
            }

            if (siswaList.length > 0) {
                const className = (siswaList[0].nm_kelas || 'Kelas').replace(/\s+/g, '_');
                const fileName = `Nilai_Rapor_Gabungan_ADMIN_${className}.pdf`;
                addLog('Konversi Bulk PDF ke Blob...');
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                
                if (failedStudents.length > 0) {
                    toast.warning(`Selesai. ${siswaList.length - failedStudents.length} berhasil, ${failedStudents.length} gagal.`);
                } else {
                    toast.success('PDF Massal Admin berhasil diunduh!');
                }
                addLog('=== ADMIN BULK SELESAI ===');
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            addLog('!!! ERROR FATAL ADMIN BULK: ' + errMsg);
            console.error('Error generating bulk PDFs:', err);
            toast.error('Gagal generate PDF massal: ' + errMsg);
        } finally {
            setGeneratingBulk(false);
            setBulkProgress({ current: 0, total: 0, currentStudent: '' });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nilai Rapor</h1>
                    <p className="text-muted-foreground">Generate PDF nilai rapor siswa</p>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nilai Rapor</h1>
                    <p className="text-muted-foreground">Generate PDF nilai rapor siswa</p>
                </div>
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                    <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
                        Cetak Nilai Rapor
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] ml-3 italic">
                    Generate PDF nilai rapor siswa untuk seluruh kelas reguler.
                </p>
            </div>

            {/* Kelas Selection Card */}
            <Card className="rounded-sm shadow-sm border border-blue-100">
                <CardHeader className="py-2 px-4 bg-slate-50/50 border-b">
                    <CardTitle className="text-xs font-bold text-[#1e3a8a]">Pilih Kelas</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="h-9 w-full justify-between text-xs font-bold text-[#1e3a8a] bg-slate-50 border-blue-100"
                            >
                                {selectedKelas
                                    ? kelasList.find(k => k.rombongan_belajar_id === selectedKelas)?.nm_kelas +
                                    (kelasList.find(k => k.rombongan_belajar_id === selectedKelas)?.jumlah_siswa
                                        ? ` (${kelasList.find(k => k.rombongan_belajar_id === selectedKelas)?.jumlah_siswa} siswa)`
                                        : '')
                                    : 'Pilih kelas...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start" avoidCollisions={false} sideOffset={4}>
                            <Command>
                                <CommandInput placeholder="Cari kelas..." />
                                <CommandList>
                                    <CommandEmpty>Kelas tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                        {kelasList
                                            .filter(kelas => {
                                                const jenis = Number(kelas.jenis_rombel);
                                                return jenis === 1 || jenis === 9;
                                            })
                                            .sort((a, b) => a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' }))
                                            .map((kelas) => (
                                                <CommandItem
                                                    key={kelas.rombongan_belajar_id}
                                                    value={kelas.nm_kelas}
                                                    onSelect={() => {
                                                        handleKelasChange(kelas.rombongan_belajar_id);
                                                        setOpenCombobox(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${selectedKelas === kelas.rombongan_belajar_id ? 'opacity-100' : 'opacity-0'}`}
                                                    />
                                                    {kelas.nm_kelas} {kelas.jumlah_siswa ? `(${kelas.jumlah_siswa} siswa)` : ''}
                                                </CommandItem>
                                            ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            {/* Margin Settings Card */}
            {currentUser?.ptk_id && (
                <Card className="rounded-sm shadow-sm border border-blue-100 mt-4">
                    <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                        <div className="flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-[#1e3a8a]" />
                            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Pengaturan Margin PDF (mm)</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="py-3 px-4">
                        <div className="grid gap-x-4 gap-y-3 md:grid-cols-5">
                            <div className="space-y-1">
                                <Label htmlFor="margin_top" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Atas</Label>
                                <Input
                                    id="margin_top"
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs font-bold border-blue-100 focus:ring-[#1e3a8a]"
                                    value={marginSettings.margin_top}
                                    onChange={(e) => setMarginSettings({ ...marginSettings, margin_top: parseFloat(e.target.value) || 0 })}
                                    disabled={savingMargin}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="margin_bottom" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Bawah</Label>
                                <Input
                                    id="margin_bottom"
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs font-bold border-blue-100 focus:ring-[#1e3a8a]"
                                    value={marginSettings.margin_bottom}
                                    onChange={(e) => setMarginSettings({ ...marginSettings, margin_bottom: parseFloat(e.target.value) || 0 })}
                                    disabled={savingMargin}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="margin_left" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Kiri</Label>
                                <Input
                                    id="margin_left"
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs font-bold border-blue-100 focus:ring-[#1e3a8a]"
                                    value={marginSettings.margin_left}
                                    onChange={(e) => setMarginSettings({ ...marginSettings, margin_left: parseFloat(e.target.value) || 0 })}
                                    disabled={savingMargin}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="margin_right" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Kanan</Label>
                                <Input
                                    id="margin_right"
                                    type="number"
                                    step="0.1"
                                    className="h-8 text-xs font-bold border-blue-100 focus:ring-[#1e3a8a]"
                                    value={marginSettings.margin_right}
                                    onChange={(e) => setMarginSettings({ ...marginSettings, margin_right: parseFloat(e.target.value) || 0 })}
                                    disabled={savingMargin}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="ttd_layout" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Layout TTD</Label>
                                <select 
                                    id="ttd_layout"
                                    className="flex h-8 w-full rounded-md border border-blue-100 bg-slate-50 px-3 py-1 text-xs font-bold focus:ring-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                                    value={marginSettings.ttd_layout}
                                    onChange={(e) => setMarginSettings({ ...marginSettings, ttd_layout: e.target.value })}
                                    disabled={savingMargin}
                                >
                                    <option value="classic">Klasik</option>
                                    <option value="stacked">Bertingkat</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleSaveMargin} disabled={savingMargin} size="sm" className="bg-[#1e3a8a] hover:bg-indigo-900 text-xs font-bold">
                                {savingMargin ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        MENYIMPAN...
                                    </>
                                ) : (
                                    'SIMPAN PENGATURAN MARGIN'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Student List Card */}
            {selectedKelas && (
                <Card>
                    <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#1e3a8a]" />
                                <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Siswa</CardTitle>
                            </div>

                            {/* Bulk Generate Button */}
                            {siswaList.length > 0 && (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        onClick={handleGenerateBulkPDFs}
                                        size="sm"
                                        className="bg-[#1e3a8a] hover:bg-indigo-900 text-[10px] font-black shadow-md"
                                        disabled={generatingBulk || siswaList.length === 0}
                                    >
                                        {generatingBulk ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                PROSES ({bulkProgress.current}/{bulkProgress.total})
                                            </>
                                        ) : (
                                            <>
                                                <DownloadCloud className="h-4 w-4 mr-2" />
                                                CETAK SEMUA SISWA (GABUNGAN)
                                            </>
                                        )}
                                    </Button>
                                    {generatingBulk && bulkProgress.total > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            Membuat PDF untuk: {bulkProgress.currentStudent || 'Memulai...'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {loadingSiswa ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <>
                                <div className="rounded-md border mt-2">
                                    <Table>
                                    <TableHeader className="bg-[#1e3a8a]">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="text-white font-bold w-[40px] border-r border-white/10 text-center uppercase text-[10px] py-1.5 px-2">No</TableHead>
                                                <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3 font-black">Nama Lengkap</TableHead>
                                                <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3 text-center">NIS</TableHead>
                                                <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3 text-center">Kelas</TableHead>
                                                <TableHead className="text-white font-bold text-right uppercase text-[10px] py-1.5 px-3">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {siswaList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        Tidak ada data siswa di kelas ini
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (() => {
                                                    // Pagination logic
                                                    const totalPages = Math.ceil(siswaList.length / ITEMS_PER_PAGE);
                                                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                                    const paginatedSiswa = siswaList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                                                    return paginatedSiswa.map((siswa, index) => (
                                                        <TableRow key={siswa.peserta_didik_id} className="hover:bg-slate-50/50">
                                                            <TableCell className="text-center font-bold text-slate-500 py-1.5 text-xs border-r">{startIndex + index + 1}</TableCell>
                                                            <TableCell className="font-bold text-[#1e3a8a] py-1.5 text-sm border-r leading-tight">{siswa.nm_siswa}</TableCell>
                                                            <TableCell className="text-center text-xs font-medium text-slate-600 py-1.5 border-r">{siswa.nis}</TableCell>
                                                            <TableCell className="text-center text-xs font-bold text-indigo-600 py-1.5 border-r">{siswa.nm_kelas || '-'}</TableCell>
                                                            <TableCell className="text-right py-1 px-3">
                                                                <Button
                                                                    onClick={() => handleGeneratePDF(siswa)}
                                                                    size="sm"
                                                                    className="h-7 px-3 bg-[#1e3a8a] hover:bg-indigo-950 text-[10px] font-black shadow-sm"
                                                                    disabled={generatingPdf === siswa.peserta_didik_id || generatingBulk}
                                                                >
                                                                    {generatingPdf === siswa.peserta_didik_id ? (
                                                                        <>
                                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                            LOAD...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Download className="h-3.5 w-3.5 mr-1" />
                                                                            CETAK PDF
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ));
                                                })()
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination Controls */}
                                {siswaList.length > 0 && (() => {
                                    const totalPages = Math.ceil(siswaList.length / ITEMS_PER_PAGE);
                                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

                                    if (totalPages <= 1) return null;

                                    return (
                                        <div className="flex items-center justify-between px-2 py-4">
                                            <div className="text-sm text-muted-foreground">
                                                Menampilkan {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, siswaList.length)} dari {siswaList.length} data
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                                    Previous
                                                </Button>

                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                                        if (
                                                            page === 1 ||
                                                            page === totalPages ||
                                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                                        ) {
                                                            return (
                                                                <Button
                                                                    key={page}
                                                                    variant={currentPage === page ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(page)}
                                                                    className={currentPage === page ? "bg-[#1e3a8a] hover:bg-indigo-900 w-8 h-8 text-xs font-bold" : "w-8 h-8 text-xs"}
                                                                >
                                                                    {page}
                                                                </Button>
                                                            );
                                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                            return <span key={page} className="px-2">...</span>;
                                                        }
                                                        return null;
                                                    })}
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {!selectedKelas && (
                <Alert>
                    <AlertDescription>
                        Silakan pilih kelas terlebih dahulu untuk menampilkan daftar siswa
                    </AlertDescription>
                </Alert>
            )}

            {/* Debug Logs Display */}
            <div className="flex justify-center mt-6">
                <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDebug(true)}
                    className="text-xs text-muted-foreground underline decoration-dotted"
                >
                    Klik di sini jika PDF Admin tidak terdownload (Fitur Debug)
                </Button>
            </div>

            <Dialog open={showDebug} onOpenChange={setShowDebug}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col sm:rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            PDF Admin Debug Console
                        </DialogTitle>
                        <DialogDescription>
                            Harap capture log ini jika unduhan halaman Admin gagal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-y-auto flex-1 space-y-1 my-4 border border-slate-800">
                        {debugLogs.length === 0 ? (
                            <p className="text-slate-500 italic">Belum ada log Admin. Silakan coba generate PDF.</p>
                        ) : (
                            debugLogs.map((log, i) => (
                                <div key={i} className={
                                    log.includes('!!!') || log.includes('!!') ? 'text-red-400 font-bold' : 
                                    log.includes('===') ? 'text-blue-400 font-bold border-b border-slate-800 pb-1 mt-2' : 
                                    log.includes('SUKSES') || log.includes('[OK]') ? 'text-green-400 font-bold' : ''
                                }>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDebugLogs([])}>Library Reset</Button>
                        <Button size="sm" onClick={() => setShowDebug(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
