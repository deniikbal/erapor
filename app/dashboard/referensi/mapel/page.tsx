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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchMapel();
    }, []);

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

    // Pagination calculations
    const totalPages = Math.ceil(mapelList.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMapelList = mapelList.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Data Mata Pelajaran</h1>
                <p className="text-muted-foreground">Kelola nama mata pelajaran dan nama ringkas</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <CardTitle>Daftar Mata Pelajaran</CardTitle>
                    </div>
                    <CardDescription>
                        Total: {mapelList.length} mata pelajaran
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px] py-2">No</TableHead>
                                    <TableHead className="py-2">Nama Mata Pelajaran</TableHead>
                                    <TableHead className="py-2">Nama Ringkas</TableHead>
                                    <TableHead className="w-[100px] text-center py-2">Aksi</TableHead>
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
                                        <TableRow key={mapel.mata_pelajaran_id}>
                                            <TableCell className="font-medium py-2">{startIndex + index + 1}</TableCell>
                                            <TableCell className="font-medium py-2">{mapel.nm_mapel || '-'}</TableCell>
                                            <TableCell className="py-2">{mapel.nm_ringkas || '-'}</TableCell>
                                            <TableCell className="text-center py-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(mapel)}
                                                >
                                                    <Pencil className="h-4 w-4" />
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
                                Menampilkan {startIndex + 1} - {Math.min(endIndex, mapelList.length)} dari {mapelList.length} data
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage - 1)}
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
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => goToPage(page)}
                                                    className="w-10"
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
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Data Mata Pelajaran</DialogTitle>
                        <DialogDescription>
                            Ubah nama mata pelajaran dan nama ringkas
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="nm_mapel">Nama Mata Pelajaran</Label>
                            <Input
                                id="nm_mapel"
                                value={formData.nm_mapel}
                                onChange={(e) => setFormData({ ...formData, nm_mapel: e.target.value })}
                                placeholder="Masukkan nama mata pelajaran"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nm_ringkas">Nama Ringkas</Label>
                            <Input
                                id="nm_ringkas"
                                value={formData.nm_ringkas}
                                onChange={(e) => setFormData({ ...formData, nm_ringkas: e.target.value })}
                                placeholder="Masukkan nama ringkas"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel} disabled={saving}>
                            <X className="mr-2 h-4 w-4" />
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
