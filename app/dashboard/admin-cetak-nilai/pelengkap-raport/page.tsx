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
import type { Siswa, User } from '@/lib/db';

import { FileText, Filter, Loader2, Download, DownloadCloud, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth-client';
import { jsPDF } from 'jspdf';
import { generateCoverPage } from '@/lib/pdf/coverPage';
import { generateSchoolInfoPage } from '@/lib/pdf/schoolInfoPage';
import { generateIdentityPage } from '@/lib/pdf/identityPage';
import { generateKeteranganPindahPage } from '@/lib/pdf/keteranganPindahPage';
import { generateKeteranganMasukPage } from '@/lib/pdf/keteranganMasukPage';
import { downloadBulkPDFs, generateSinglePDFWithAllStudents } from '@/lib/pdf/bulkPDFGenerator';

export default function AdminPelengkapRaportPage() {
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [generatingBulk, setGeneratingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentStudent: '' });

    // Margin settings - fixed defaults for admin
    const marginSettings = {
        margin_top: 20,
        margin_bottom: 15,
        margin_left: 20,
        margin_right: 20
    };

    // Class filter state
    const [selectedKelas, setSelectedKelas] = useState<string>('all');
    const [openCombobox, setOpenCombobox] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedKelas]);

    useEffect(() => {
        const initUser = async () => {
            const user = await getCurrentUser();
            if (!user) {
                setError('User tidak ditemukan. Silakan login kembali.');
                setLoading(false);
                return;
            }

            if (user.level !== 'Admin') {
                setError('Hanya admin yang dapat mengakses halaman ini');
                setLoading(false);
                return;
            }

            setCurrentUser(user);
            fetchSiswa();
            // Margin settings are now fixed defaults for admin
        };

        initUser();
    }, []);

    const fetchSiswa = async () => {
        try {
            // Fetch all students from regular classes (jenis_rombel 1 and 9)
            const response = await fetch('/api/siswa/reguler');
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

    // Natural sort helper
    const naturalSort = (a: string, b: string): number => {
        return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
    };

    // Get unique class list from siswaList with natural sort
    const kelasList = Array.from(new Set(siswaList.map(s => s.nm_kelas).filter(Boolean) as string[])).sort(naturalSort);

    // Filter siswa by selected class
    const filteredSiswa = selectedKelas === 'all'
        ? siswaList
        : siswaList.filter(s => s.nm_kelas === selectedKelas);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSiswa.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedSiswa = filteredSiswa.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleGeneratePDF = async (siswa: Siswa) => {
        setGeneratingPdf(siswa.peserta_didik_id);

        try {
            toast.info('Membuat PDF...');

            // Fetch logo data
            const logoResponse = await fetch('/api/logo');
            const logoData = await logoResponse.json();

            const logos = {
                logo_pemda: logoData.logo?.logo_pemda
                    ? `/${logoData.logo.logo_pemda}`
                    : null,
                logo_sek: logoData.logo?.logo_sek
                    ? `/${logoData.logo.logo_sek}`
                    : null
            };

            // Fetch school data
            const sekolahResponse = await fetch('/api/sekolah');
            const sekolahData = await sekolahResponse.json();

            if (!sekolahResponse.ok || sekolahData.error) {
                throw new Error('Gagal mengambil data sekolah');
            }

            // Create PDF instance
            const doc = new jsPDF();

            // Page 1: Cover Page
            await generateCoverPage(doc, {
                nm_siswa: siswa.nm_siswa,
                nis: siswa.nis,
                nisn: siswa.nisn
            }, logos, marginSettings);

            // Page 2: School Info Page
            doc.addPage();
            await generateSchoolInfoPage(doc, sekolahData.sekolah, marginSettings);

            // Page 3: Identity Page
            doc.addPage();
            await generateIdentityPage(doc, siswa, sekolahData.sekolah, marginSettings);

            // Page 4: Keterangan Pindah Page
            doc.addPage();
            await generateKeteranganPindahPage(doc, siswa, marginSettings);

            // Page 5: Keterangan Masuk Page
            doc.addPage();
            await generateKeteranganMasukPage(doc, siswa, marginSettings);

            // Save PDF
            const fileName = `Pelengkap_Siswa_${siswa.nm_siswa.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);

            toast.success(`PDF untuk ${siswa.nm_siswa} berhasil diunduh`);
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.error('Gagal generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setGeneratingPdf(null);
        }
    };

    const handleGenerateBulkPDFs = async () => {
        if (filteredSiswa.length === 0) {
            toast.error('Tidak ada siswa untuk di-generate');
            return;
        }

        setGeneratingBulk(true);
        setBulkProgress({ current: 0, total: filteredSiswa.length, currentStudent: '' });

        try {
            toast.info('Mempersiapkan PDF untuk semua siswa...');

            // Fetch logo data
            const logoResponse = await fetch('/api/logo');
            const logoData = await logoResponse.json();

            const logos = {
                logo_pemda: logoData.logo?.logo_pemda
                    ? `/${logoData.logo.logo_pemda}`
                    : null,
                logo_sek: logoData.logo?.logo_sek
                    ? `/${logoData.logo.logo_sek}`
                    : null
            };

            // Fetch school data
            const sekolahResponse = await fetch('/api/sekolah');
            const sekolahData = await sekolahResponse.json();

            if (!sekolahResponse.ok || sekolahData.error) {
                throw new Error('Gagal mengambil data sekolah');
            }

            // Generate single PDF for filtered students
            await generateSinglePDFWithAllStudents(
                filteredSiswa,
                sekolahData.sekolah,
                logos,
                marginSettings,
                (current: number, total: number, currentStudentName?: string) => {
                    setBulkProgress({ current, total, currentStudent: currentStudentName || '' });
                    toast.info(`Menambahkan siswa ke PDF: ${currentStudentName || ''} (${current} dari ${total})`);
                }
            );

            toast.success(`PDF untuk ${filteredSiswa.length} siswa berhasil diunduh`);
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
                    <h1 className="text-3xl font-bold tracking-tight">Pelengkap Raport</h1>
                    <p className="text-muted-foreground">Generate PDF identitas siswa (Semua Kelas Reguler)</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Pelengkap Raport</h1>
                    <p className="text-muted-foreground">Generate PDF identitas siswa</p>
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
                        Cetak Pelengkap Raport
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] ml-3 italic">
                    Generate PDF identitas siswa - Semua Kelas Reguler ({filteredSiswa.length} dari {siswaList.length} siswa)
                </p>
            </div>

            {/* Class Filter Card */}
            <Card className="rounded-sm shadow-sm border border-blue-100">
                <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#1e3a8a]" />
                        <CardTitle className="text-sm font-bold text-[#1e3a8a]">Filter Kelas</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="py-3 px-4">
                    <div className="space-y-3">
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="h-9 w-full justify-between text-sm font-bold text-[#1e3a8a] bg-slate-50 border-blue-100"
                                >
                                    {selectedKelas === 'all'
                                        ? 'Pilih Kelas ......'
                                        : kelasList.find(kelas => kelas === selectedKelas)
                                            ? `${selectedKelas} (${siswaList.filter(s => s.nm_kelas === selectedKelas).length} siswa)`
                                            : 'Pilih Kelas ......'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start" avoidCollisions={false} sideOffset={4}>
                                <Command>
                                    <CommandInput placeholder="Cari kelas..." />
                                    <CommandList>
                                        <CommandEmpty>Kelas tidak ditemukan.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setSelectedKelas('all');
                                                    setOpenCombobox(false);
                                                }}
                                            >
                                                <Check
                                                    className={`mr-2 h-4 w-4 ${selectedKelas === 'all' ? 'opacity-100' : 'opacity-0'}`}
                                                />
                                                Pilih Kelas ......
                                            </CommandItem>
                                            {kelasList.map(kelas => {
                                                const count = siswaList.filter(s => s.nm_kelas === kelas).length;
                                                return (
                                                    <CommandItem
                                                        key={kelas}
                                                        value={kelas}
                                                        onSelect={() => {
                                                            setSelectedKelas(kelas);
                                                            setOpenCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${selectedKelas === kelas ? 'opacity-100' : 'opacity-0'}`}
                                                        />
                                                        {kelas} ({count} siswa)
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {/* Instruction Card - Show when no class selected */}
            {selectedKelas === 'all' && (
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardContent className="py-3">
                        <p className="text-[11px] text-[#1e3a8a] font-medium flex items-center gap-2">
                            <span className="text-base text-indigo-500">📌</span>
                            <span>Silakan pilih kelas terlebih dahulu untuk menampilkan daftar siswa</span>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Student List Card - Only show when a class is selected */}
            {selectedKelas !== 'all' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <CardTitle>Daftar Siswa</CardTitle>
                                </div>
                                <CardDescription>Klik tombol "Cetak PDF" untuk generate dokumen identitas siswa</CardDescription>
                            </div>

                            {/* Bulk Generate Button */}
                            <div className="flex flex-col items-end gap-2">
                                <Button
                                    onClick={handleGenerateBulkPDFs}
                                    size="sm"
                                    variant="default"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={generatingBulk || filteredSiswa.length === 0}
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
                    <CardContent className="pt-4">
                        <div className="rounded-md border mt-2">
                            <Table>
                                <TableHeader className="bg-[#1e3a8a]">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="text-white font-bold w-[50px] border-r border-white/10 text-center uppercase text-[10px] py-1.5 px-2">No</TableHead>
                                        <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3">Nama Lengkap</TableHead>
                                        <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3">NIS</TableHead>
                                        <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[10px] py-1.5 px-3 text-center">Kelas</TableHead>
                                        <TableHead className="text-white font-bold w-[120px] text-right uppercase text-[10px] py-1.5 px-3">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSiswa.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                Tidak ada data siswa
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedSiswa.map((siswa, index) => (
                                            <TableRow key={siswa.peserta_didik_id} className="hover:bg-slate-50/50">
                                                <TableCell className="py-1.5 text-xs font-bold text-slate-500 text-center border-r">
                                                    {startIndex + index + 1}
                                                </TableCell>
                                                <TableCell className="py-1.5 font-bold text-sm text-[#1e3a8a] border-r">{siswa.nm_siswa}</TableCell>
                                                <TableCell className="py-1.5 text-xs font-medium text-slate-600 border-r">{siswa.nis}</TableCell>
                                                <TableCell className="py-1.5 text-xs font-bold text-indigo-600 text-center border-r">{siswa.nm_kelas || '-'}</TableCell>
                                                <TableCell className="text-right py-1 px-3">
                                                    <Button
                                                        onClick={() => handleGeneratePDF(siswa)}
                                                        size="sm"
                                                        className="h-7 px-3 bg-[#1e3a8a] hover:bg-indigo-900 text-white text-[10px] font-bold shadow-sm"
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
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Menampilkan {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredSiswa.length)} dari {filteredSiswa.length} data
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
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
                                                        onClick={() => handlePageChange(page)}
                                                        className={currentPage === page ? "bg-[#1e3a8a] hover:bg-indigo-900" : "h-8 w-8 text-xs"}
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
                                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>
            )}
        </div >
    );
}
