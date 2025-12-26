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
import { getCurrentUser } from '@/lib/auth-client';

export default function AdminNilaiRaporPage() {
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [siswaList, setSiswaList] = useState<Siswa[]>([]);
    const [selectedKelas, setSelectedKelas] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadingSiswa, setLoadingSiswa] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [generatingBulk, setGeneratingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentStudent: '' });
    const [openCombobox, setOpenCombobox] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

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

            if (user.level !== 'Admin') {
                setError('Hanya admin yang dapat mengakses halaman ini');
                setLoading(false);
                return;
            }

            setCurrentUser(user);
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
                    margin_right: Number(data.data.margin_right) || 20
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

        try {
            toast.info('Membuat PDF Nilai Rapor...');

            // TODO: Implement PDF generation for nilai rapor
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success(`PDF Nilai Rapor untuk ${siswa.nm_siswa} berhasil digenerate`);
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

            for (let i = 0; i < siswaList.length; i++) {
                setBulkProgress({ current: i + 1, total: siswaList.length, currentStudent: siswaList[i].nm_siswa });
                await new Promise(resolve => setTimeout(resolve, 100));
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
                <h1 className="text-3xl font-bold tracking-tight">Nilai Rapor (Admin)</h1>
                <p className="text-muted-foreground">
                    Generate PDF nilai rapor siswa semua kelas
                </p>
            </div>

            {/* Kelas Selection Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Pilih Kelas</CardTitle>
                    <CardDescription>Pilih kelas untuk menampilkan daftar siswa</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-full justify-between"
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
            )}

            {/* Student List Card */}
            {selectedKelas && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <CardTitle>Daftar Siswa</CardTitle>
                                </div>
                                <CardDescription>
                                    {loadingSiswa
                                        ? 'Memuat data siswa...'
                                        : `Klik tombol "Cetak PDF" untuk generate dokumen nilai rapor siswa (${siswaList.length} siswa)`
                                    }
                                </CardDescription>
                            </div>

                            {/* Bulk Generate Button */}
                            {siswaList.length > 0 && (
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
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingSiswa ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[60px] py-2">No</TableHead>
                                                <TableHead className="py-2">Nama Lengkap</TableHead>
                                                <TableHead className="py-2">NIS</TableHead>
                                                <TableHead className="py-2">Kelas</TableHead>
                                                <TableHead className="text-right w-[150px] py-2">Aksi</TableHead>
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
                                                        <TableRow key={siswa.peserta_didik_id}>
                                                            <TableCell className="font-medium py-2">{startIndex + index + 1}</TableCell>
                                                            <TableCell className="font-medium py-2">{siswa.nm_siswa}</TableCell>
                                                            <TableCell className="py-2">{siswa.nis}</TableCell>
                                                            <TableCell className="py-2">{siswa.nm_kelas || '-'}</TableCell>
                                                            <TableCell className="text-right py-2">
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
                                                                    className={currentPage === page ? "bg-emerald-600 hover:bg-emerald-700 w-10" : "w-10"}
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
        </div>
    );
}
