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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Siswa, User, MarginSettings } from '@/lib/db';
import { FileText, Settings as SettingsIcon, Loader2, Download, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth-client';

export default function NilaiRaporPage() {
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
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
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100)); // Keep last 100
        console.log(`[PDF-DEBUG] ${msg}`);
    };

    // Margin settings state
    const [marginSettings, setMarginSettings] = useState({
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 20,
        margin_right: 20,
        ttd_layout: 'classic'
    });
    const [savingMargin, setSavingMargin] = useState(false);

    // Modal and class selection state
    const [showClassModal, setShowClassModal] = useState(false);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = siswaList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(siswaList.length / itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    useEffect(() => {
        const initUser = async () => {
            const user = await getCurrentUser();
            if (!user) {
                setError('User tidak ditemukan. Silakan login kembali.');
                setLoading(false);
                return;
            }

            if (user.level !== 'Guru') {
                setError('Hanya guru yang dapat mengakses halaman ini');
                setLoading(false);
                return;
            }

            if (!user.ptk_id) {
                setError('PTK ID tidak ditemukan. Silakan hubungi administrator.');
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

            fetchSiswa(user.ptk_id);
            fetchMarginSettings(user.ptk_id);
            fetchAvailableClasses(user.ptk_id);
        };

        initUser();
    }, []);

    const fetchAvailableClasses = async (ptk_id: string) => {
        try {
            const response = await fetch('/api/kelas');
            const data = await response.json();

            if (response.ok && data.kelas) {
                // Filter classes where this teacher is wali kelas AND jenis_rombel is '1' or '9' (string)
                const teacherClasses = data.kelas.filter((k: any) =>
                    k.ptk_id === ptk_id && (k.jenis_rombel === '1' || k.jenis_rombel === '9')
                );
                setAvailableClasses(teacherClasses);

                // Set first class as default selection if available
                if (teacherClasses.length > 0) {
                    setSelectedClass(teacherClasses[0].rombongan_belajar_id);
                }
            }
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const fetchSiswa = async (ptk_id: string) => {
        try {
            const response = await fetch(`/api/siswa/by-wali-kelas?ptk_id=${ptk_id}`);
            const data = await response.json();

            if (!response.ok || data.error) {
                setError(data.error || 'Gagal mengambil data siswa');
                return;
            }

            setSiswaList(data.siswa || []);
        } catch (err) {
            setError('Terjadi kesalahan saat mengambil data');
        } finally {
            setLoading(false);
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
        if (!currentUser?.ptk_id) return;

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
        setDebugLogs([]); // Reset logs
        addLog(`=== Memulai Generate PDF untuk: ${siswa.nm_siswa} ===`);

        try {
            toast.info('Menyiapkan data rapor...');
            addLog('Mengimpor library jspdf dan modul pendukung...');

            // 1. Batch all dynamic imports at once to save time
            const [
                { jsPDF },
                { generateNilaiRaporHeader },
                { getFaseByTingkat, generateNilaiRaporTable },
                { loadDejaVuFonts },
                { generateKokurikulerTable },
                { generateEkstrakurikulerTable },
                { generateKetidakhadiranTable },
                { generateCatatanWaliTable },
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
                import('@/lib/pdf/tanggapanOrtuTable'),
                import('@/lib/pdf/signatureSection'),
                import('@/lib/pdf/nilaiRaporFooter'),
                import('@/lib/pdf/studentHeaderInfo')
            ]);
            addLog('Library berhasil diimpor.');

            // 2. Batch all data fetching at once
            addLog('Mengambil data dari server (API)...');
            const [
                sekolahRes, 
                mapelRes, 
                kehadiranRes, 
                catatanWaliRes, 
                tanggalRaporRes, 
                kelasRes,
                guruRes
            ] = await Promise.all([
                fetch('/api/sekolah'),
                fetch(`/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`),
                fetch(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`),
                fetch(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}`),
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
                tanggalRaporData,
                walasData,
                guruData
            ] = await Promise.all([
                sekolahRes.json(),
                mapelRes.json(),
                kehadiranRes.json(),
                catatanWaliRes.json(),
                tanggalRaporRes.json(),
                kelasRes.json(),
                guruRes.json()
            ]);

            if (!sekolahRes.ok || sekolahData.error) throw new Error('Gagal mengambil data sekolah');
            addLog('Data sekolah berhasil dimuat.');
            if (!mapelRes.ok || !mapelData.success) {
                addLog('Gagal mengambil data mata pelajaran: ' + mapelRes.status);
                throw new Error('Gagal mengambil data mata pelajaran');
            }
            addLog(`Data ${mapelData.kelompok?.length || 0} mata pelajaran berhasil dimuat.`);

            toast.info('Memasukkan data ke PDF...');
            addLog('Inisialisasi dokumen jsPDF...');

            // 3. Create PDF and Construction (Mostly synchronous calculation)
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
                student: {
                    nm_siswa: siswa.nm_siswa,
                    nis: siswa.nis,
                    nisn: siswa.nisn,
                    nm_kelas: siswa.nm_kelas
                },
                school: {
                    nama: sekolahData.sekolah?.nama || 'SMAN 1 BANTARUJEG',
                    alamat: sekolahData.sekolah?.alamat || 'Jl. Siliwangi No. 119 Bantarujeg'
                },
                semester: {
                    nama_semester: activeSemester?.nama || '2025/2026 Ganjil',
                    tahun_ajaran_id: activeSemester?.tahun_ajaran_id || '2025',
                    semester: activeSemester?.semester
                },
                kelas: siswa.nm_kelas || '-',
                fase: fase
            };

            addLog('Generate Header...');
            let yAfterHeader = await generateNilaiRaporHeader(doc, headerInfo, marginSettings);

            addLog('Generate Tabel Nilai...');
            let yAfterTable = await generateNilaiRaporTable(doc, yAfterHeader, mapelData.kelompok, marginSettings);

            // Kokurikuler
            if (mapelData.kokurikuler) {
                addLog('Generate Tabel Kokurikuler...');
                yAfterTable += 5;
                yAfterTable = await generateKokurikulerTable(doc, yAfterTable, mapelData.kokurikuler, marginSettings);
            }

            // Ekstrakurikuler
            if (mapelData.ekstrakurikuler && mapelData.ekstrakurikuler.length > 0) {
                addLog('Generate Tabel Ekstrakurikuler...');
                yAfterTable += 5;
                yAfterTable = await generateEkstrakurikulerTable(doc, yAfterTable, mapelData.ekstrakurikuler, marginSettings);
            }

            // Kehadiran & Catatan (Side by side)
            if (kehadiranRes.ok && kehadiranData) {
                addLog('Generate Tabel Kehadiran & Catatan Wali...');
                yAfterTable += 5;
                const pageHeight = doc.internal.pageSize.getHeight();
                if (yAfterTable + 27 > pageHeight - marginSettings.margin_bottom) {
                    doc.addPage();
                    addLog('Tambah halaman baru untuk tabel kehadiran.');
                    yAfterTable = marginSettings.margin_top + 21;
                }
                const tablesStartY = yAfterTable;
                const kehadiranEndY = await generateKetidakhadiranTable(doc, tablesStartY, kehadiranData, marginSettings);
                const catatanWaliX = marginSettings.margin_left + 53 + 5;
                const catatanWaliEndY = await generateCatatanWaliTable(doc, tablesStartY, catatanWaliX, catatanWaliRes.ok ? catatanWaliData : null, marginSettings);
                yAfterTable = Math.max(kehadiranEndY, catatanWaliEndY);
            }

            // Tanggapan Ortu
            addLog('Generate Tabel Tanggapan...');
            yAfterTable += 5;
            yAfterTable = await generateTanggapanOrtuTable(doc, yAfterTable, marginSettings);

            // Signatures
            addLog('Generate Signature Section...');
            const studentClass = walasData.kelas?.find((k: any) => k.nm_kelas === siswa.nm_kelas);
            let namaWaliKelasWithGelar = studentClass?.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';
            if (studentClass?.ptk_id) {
                const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);
                if (guruInfo) {
                    const gelarDepan = (guruInfo.gelar_depan || '').trim();
                    const gelarBelakang = (guruInfo.gelar_belakang || '').trim();
                    const namaAsli = (guruInfo.nama || studentClass.nama_wali_kelas || currentUser?.nama || 'Wali Kelas').trim();
                    namaWaliKelasWithGelar = [gelarDepan, namaAsli, gelarBelakang].filter(part => part !== '').join(' ');
                }
            }

            const formatTanggalIndonesia = (isoDate: string): string => {
                const date = new Date(isoDate);
                const bulanIndonesia = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                return `${date.getDate()} ${bulanIndonesia[date.getMonth()]} ${date.getFullYear()}`;
            };

            const tanggalRaw = tanggalRaporData.data?.[0]?.tanggal;
            const signatureData = {
                tempat: tanggalRaporData.data?.[0]?.tempat_ttd || 'Bantarujeg',
                tanggal: tanggalRaw ? formatTanggalIndonesia(tanggalRaw) : '22 Desember 2025',
                namaWaliKelas: namaWaliKelasWithGelar,
                nipWaliKelas: studentClass?.nip_wali_kelas ? `NIP ${studentClass.nip_wali_kelas}` : '',
                namaKepalaSekolah: sekolahData.sekolah?.nm_kepsek || 'Kepala Sekolah',
                nipKepalaSekolah: sekolahData.sekolah?.nip_kepsek ? `NIP ${sekolahData.sekolah.nip_kepsek}` : '',
                statusKepsek: tanggalRaporData.data?.[0]?.status_kepsek || 'Kepala Sekolah',
                layout: marginSettings.ttd_layout || 'classic'
            };

            yAfterTable += 5;
            yAfterTable = await generateSignatureSection(doc, yAfterTable, signatureData, marginSettings);

            // Finalizing headers/footers
            const totalPages = doc.getNumberOfPages();
            addLog(`PDF selesai dibuat. Total halaman: ${totalPages}`);

            const studentHeaderInfo = {
                nm_siswa: siswa.nm_siswa,
                nm_kelas: siswa.nm_kelas || '-',
                nis: siswa.nis || '-',
                nisn: siswa.nisn || '-',
                fase: fase,
                nama_sekolah: headerInfo.school.nama,
                alamat_sekolah: headerInfo.school.alamat,
                semester: headerInfo.semester.semester || (headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2'),
                tahun_ajaran: `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`
            };

            addLog('Generate Footers untuk semua halaman...');
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                if (i > 1) await generateStudentHeaderInfo(doc, marginSettings.margin_top, studentHeaderInfo, marginSettings);
                generateNilaiRaporFooter(doc, {
                    nm_kelas: siswa.nm_kelas || '-',
                    nm_siswa: siswa.nm_siswa,
                    nis: siswa.nis || '-',
                    pageNumber: i
                }, marginSettings);
            }

            // 4. Save/Download (Robust Blob Method)
            const sanitizedName = siswa.nm_siswa.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
            const fileName = `Nilai_Rapor_${sanitizedName}.pdf`;
            
            addLog('Konversi PDF ke Blob...');
            try {
                const blob = doc.output('blob');
                addLog(`Blob berhasil dibuat. Ukuran: ${(blob.size / 1024).toFixed(2)} KB. Tipe: ${blob.type}`);
                
                const url = URL.createObjectURL(blob);
                addLog(`URL Blob dibuat: ${url}`);

                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                addLog('Menambahkan link download ke dokumen dan mensimulasikan klik...');
                
                document.body.appendChild(link);
                link.click();
                
                addLog('Klik simulasi berhasil. Menghapus link.');
                document.body.removeChild(link);
                
                // Keep URL alive for 1 minute for manual access if needed
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    addLog('URL Blob dibersihkan (revoke).');
                }, 60000);

                toast.success(`PDF Nilai Rapor untuk ${siswa.nm_siswa} berhasil diunduh`);
                addLog('=== PROSES SELESAI DENGAN SUKSES ===');
            } catch (saveErr) {
                const errMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
                addLog('!! GAGAL SAAT SIMPAN BLOB: ' + errMsg);
                console.error('Error saving PDF:', saveErr);
                addLog('Mencoba fallback metode doc.save()...');
                doc.save(fileName);
                toast.success(`PDF Nilai Rapor untuk ${siswa.nm_siswa} berhasil dibuat`);
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            addLog('!!! ERROR GENERATE PDF: ' + errMsg);
            console.error('Error generating PDF:', err);
            toast.error('Gagal generate PDF: ' + errMsg);
        } finally {
            setGeneratingPdf(null);
        }
    };

    const handleOpenBulkModal = () => {
        if (availableClasses.length === 0) {
            toast.error('Tidak ada kelas yang tersedia');
            return;
        }
        setShowClassModal(true);
    };

    const handleGenerateBulkPDFs = async () => {
        setShowClassModal(false);
        const selectedClassData = availableClasses.find(k => k.rombongan_belajar_id === selectedClass);
        const filteredSiswa = siswaList.filter(s => s.nm_kelas === selectedClassData?.nm_kelas);

        if (filteredSiswa.length === 0) {
            toast.error('Tidak ada siswa di kelas yang dipilih');
            return;
        }

        setGeneratingBulk(true);
        setBulkProgress({ current: 0, total: filteredSiswa.length, currentStudent: '' });
        setDebugLogs([]); // Reset logs
        addLog(`=== Memulai GENSET BULK PDF untuk ${filteredSiswa.length} siswa ===`);
        addLog(`Kelas: ${selectedClassData?.nm_kelas || '-'}`);

        try {
            toast.info('Menyiapkan generator PDF massal...');
            addLog('Mengimpor library massal...');

            // 1. Batch Imports
            const [
                { jsPDF },
                { generateNilaiRaporHeader },
                { getFaseByTingkat, generateNilaiRaporTable },
                { loadDejaVuFonts },
                { generateKokurikulerTable },
                { generateEkstrakurikulerTable },
                { generateKetidakhadiranTable },
                { generateCatatanWaliTable },
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
                import('@/lib/pdf/tanggapanOrtuTable'),
                import('@/lib/pdf/signatureSection'),
                import('@/lib/pdf/nilaiRaporFooter'),
                import('@/lib/pdf/studentHeaderInfo'),
                import('@/lib/fetchRetryHelper')
            ]);
            addLog('Library massal siap.');

            // 2. Batch Static Data Fetch once for all students
            addLog('Mengambil data umum sekolah & guru...');
            const [sekolahRes, tanggalRaporRes, guruRes, kelasRes] = await Promise.all([
                fetch('/api/sekolah'),
                fetch('/api/tanggalrapor'),
                fetch('/api/guru'),
                fetch('/api/kelas')
            ]);

            const sekolahData = await sekolahRes.json();
            const tanggalRaporData = await tanggalRaporRes.json();
            const guruData = await guruRes.json();
            const kelasData = await kelasRes.json();

            if (!sekolahRes.ok || sekolahData.error) throw new Error('Gagal mengambil data sekolah');
            addLog('Data umum berhasil dimuat.');

            // 3. Initialize PDF
            addLog('Inisialisasi dokumen jsPDF (Bulk)...');
            const doc = new jsPDF({
                compress: true,
                floatPrecision: 2
            });

            await loadDejaVuFonts(doc);
            let isFirstStudent = true;
            const failedStudents: { name: string; error: string }[] = [];

            // 4. Loop through filtered students
            for (let studentIndex = 0; studentIndex < filteredSiswa.length; studentIndex++) {
                const siswa = filteredSiswa[studentIndex];
                addLog(`---> Memproses Siswa ${studentIndex + 1}/${filteredSiswa.length}: ${siswa.nm_siswa}`);

                try {
                    setBulkProgress({
                        current: studentIndex + 1,
                        total: filteredSiswa.length,
                        currentStudent: siswa.nm_siswa
                    });

                    if (studentIndex === 0 || studentIndex === filteredSiswa.length - 1 || (studentIndex + 1) % 5 === 0) {
                        toast.info(`Memproses: ${siswa.nm_siswa} (${studentIndex + 1}/${filteredSiswa.length})`);
                    }

                    if (!isFirstStudent) {
                        doc.addPage();
                        const { clearFontState } = await import('@/lib/pdf/optimizedFontLoader');
                        clearFontState(doc);
                    }
                    isFirstStudent = false;

                    const studentStartPage = doc.getNumberOfPages();
                    const fase = siswa.tingkat_pendidikan_id ? getFaseByTingkat(siswa.tingkat_pendidikan_id) : 'E';

                    // Batch student-specific data
                    const [mapelRes, kehadiranRes, catatanWaliRes] = await Promise.all([
                        fetchWithRetry(`/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`, undefined, 3, 1000),
                        fetchWithRetry(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`, undefined, 3, 1000),
                        fetchWithRetry(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}`, undefined, 3, 1000)
                    ]);

                    if (!mapelRes.ok) throw new Error(`Gagal mengambil data mata pelajaran`);
                    const [mapelData, kehadiranData, catatanWaliData] = await Promise.all([
                        mapelRes.json(),
                        kehadiranRes.json(),
                        catatanWaliRes.json()
                    ]);

                    // Generate Rapor Content
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

                    yPos += 5;
                    yPos = await generateTanggapanOrtuTable(doc, yPos, marginSettings);

                    // Signature for student
                    const studentClass = kelasData.kelas?.find((k: any) => k.nm_kelas === siswa.nm_kelas);
                    let namaWaliKelas = studentClass?.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';
                    if (studentClass?.ptk_id) {
                        const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);
                        if (guruInfo) {
                            const gd = (guruInfo.gelar_depan || '').trim();
                            const gb = (guruInfo.gelar_belakang || '').trim();
                            const nm = (guruInfo.nama || studentClass.nama_wali_kelas || currentUser?.nama || 'Wali Kelas').trim();
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

                    // Student Header and Footer for each page
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
                    const errS = String(err);
                    addLog(`!!! GAGAL pada ${siswa.nm_siswa}: ${errS}`);
                    console.error(`Error generating PDF for ${siswa.nm_siswa}:`, err);
                    failedStudents.push({ name: siswa.nm_siswa, error: errS });
                }
            }

            // 5. Save combined PDF (Robust Blob Method)
            if (filteredSiswa.length > 0) {
                const sanitizedKelas = (filteredSiswa[0].nm_kelas || 'Kelas').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
                const fileName = `Nilai_Rapor_${sanitizedKelas}_Gabungan.pdf`;
                addLog(`Finishing Combined PDF: ${fileName}`);
                
                try {
                    addLog('Konversi Bulk PDF ke Blob...');
                    const blob = doc.output('blob');
                    addLog(`Blob massal dibuat. Ukuran: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
                    
                    const url = URL.createObjectURL(blob);
                    addLog(`URL Massal: ${url}`);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        addLog('URL Massal dibereskan.');
                    }, 60000);
                    
                    if (failedStudents.length > 0) {
                        toast.warning(`Selesai. ${filteredSiswa.length - failedStudents.length} berhasil, ${failedStudents.length} gagal.`);
                    } else {
                        toast.success('Rapor massal berhasil diunduh!');
                    }
                    addLog('=== GENSET BULK SELESAI ===');
                } catch (saveErr) {
                    addLog('!! GAGAL Simpan Bulk Blob: ' + String(saveErr));
                    console.error('Error saving bulk PDF:', saveErr);
                    doc.save(fileName);
                }
            }
        } catch (err) {
            const errS = String(err);
            addLog('!!! ERROR FATAL BULK: ' + errS);
            console.error('Error generating bulk PDFs:', err);
            toast.error('Gagal generate PDF massal: ' + errS);
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
        <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-slate-900">
            <div className="flex flex-col gap-1.5 pl-1">
                <h1 className="text-2xl font-black tracking-tight text-[#1e3a8a] uppercase">
                    Nilai Rapor (Halaman Nilai)
                </h1>
                <p className="text-[13px] text-slate-500 font-medium italic">
                    Generate dokumen nilai capaian hasil belajar siswa ({siswaList.length} siswa siap cetak).
                </p>
            </div>

            {/* Margin Settings Card */}
            <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                <CardHeader className="py-3 px-4 border-b border-blue-50">
                    <div className="flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4 text-[#1e3a8a]" />
                        <CardTitle className="text-sm font-black text-[#1e3a8a] uppercase">Pengaturan Margin & Tata Letak</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="py-3 px-4">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="margin_top" className="text-[10px] font-bold text-slate-500 uppercase">Atas (mm)</Label>
                            <Input
                                id="margin_top"
                                type="number"
                                step="0.1"
                                className="h-8 text-xs font-bold border-blue-50 bg-slate-50 focus:ring-[#1e3a8a]"
                                value={marginSettings.margin_top}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_top: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="margin_bottom" className="text-[10px] font-bold text-slate-500 uppercase">Bawah (mm)</Label>
                            <Input
                                id="margin_bottom"
                                type="number"
                                step="0.1"
                                className="h-8 text-xs font-bold border-blue-50 bg-slate-50 focus:ring-[#1e3a8a]"
                                value={marginSettings.margin_bottom}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_bottom: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="margin_left" className="text-[10px] font-bold text-slate-500 uppercase">Kiri (mm)</Label>
                            <Input
                                id="margin_left"
                                type="number"
                                step="0.1"
                                className="h-8 text-xs font-bold border-blue-50 bg-slate-50 focus:ring-[#1e3a8a]"
                                value={marginSettings.margin_left}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_left: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="margin_right" className="text-[10px] font-bold text-slate-500 uppercase">Kanan (mm)</Label>
                            <Input
                                id="margin_right"
                                type="number"
                                step="0.1"
                                className="h-8 text-xs font-bold border-blue-50 bg-slate-50 focus:ring-[#1e3a8a]"
                                value={marginSettings.margin_right}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_right: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ttd_layout" className="text-[10px] font-bold text-slate-500 uppercase">Layout TTD</Label>
                            <select
                                id="ttd_layout"
                                className="flex h-8 w-full rounded-md border border-blue-50 bg-slate-50 px-3 py-1 text-[11px] font-bold text-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                                value={marginSettings.ttd_layout || 'classic'}
                                onChange={(e) => setMarginSettings({ ...marginSettings, ttd_layout: e.target.value })}
                                disabled={savingMargin}
                            >
                                <option value="classic">BAWAH (CLASSIC)</option>
                                <option value="parallel">SEJAJAR (PARALLEL)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex justify-end px-1">
                        <Button onClick={handleSaveMargin} disabled={savingMargin} size="sm" className="bg-[#1e3a8a] hover:bg-blue-800 h-8 px-4 text-[11px] font-bold uppercase tracking-wider">
                            {savingMargin ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Konfigurasi PDF'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Student List Card */}
            <Card className="rounded-sm shadow-md border-none overflow-hidden bg-white">
                <CardHeader className="py-3 px-4 border-b border-blue-50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#1e3a8a]" />
                                <CardTitle className="text-sm font-black text-[#1e3a8a] uppercase">Daftar Siswa</CardTitle>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium italic">Pilih siswa untuk mengunduh laporan hasil belajar.</p>
                        </div>

                        {/* Bulk Generate Button */}
                        <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto">
                            <Button
                                onClick={handleOpenBulkModal}
                                size="sm"
                                className="bg-blue-700 hover:bg-blue-800 w-full sm:w-auto h-8 text-[11px] font-bold uppercase tracking-wider"
                                disabled={generatingBulk || siswaList.length === 0}
                            >
                                {generatingBulk ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                        Memproses ({bulkProgress.current}/{bulkProgress.total})
                                    </>
                                ) : (
                                    <>
                                        <DownloadCloud className="h-3.5 w-3.5 mr-2" />
                                        Cetak Massal (Gabungan)
                                    </>
                                )}
                            </Button>
                            {generatingBulk && bulkProgress.total > 0 && (
                                <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded truncate max-w-[200px]">
                                    {bulkProgress.currentStudent}
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table - Hidden on mobile */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader className="bg-[#1e3a8a]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[50px] text-white font-black text-[10px] uppercase text-center h-10 border-r border-white/10 px-1">No</TableHead>
                                    <TableHead className="text-white font-black text-[10px] uppercase h-10 border-r border-white/10 px-3">Nama Lengkap Siswa</TableHead>
                                    <TableHead className="text-center text-white font-black text-[10px] uppercase h-10 border-r border-white/10 px-1">NIS</TableHead>
                                    <TableHead className="text-center text-white font-black text-[10px] uppercase h-10 border-r border-white/10 px-1">Kelas</TableHead>
                                    <TableHead className="text-center text-white font-black text-[10px] uppercase h-10 px-1">Unduh Rapor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-400 font-medium italic">
                                            Data siswa belum tersedia atau rombel kosong.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentItems.map((siswa, index) => (
                                        <TableRow key={siswa.peserta_didik_id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                            <TableCell className="text-center font-bold text-slate-500 text-[11px] py-1.5">{indexOfFirstItem + index + 1}</TableCell>
                                            <TableCell className="font-bold text-[#1e3a8a] text-[11px] py-1.5 uppercase tracking-wide">{siswa.nm_siswa}</TableCell>
                                            <TableCell className="text-center text-slate-600 font-medium text-[11px] py-1.5">{siswa.nis}</TableCell>
                                            <TableCell className="text-center text-slate-600 font-medium text-[11px] py-1.5">{siswa.nm_kelas || '-'}</TableCell>
                                            <TableCell className="text-center py-1.5">
                                                <Button
                                                    onClick={() => handleGeneratePDF(siswa)}
                                                    size="sm"
                                                    className="bg-red-700 hover:bg-red-800 h-7 px-3 text-[10px] font-bold uppercase tracking-tighter"
                                                    disabled={generatingPdf === siswa.peserta_didik_id || generatingBulk}
                                                >
                                                    {generatingPdf === siswa.peserta_didik_id ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            ...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="h-3 w-3 mr-1" />
                                                            Cetak Nilai
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View - Hidden on desktop */}
                    <div className="md:hidden space-y-4">
                        {currentItems.length === 0 ? (
                            <Card>
                                <CardContent className="flex items-center justify-center py-8">
                                    <p className="text-sm text-muted-foreground">Tidak ada data siswa</p>
                                </CardContent>
                            </Card>
                        ) : (
                            currentItems.map((siswa, index) => (
                                <Card key={siswa.peserta_didik_id} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                                                {indexOfFirstItem + index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-base truncate">{siswa.nm_siswa}</h3>
                                                <p className="text-sm text-muted-foreground">NIS: {siswa.nis}</p>
                                                <p className="text-sm text-muted-foreground">Kelas: {siswa.nm_kelas || '-'}</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleGeneratePDF(siswa)}
                                            size="sm"
                                            variant="default"
                                            className="w-full bg-red-600 hover:bg-red-700"
                                            disabled={generatingPdf === siswa.peserta_didik_id || generatingBulk}
                                        >
                                            {generatingPdf === siswa.peserta_didik_id ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    Membuat PDF...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-3 w-3 mr-1" />
                                                    Cetak PDF
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                            <div className="text-sm text-muted-foreground text-center sm:text-left">
                                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, siswaList.length)} dari {siswaList.length} siswa
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className="h-8"
                                >
                                    Previous
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        const isMobileHidden = i > 0 && i < 4 && totalPages > 3;

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => paginate(pageNum)}
                                                className={`w-8 h-8 p-0 ${isMobileHidden ? 'hidden sm:inline-flex' : ''}`}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={nextPage}
                                    disabled={currentPage === totalPages}
                                    className="h-8"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Class Selection Modal */}
            <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih Kelas</DialogTitle>
                        <DialogDescription>
                            Pilih kelas yang ingin dicetak PDF Nilai Rapor untuk semua siswa dalam kelas tersebut.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="class-select">Kelas</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger id="class-select" className="mt-2">
                                <SelectValue placeholder="Pilih kelas..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClasses.map((kelas) => (
                                    <SelectItem key={kelas.rombongan_belajar_id} value={kelas.rombongan_belajar_id}>
                                        {kelas.nm_kelas}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClassModal(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleGenerateBulkPDFs} disabled={!selectedClass}>
                            <DownloadCloud className="mr-2 h-4 w-4" />
                            Generate PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Debug Logs Display */}
            <div className="flex justify-center mt-6">
                <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowDebug(true)}
                    className="text-xs text-muted-foreground underline decoration-dotted"
                >
                    Klik di sini jika PDF tidak terdownload (Fitur Debug)
                </Button>
            </div>

            <Dialog open={showDebug} onOpenChange={setShowDebug}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col sm:rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            PDF Debug Console
                        </DialogTitle>
                        <DialogDescription>
                            Log ini mencatat setiap langkah pembuatan PDF. Harap capture log ini jika unduhan gagal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-y-auto flex-1 space-y-1 my-4 border border-slate-800">
                        {debugLogs.length === 0 ? (
                            <p className="text-slate-500 italic">Belum ada log. Silakan coba generate PDF terlebih dahulu.</p>
                        ) : (
                            debugLogs.map((log, i) => (
                                <div key={i} className={
                                    log.includes('!!!') || log.includes('!!') ? 'text-red-400 font-bold' : 
                                    log.includes('===') ? 'text-green-400 font-bold border-b border-slate-800 pb-1 mt-2' : 
                                    log.includes('SUKSES') ? 'text-green-400 font-bold' : ''
                                }>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDebugLogs([])}>Bersihkan Log</Button>
                        <Button size="sm" onClick={() => setShowDebug(false)}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
