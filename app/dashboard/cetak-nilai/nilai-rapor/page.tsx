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
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [generatingBulk, setGeneratingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentStudent: '' });

    // Margin settings state
    const [marginSettings, setMarginSettings] = useState({
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 20,
        margin_right: 20
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
                    margin_right: Number(data.data.margin_right) || 20
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

        try {
            toast.info('Membuat PDF Nilai Rapor...');

            // Dynamic import jsPDF
            const { jsPDF } = await import('jspdf');
            const { generateNilaiRaporHeader } = await import('@/lib/pdf/nilaiRaporPage');
            const { getFaseByTingkat, calculatePredikat } = await import('@/lib/pdf/nilaiRaporTable');

            // Fetch additional data
            const [sekolahRes, kelasRes] = await Promise.all([
                fetch('/api/sekolah'),
                fetch('/api/siswa/by-wali-kelas?ptk_id=' + currentUser?.ptk_id)
            ]);

            const sekolahData = await sekolahRes.json();

            if (!sekolahRes.ok || sekolahData.error) {
                throw new Error('Gagal mengambil data sekolah');
            }

            // Get semester info from siswa.nm_kelas or default
            const fase = siswa.tingkat_pendidikan_id ? getFaseByTingkat(siswa.tingkat_pendidikan_id) : 'E';

            // Create PDF with compression enabled and optimizations
            const doc = new jsPDF({
                compress: true,
                putOnlyUsedFonts: true,
                floatPrecision: 2 // Reduce precision for smaller file size
            });

            // Load fonts once at the beginning
            const { loadDejaVuFonts } = await import('@/lib/pdf/fontLoader');
            await loadDejaVuFonts(doc);

            // Header with student info
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
                    nama_semester: '2025/2026 Ganjil',
                    tahun_ajaran_id: '2025'
                },
                kelas: siswa.nm_kelas || 'X MERDEKA 5',
                fase: fase
            };

            const yAfterHeader = await generateNilaiRaporHeader(doc, headerInfo, marginSettings);

            // Import table generator
            const { generateNilaiRaporTable } = await import('@/lib/pdf/nilaiRaporTable');

            // Fetch mata pelajaran dari database
            toast.info('Mengambil data mata pelajaran...');

            const mapelResponse = await fetch(
                `/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`
            );

            if (!mapelResponse.ok) {
                throw new Error('Gagal mengambil data mata pelajaran');
            }

            const mapelData = await mapelResponse.json();

            if (!mapelData.success || !mapelData.kelompok) {
                throw new Error('Data mata pelajaran tidak valid');
            }

            // Use real data from database (nilai already included from API)
            const kelompokData = mapelData.kelompok;

            toast.success(`Data ${mapelData.total_mapel} mata pelajaran berhasil dimuat`);

            let yAfterTable = await generateNilaiRaporTable(doc, yAfterHeader, kelompokData, marginSettings);

            // Generate Kokurikuler table if data exists
            if (mapelData.kokurikuler) {
                const { generateKokurikulerTable } = await import('@/lib/pdf/kokurikulerTable');

                // Add some spacing before kokurikuler
                yAfterTable += 5;

                yAfterTable = await generateKokurikulerTable(
                    doc,
                    yAfterTable,
                    mapelData.kokurikuler,
                    marginSettings
                );
            }

            // Generate Ekstrakurikuler table if data exists
            if (mapelData.ekstrakurikuler && mapelData.ekstrakurikuler.length > 0) {
                const { generateEkstrakurikulerTable } = await import('@/lib/pdf/ekstrakurikulerTable');

                // Add some spacing before ekstrakurikuler
                yAfterTable += 5;

                yAfterTable = await generateEkstrakurikulerTable(
                    doc,
                    yAfterTable,
                    mapelData.ekstrakurikuler,
                    marginSettings
                );
            }

            // Generate Ketidakhadiran (Attendance) table and Catatan Wali Kelas side by side
            toast.info('Mengambil data kehadiran dan catatan wali...');

            const [kehadiranResponse, catatanWaliResponse] = await Promise.all([
                fetch(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`),
                fetch(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}`)
            ]);

            const kehadiranData = await kehadiranResponse.json();
            const catatanWaliData = await catatanWaliResponse.json();

            if (kehadiranResponse.ok && kehadiranData) {
                const { generateKetidakhadiranTable } = await import('@/lib/pdf/ketidakhadiranTable');
                const { generateCatatanWaliTable } = await import('@/lib/pdf/catatanWaliTable');

                // Add some spacing before tables
                yAfterTable += 5;

                // Calculate total height needed for both tables (header + content)
                const kehadiranHeaderHeight = 9;
                const kehadiranRowHeight = 6;
                const kehadiranTotalHeight = kehadiranHeaderHeight + (kehadiranRowHeight * 3); // header + 3 rows

                // Check if tables fit on current page, if not add page BEFORE generating either table
                const pageHeight = doc.internal.pageSize.getHeight();
                if (yAfterTable + kehadiranTotalHeight > pageHeight - marginSettings.margin_bottom) {
                    doc.addPage();

                    // Reserve space for student header info
                    const studentHeaderHeight = 21;
                    yAfterTable = marginSettings.margin_top + studentHeaderHeight;
                }

                // Save starting Y position for both tables (now guaranteed to be on same page)
                const tablesStartY = yAfterTable;

                // Generate attendance table (left side, 53mm wide)
                const kehadiranEndY = await generateKetidakhadiranTable(
                    doc,
                    tablesStartY,
                    kehadiranData,
                    marginSettings
                );

                // Generate catatan wali table (right side, 112mm wide)
                // X position: margin_left + 53mm (kehadiran width) + 5mm (gap)
                const catatanWaliX = marginSettings.margin_left + 53 + 5;
                const catatanWaliEndY = await generateCatatanWaliTable(
                    doc,
                    tablesStartY,
                    catatanWaliX,
                    catatanWaliResponse.ok ? catatanWaliData : null,
                    marginSettings
                );

                // Update yAfterTable to the maximum of both table end positions
                yAfterTable = Math.max(kehadiranEndY, catatanWaliEndY);
            }

            // Generate Tanggapan Orang Tua/Wali Murid table (empty table below)
            const { generateTanggapanOrtuTable } = await import('@/lib/pdf/tanggapanOrtuTable');

            // Add some spacing before tanggapan ortu table
            yAfterTable += 5;

            yAfterTable = await generateTanggapanOrtuTable(doc, yAfterTable, marginSettings);

            // Generate Signature Section
            const { generateSignatureSection } = await import('@/lib/pdf/signatureSection');

            // Add spacing before signature section
            yAfterTable += 5;

            // Fetch tanggal rapor data
            const tanggalRaporResponse = await fetch('/api/tanggalrapor');
            const tanggalRaporData = await tanggalRaporResponse.json();

            // Fetch teacher (wali kelas) data from class relation
            // Teacher info is associated with the class (rombongan_belajar_id)
            const walasResponse = await fetch(`/api/kelas`);
            const walasData = await walasResponse.json();

            // Find the teacher for this student's class
            const studentClass = walasData.kelas?.find((k: any) => k.nm_kelas === siswa.nm_kelas);

            // Fetch guru data to get gelar (title) from tabel_ptk_pelengkap
            let namaWaliKelasWithGelar = studentClass?.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';

            if (studentClass?.ptk_id) {
                const guruResponse = await fetch('/api/guru');
                const guruData = await guruResponse.json();

                // Find the teacher in guru list
                const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);

                if (guruInfo) {
                    // Format name with gelar: gelar_depan + nama + gelar_belakang
                    const gelarDepan = guruInfo.gelar_depan || '';
                    const gelarBelakang = guruInfo.gelar_belakang || '';
                    const nama = guruInfo.nm_ptk || studentClass.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';

                    namaWaliKelasWithGelar = [gelarDepan, nama, gelarBelakang]
                        .filter(part => part && part.trim())
                        .join(' ');
                }
            }

            // Prepare signature data from database
            // Format tanggal from ISO to Indonesian format (e.g., "22 Desember 2025")
            const formatTanggalIndonesia = (isoDate: string): string => {
                const date = new Date(isoDate);
                const bulanIndonesia = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];

                const tanggal = date.getDate();
                const bulan = bulanIndonesia[date.getMonth()];
                const tahun = date.getFullYear();

                return `${tanggal} ${bulan} ${tahun}`;
            };

            const tanggalRaw = tanggalRaporData.data?.[0]?.tanggal;
            const tanggalFormatted = tanggalRaw ? formatTanggalIndonesia(tanggalRaw) : '22 Desember 2025';

            const signatureData = {
                tempat: tanggalRaporData.data?.[0]?.tempat_ttd || 'Bantarujeg',
                tanggal: tanggalFormatted,
                namaWaliKelas: namaWaliKelasWithGelar,
                nipWaliKelas: studentClass?.nip_wali_kelas ? `NIP ${studentClass.nip_wali_kelas}` : '',
                namaKepalaSekolah: sekolahData.sekolah?.nm_kepsek || 'Kepala Sekolah',
                nipKepalaSekolah: sekolahData.sekolah?.nip_kepsek ? `NIP ${sekolahData.sekolah.nip_kepsek}` : ''
            };

            yAfterTable = await generateSignatureSection(doc, yAfterTable, signatureData, marginSettings);

            // Import footer and header info generators
            const { generateNilaiRaporFooter } = await import('@/lib/pdf/nilaiRaporFooter');
            const { generateStudentHeaderInfo } = await import('@/lib/pdf/studentHeaderInfo');

            // Prepare student header info
            const studentHeaderInfo = {
                nm_siswa: siswa.nm_siswa,
                nm_kelas: siswa.nm_kelas || '-',
                nis: siswa.nis || '-',
                nisn: siswa.nisn || '-',
                fase: headerInfo.fase || 'E',
                nama_sekolah: headerInfo.school.nama,
                alamat_sekolah: headerInfo.school.alamat,
                // Same logic as page 1 (nilaiRaporPage.ts line 98)
                semester: headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2',
                // Same logic as page 1 (nilaiRaporPage.ts line 115)
                tahun_ajaran: `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`
            };

            // Add student header and footer to all pages
            const totalPages = doc.getNumberOfPages();

            // First pass: Add student header info to pages 2+ and shift content down
            for (let i = 2; i <= totalPages; i++) {
                doc.setPage(i);

                // Get all existing content positions on this page
                // We'll add header at top and need to shift table content down
                const headerHeight = await generateStudentHeaderInfo(
                    doc,
                    marginSettings.margin_top,
                    studentHeaderInfo,
                    marginSettings
                );

                // Note: Table content was already drawn at margin_top
                // We need to shift it down by headerHeight
                // This is done by the table generation functions which will be updated
            }

            // Second pass: Add footer to all pages
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                generateNilaiRaporFooter(doc, {
                    nm_kelas: siswa.nm_kelas || '-',
                    nm_siswa: siswa.nm_siswa,
                    nis: siswa.nis || '-',
                    pageNumber: i
                }, marginSettings);
            }

            // Save PDF
            const fileName = `Nilai_Rapor_${siswa.nm_siswa.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);

            toast.success(`PDF Nilai Rapor untuk ${siswa.nm_siswa} berhasil diunduh`);
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.error('Gagal generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
        // Close modal
        setShowClassModal(false);

        // Filter students by selected class
        const selectedClassData = availableClasses.find(k => k.rombongan_belajar_id === selectedClass);
        const filteredSiswa = siswaList.filter(s => s.nm_kelas === selectedClassData?.nm_kelas);

        if (filteredSiswa.length === 0) {
            toast.error('Tidak ada siswa di kelas yang dipilih');
            return;
        }

        setGeneratingBulk(true);
        setBulkProgress({ current: 0, total: filteredSiswa.length, currentStudent: '' });

        try {
            toast.info('Mempersiapkan PDF Nilai Rapor untuk semua siswa...');

            // Dynamic import jsPDF
            const { jsPDF } = await import('jspdf');
            const { generateNilaiRaporHeader } = await import('@/lib/pdf/nilaiRaporPage');
            const { getFaseByTingkat } = await import('@/lib/pdf/nilaiRaporTable');
            const { generateNilaiRaporTable } = await import('@/lib/pdf/nilaiRaporTable');
            const { generateKokurikulerTable } = await import('@/lib/pdf/kokurikulerTable');
            const { generateEkstrakurikulerTable } = await import('@/lib/pdf/ekstrakurikulerTable');
            const { generateKetidakhadiranTable } = await import('@/lib/pdf/ketidakhadiranTable');
            const { generateCatatanWaliTable } = await import('@/lib/pdf/catatanWaliTable');
            const { generateTanggapanOrtuTable } = await import('@/lib/pdf/tanggapanOrtuTable');
            const { generateSignatureSection } = await import('@/lib/pdf/signatureSection');
            const { generateNilaiRaporFooter } = await import('@/lib/pdf/nilaiRaporFooter');
            const { generateStudentHeaderInfo } = await import('@/lib/pdf/studentHeaderInfo');

            // Fetch common data once for all students
            toast.info('Mengambil data umum...');
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

            if (!sekolahRes.ok || sekolahData.error) {
                throw new Error('Gagal mengambil data sekolah');
            }

            // Create single PDF document for all students
            // Create PDF with compression enabled and optimizations
            const doc = new jsPDF({
                compress: true,
                putOnlyUsedFonts: true,
                floatPrecision: 2 // Reduce precision for smaller file size
            });

            // Load fonts once at the beginning for bulk generation
            const { loadDejaVuFonts } = await import('@/lib/pdf/fontLoader');
            await loadDejaVuFonts(doc);
            let isFirstStudent = true;
            const failedStudents: string[] = [];

            // Loop through filtered students
            for (let studentIndex = 0; studentIndex < filteredSiswa.length; studentIndex++) {
                const siswa = filteredSiswa[studentIndex];

                try {
                    setBulkProgress({
                        current: studentIndex + 1,
                        total: filteredSiswa.length,
                        currentStudent: siswa.nm_siswa
                    });

                    // Show toast every 5 students or for first/last student
                    if (studentIndex === 0 || studentIndex === filteredSiswa.length - 1 || (studentIndex + 1) % 5 === 0) {
                        toast.info(`Membuat PDF untuk: ${siswa.nm_siswa} (${studentIndex + 1}/${filteredSiswa.length})`);
                    }


                    // Add page break before each student (except first)
                    if (!isFirstStudent) {
                        doc.addPage();
                    }
                    isFirstStudent = false;

                    // Track starting page for this student (AFTER addPage)
                    const studentStartPage = doc.getNumberOfPages();

                    // Get fase for this student
                    const fase = siswa.tingkat_pendidikan_id ? getFaseByTingkat(siswa.tingkat_pendidikan_id) : 'E';

                    // Header with student info
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
                            nama_semester: '2025/2026 Ganjil',
                            tahun_ajaran_id: '2025'
                        },
                        kelas: siswa.nm_kelas || 'X MERDEKA 5',
                        fase: fase
                    };

                    let yAfterHeader = await generateNilaiRaporHeader(doc, headerInfo, marginSettings);

                    // Fetch student-specific data (parallel)
                    const [mapelRes, kehadiranRes, catatanWaliRes] = await Promise.all([
                        fetch(`/api/nilai/mapel-kelompok?peserta_didik_id=${siswa.peserta_didik_id}&tingkat=${siswa.tingkat_pendidikan_id || '10'}`),
                        fetch(`/api/kehadiran?peserta_didik_id=${siswa.peserta_didik_id}`),
                        fetch(`/api/catatan-wali?peserta_didik_id=${siswa.peserta_didik_id}`)
                    ]);

                    if (!mapelRes.ok) {
                        throw new Error('Gagal mengambil data mata pelajaran');
                    }

                    // Parse JSON in parallel
                    const [mapelData, kehadiranData, catatanWaliData] = await Promise.all([
                        mapelRes.json(),
                        kehadiranRes.json(),
                        catatanWaliRes.json()
                    ]);

                    if (!mapelData.success || !mapelData.kelompok) {
                        throw new Error('Data mata pelajaran tidak valid');
                    }

                    // Generate tables
                    let yAfterTable = await generateNilaiRaporTable(doc, yAfterHeader, mapelData.kelompok, marginSettings);

                    // Kokurikuler
                    if (mapelData.kokurikuler) {
                        yAfterTable += 5;
                        yAfterTable = await generateKokurikulerTable(doc, yAfterTable, mapelData.kokurikuler, marginSettings);
                    }

                    // Ekstrakurikuler
                    if (mapelData.ekstrakurikuler && mapelData.ekstrakurikuler.length > 0) {
                        yAfterTable += 5;
                        yAfterTable = await generateEkstrakurikulerTable(doc, yAfterTable, mapelData.ekstrakurikuler, marginSettings);
                    }

                    // Kehadiran & Catatan Wali (side by side)
                    if (kehadiranRes.ok && kehadiranData) {
                        yAfterTable += 5;

                        const kehadiranHeaderHeight = 9;
                        const kehadiranRowHeight = 6;
                        const kehadiranTotalHeight = kehadiranHeaderHeight + (kehadiranRowHeight * 3);
                        const pageHeight = doc.internal.pageSize.getHeight();

                        if (yAfterTable + kehadiranTotalHeight > pageHeight - marginSettings.margin_bottom) {
                            doc.addPage();
                            const studentHeaderHeight = 21;
                            yAfterTable = marginSettings.margin_top + studentHeaderHeight;
                        }

                        const tablesStartY = yAfterTable;
                        const kehadiranEndY = await generateKetidakhadiranTable(doc, tablesStartY, kehadiranData, marginSettings);
                        const catatanWaliX = marginSettings.margin_left + 53 + 5;
                        const catatanWaliEndY = await generateCatatanWaliTable(doc, tablesStartY, catatanWaliX, catatanWaliRes.ok ? catatanWaliData : null, marginSettings);
                        yAfterTable = Math.max(kehadiranEndY, catatanWaliEndY);
                    }

                    // Tanggapan Orang Tua
                    yAfterTable += 5;
                    yAfterTable = await generateTanggapanOrtuTable(doc, yAfterTable, marginSettings);

                    // Signature section
                    yAfterTable += 5;

                    // Format tanggal
                    const formatTanggalIndonesia = (isoDate: string): string => {
                        const date = new Date(isoDate);
                        const bulanIndonesia = [
                            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                        ];
                        const tanggal = date.getDate();
                        const bulan = bulanIndonesia[date.getMonth()];
                        const tahun = date.getFullYear();
                        return `${tanggal} ${bulan} ${tahun}`;
                    };

                    const studentClass = kelasData.kelas?.find((k: any) => k.nm_kelas === siswa.nm_kelas);
                    let namaWaliKelasWithGelar = studentClass?.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';

                    if (studentClass?.ptk_id) {
                        const guruInfo = guruData.guru?.find((g: any) => g.ptk_id === studentClass.ptk_id);
                        if (guruInfo) {
                            const gelarDepan = guruInfo.gelar_depan || '';
                            const gelarBelakang = guruInfo.gelar_belakang || '';
                            const nama = guruInfo.nm_ptk || studentClass.nama_wali_kelas || currentUser?.nama || 'Wali Kelas';
                            namaWaliKelasWithGelar = [gelarDepan, nama, gelarBelakang]
                                .filter(part => part && part.trim())
                                .join(' ');
                        }
                    }

                    const tanggalRaw = tanggalRaporData.data?.[0]?.tanggal;
                    const tanggalFormatted = tanggalRaw ? formatTanggalIndonesia(tanggalRaw) : '22 Desember 2025';

                    const signatureData = {
                        tempat: tanggalRaporData.data?.[0]?.tempat_ttd || 'Bantarujeg',
                        tanggal: tanggalFormatted,
                        namaWaliKelas: namaWaliKelasWithGelar,
                        nipWaliKelas: studentClass?.nip_wali_kelas ? `NIP ${studentClass.nip_wali_kelas}` : '',
                        namaKepalaSekolah: sekolahData.sekolah?.nm_kepsek || 'Kepala Sekolah',
                        nipKepalaSekolah: sekolahData.sekolah?.nip_kepsek ? `NIP ${sekolahData.sekolah.nip_kepsek}` : ''
                    };

                    yAfterTable = await generateSignatureSection(doc, yAfterTable, signatureData, marginSettings);

                    // Add headers and footers for this student's pages
                    const studentHeaderInfo = {
                        nm_siswa: siswa.nm_siswa,
                        nm_kelas: siswa.nm_kelas || '-',
                        nis: siswa.nis || '-',
                        nisn: siswa.nisn || '-',
                        fase: fase,
                        nama_sekolah: headerInfo.school.nama,
                        alamat_sekolah: headerInfo.school.alamat,
                        semester: headerInfo.semester.nama_semester.includes('Ganjil') ? '1' : '2',
                        tahun_ajaran: `${headerInfo.semester.tahun_ajaran_id}/${parseInt(headerInfo.semester.tahun_ajaran_id) + 1}`
                    };

                    // Calculate page range for this student
                    const studentEndPage = doc.getNumberOfPages();

                    // Add student header to pages 2+ for this student only
                    for (let pageIdx = studentStartPage + 1; pageIdx <= studentEndPage; pageIdx++) {
                        doc.setPage(pageIdx);
                        await generateStudentHeaderInfo(doc, marginSettings.margin_top, studentHeaderInfo, marginSettings);
                    }

                    // Add footer to all pages for this student only
                    let pageNumberInStudent = 1;
                    for (let pageIdx = studentStartPage; pageIdx <= studentEndPage; pageIdx++) {
                        doc.setPage(pageIdx);
                        generateNilaiRaporFooter(doc, {
                            nm_kelas: siswa.nm_kelas || '-',
                            nm_siswa: siswa.nm_siswa,
                            nis: siswa.nis || '-',
                            pageNumber: pageNumberInStudent
                        }, marginSettings);
                        pageNumberInStudent++;
                    }

                } catch (err) {
                    console.error(`Error generating PDF for ${siswa.nm_siswa}:`, err);
                    failedStudents.push(siswa.nm_siswa);
                    toast.error(`Gagal membuat PDF untuk ${siswa.nm_siswa}`);
                    // Continue with next student
                }
            }

            // Save the combined PDF
            const kelasName = filteredSiswa[0]?.nm_kelas?.replace(/\s+/g, '_') || 'Kelas';
            const fileName = `Nilai_Rapor_${kelasName}_Semua_Siswa.pdf`;
            doc.save(fileName);

            // Show summary
            if (failedStudents.length > 0) {
                toast.warning(`PDF berhasil dibuat untuk ${filteredSiswa.length - failedStudents.length} siswa. Gagal: ${failedStudents.join(', ')}`);
            } else {
                toast.success(`PDF Nilai Rapor untuk ${filteredSiswa.length} siswa berhasil diunduh!`);
            }
        } catch (err) {
            console.error('Error generating bulk PDFs:', err);
            toast.error('Gagal generate PDF massal: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nilai Rapor</h1>
                <p className="text-muted-foreground">
                    Generate PDF nilai rapor siswa ({siswaList.length} siswa)
                </p>
            </div>

            {/* Margin Settings Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-primary" />
                        <CardTitle>Pengaturan Margin PDF</CardTitle>
                    </div>
                    <CardDescription>Atur margin untuk dokumen PDF (dalam mm)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="margin_top">Margin Atas (mm)</Label>
                            <Input
                                id="margin_top"
                                type="number"
                                step="0.1"
                                value={marginSettings.margin_top}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_top: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="margin_bottom">Margin Bawah (mm)</Label>
                            <Input
                                id="margin_bottom"
                                type="number"
                                step="0.1"
                                value={marginSettings.margin_bottom}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_bottom: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="margin_left">Margin Kiri (mm)</Label>
                            <Input
                                id="margin_left"
                                type="number"
                                step="0.1"
                                value={marginSettings.margin_left}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_left: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="margin_right">Margin Kanan (mm)</Label>
                            <Input
                                id="margin_right"
                                type="number"
                                step="0.1"
                                value={marginSettings.margin_right}
                                onChange={(e) => setMarginSettings({ ...marginSettings, margin_right: parseFloat(e.target.value) || 0 })}
                                disabled={savingMargin}
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <Button onClick={handleSaveMargin} disabled={savingMargin}>
                            {savingMargin ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Pengaturan'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Student List Card */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <CardTitle>Daftar Siswa</CardTitle>
                            </div>
                            <CardDescription>Klik tombol "Cetak PDF" untuk generate dokumen nilai rapor siswa</CardDescription>
                        </div>

                        {/* Bulk Generate Button */}
                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                            <Button
                                onClick={handleOpenBulkModal}
                                size="sm"
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                disabled={generatingBulk || siswaList.length === 0}
                            >
                                {generatingBulk ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Membuat ({bulkProgress.current} dari {bulkProgress.total})
                                    </>
                                ) : (
                                    <>
                                        <DownloadCloud className="h-4 w-4 mr-2" />
                                        Cetak PDF Semua Siswa
                                    </>
                                )}
                            </Button>
                            {generatingBulk && bulkProgress.total > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    Membuat PDF untuk: {bulkProgress.currentStudent || 'Memulai...'}
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table - Hidden on mobile */}
                    <div className="hidden md:block rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">No</TableHead>
                                    <TableHead>Nama Lengkap</TableHead>
                                    <TableHead>NIS</TableHead>
                                    <TableHead>Kelas</TableHead>
                                    <TableHead className="text-right w-[150px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            Tidak ada data siswa
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentItems.map((siswa, index) => (
                                        <TableRow key={siswa.peserta_didik_id}>
                                            <TableCell className="font-medium">{indexOfFirstItem + index + 1}</TableCell>
                                            <TableCell className="font-medium">{siswa.nm_siswa}</TableCell>
                                            <TableCell>{siswa.nis}</TableCell>
                                            <TableCell>{siswa.nm_kelas || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    onClick={() => handleGeneratePDF(siswa)}
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-red-600 hover:bg-red-700"
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

        </div>
    );
}
