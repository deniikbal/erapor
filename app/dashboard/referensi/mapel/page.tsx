'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Save, X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface Mapel {
    mata_pelajaran_id: string;
    nm_mapel: string;
    nm_ringkas: string;
}

export default function DataMapelPage() {
    const [mapelList, setMapelList] = useState<Mapel[]>([]);
    const [loading, setLoading] = useState(true);
    const [editDialog, setEditDialog] = useState(false);
    const [editingMapel, setEditingMapel] = useState<Mapel | null>(null);
    const [formData, setFormData] = useState({
        nm_mapel: '',
        nm_ringkas: ''
    });
    const [saving, setSaving] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchMapel();
    }, []);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const fetchMapel = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/mapel');
            const data = await res.json();

            if (res.ok) {
                setMapelList(data.mapel || []);
            } else {
                toast.error('Gagal memuat data mapel');
            }
        } catch (error) {
            console.error('Error fetching mapel:', error);
            toast.error('Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (mapel: Mapel) => {
        setEditingMapel(mapel);
        setFormData({
            nm_mapel: mapel.nm_mapel || '',
            nm_ringkas: mapel.nm_ringkas || ''
        });
        setEditDialog(true);
    };

    const handleSave = async () => {
        if (!editingMapel) return;

        try {
            setSaving(true);
            const res = await fetch('/api/mapel', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mata_pelajaran_id: editingMapel.mata_pelajaran_id,
                    nm_mapel: formData.nm_mapel,
                    nm_ringkas: formData.nm_ringkas
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Data mapel berhasil diupdate');
                setEditDialog(false);
                fetchMapel();
            } else {
                toast.error(data.error || 'Gagal mengupdate data');
            }
        } catch (error) {
            console.error('Error updating mapel:', error);
            toast.error('Terjadi kesalahan saat menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditDialog(false);
        setEditingMapel(null);
        setFormData({ nm_mapel: '', nm_ringkas: '' });
    };

    // Filter mapel based on search
    const filteredMapel = mapelList.filter((mapel) =>
        mapel.nm_mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mapel.nm_ringkas && mapel.nm_ringkas.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Pagination calculations
    const totalPages = Math.ceil(filteredMapel.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMapelList = filteredMapel.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                    <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
                        Data Mata Pelajaran
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] ml-3 italic">
                    Kelola nama mata pelajaran dan nama ringkas untuk e-Rapor.
                </p>
            </div>

            <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
                <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#1e3a8a]" />
                        <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Mata Pelajaran</CardTitle>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">TOTAL: {mapelList.length}</p>
                </CardHeader>
                <CardContent className="pt-4">
                    {/* Search Input */}
                    <div className="mb-3">
                        <Input
                            placeholder="Cari mapel..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-xs h-8 text-xs border-slate-200"
                        />
                    </div>

                    <div className="rounded-sm border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-[#1e3a8a]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[60px] text-white font-bold text-[10px] h-9 uppercase tracking-wider pl-4">No</TableHead>
                                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Mata Pelajaran</TableHead>
                                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Ringkas</TableHead>
                                    <TableHead className="w-[80px] text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : currentMapelList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Tidak ada data mata pelajaran
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentMapelList.map((mapel, index) => (
                                        <TableRow key={mapel.mata_pelajaran_id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="py-1.5 pl-4 text-xs font-medium text-slate-400">{startIndex + index + 1}</TableCell>
                                            <TableCell className="py-1.5 font-bold text-[#1e3a8a] text-xs">{mapel.nm_mapel || '-'}</TableCell>
                                            <TableCell className="py-1.5 text-xs text-slate-600 italic font-medium">{mapel.nm_ringkas || '-'}</TableCell>
                                            <TableCell className="text-center py-1.5 pr-4">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(mapel)}
                                                    className="h-7 w-7 p-0 text-[#1e3a8a] hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && mapelList.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredMapel.length)} dari {filteredMapel.length} data
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="h-7 text-[10px] font-bold border-slate-200"
                                >
                                    <ChevronLeft className="h-3 w-3 mr-1" />
                                    Prev
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
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => goToPage(page)}
                                                    className={currentPage === page ? "bg-[#1e3a8a] hover:bg-black h-7 w-7 p-0 text-[10px] font-bold" : "h-7 w-7 p-0 text-[10px] border-slate-200"}
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                            return <span key={page} className="px-1">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="h-7 text-[10px] font-bold border-slate-200"
                                >
                                    Next
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="py-3 px-6 bg-[#1e3a8a] text-white">
                        <DialogTitle className="text-white text-base">Edit Mata Pelajaran</DialogTitle>
                        <DialogDescription className="text-blue-100 text-[11px]">
                            Sesuaikan nama dan singkatan mata pelajaran.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="nm_mapel" className="text-[11px] font-bold uppercase text-slate-500">Nama Mata Pelajaran</Label>
                            <Input
                                id="nm_mapel"
                                value={formData.nm_mapel}
                                onChange={(e) => setFormData({ ...formData, nm_mapel: e.target.value })}
                                placeholder="Masukkan nama mata pelajaran"
                                className="h-9 text-xs border-slate-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="nm_ringkas" className="text-[11px] font-bold uppercase text-slate-500">Nama Ringkas</Label>
                            <Input
                                id="nm_ringkas"
                                value={formData.nm_ringkas}
                                onChange={(e) => setFormData({ ...formData, nm_ringkas: e.target.value })}
                                placeholder="Masukkan nama ringkas"
                                className="h-9 text-xs border-slate-200"
                            />
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-3 bg-slate-50 border-t">
                        <Button variant="outline" onClick={handleCancel} disabled={saving} className="h-8 text-[11px] font-bold uppercase border-slate-200">
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="h-8 text-[11px] font-bold uppercase bg-[#1e3a8a] text-white hover:bg-black">
                            {saving ? (
                                'Menyimpan...'
                            ) : (
                                <>
                                    <Save className="mr-1.5 h-3.5 w-3.5" />
                                    Simpan
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
