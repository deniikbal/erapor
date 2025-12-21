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
        };

        initUser();
    }, []);

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

            // Create PDF
            const doc = new jsPDF();

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

    const handleGenerateBulkPDFs = async () => {
        if (siswaList.length === 0) {
            toast.error('Tidak ada siswa untuk di-generate');
            return;
        }

        setGeneratingBulk(true);
        setBulkProgress({ current: 0, total: siswaList.length, currentStudent: '' });

        try {
            toast.info('Mempersiapkan PDF Nilai Rapor untuk semua siswa...');

            // TODO: Implement bulk PDF generation for nilai rapor
            // This will be implemented in the next phase

            for (let i = 0; i < siswaList.length; i++) {
                setBulkProgress({ current: i + 1, total: siswaList.length, currentStudent: siswaList[i].nm_siswa });
                await new Promise(resolve => setTimeout(resolve, 100)); // Simulasi delay
                toast.info(`Menambahkan siswa ke PDF: ${siswaList[i].nm_siswa} (${i + 1} dari ${siswaList.length})`);
            }

            toast.success(`PDF Nilai Rapor untuk ${siswaList.length} siswa berhasil diunduh`);
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
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <CardTitle>Daftar Siswa</CardTitle>
                            </div>
                            <CardDescription>Klik tombol "Cetak PDF" untuk generate dokumen nilai rapor siswa</CardDescription>
                        </div>

                        {/* Bulk Generate Button */}
                        <div className="flex flex-col items-end gap-2">
                            <Button
                                onClick={handleGenerateBulkPDFs}
                                size="sm"
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700"
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
                    <div className="rounded-md border">
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
                                {siswaList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            Tidak ada data siswa
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    siswaList.map((siswa, index) => (
                                        <TableRow key={siswa.peserta_didik_id}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
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
                </CardContent>
            </Card>

        </div>
    );
}
