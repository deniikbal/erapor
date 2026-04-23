'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Pencil, 
  Save, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Plus, 
  Trash2, 
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { TemaKokurikuler } from '@/lib/db';
import { Badge } from '@/components/ui/badge';

export default function DaftarTemaPage() {
  const [temaList, setTemaList] = useState<TemaKokurikuler[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTema, setEditingTema] = useState<TemaKokurikuler | null>(null);
  const [temaToDelete, setTemaToDelete] = useState<TemaKokurikuler | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    nama_tema: '',
    status: '1',
    urut: 1
  });

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchTema();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchTema = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/kokurikuler/tema');
      const data = await res.json();

      if (res.ok) {
        setTemaList(data.tema || []);
      } else {
        toast.error(data.error || 'Gagal memuat data tema');
      }
    } catch (error) {
      console.error('Error fetching tema:', error);
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTema(null);
    setFormData({ nama_tema: '', status: '1', urut: (temaList.length + 1) });
    setDialogOpen(true);
  };

  const handleEdit = (tema: TemaKokurikuler) => {
    setEditingTema(tema);
    setFormData({
      nama_tema: tema.nama_tema,
      status: tema.status,
      urut: tema.urut || 1
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (tema: TemaKokurikuler) => {
    setTemaToDelete(tema);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nama_tema.trim()) {
      toast.error('Nama tema tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);
      const method = editingTema ? 'PATCH' : 'POST';
      const body = editingTema 
        ? { id_tema: editingTema.id_tema, ...formData }
        : formData;

      const res = await fetch('/api/admin/kokurikuler/tema', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingTema ? 'Tema berhasil diperbarui' : 'Tema berhasil ditambah');
        setDialogOpen(false);
        fetchTema();
      } else {
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving tema:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(prev => false);
    }
  };

  const confirmDelete = async () => {
    if (!temaToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/kokurikuler/tema?id=${temaToDelete.id_tema}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Tema berhasil dihapus');
        setDeleteDialogOpen(false);
        fetchTema();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting tema:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    } finally {
      setDeleting(false);
    }
  };

  // Filtering
  const filteredTema = temaList.filter(t => 
    t.nama_tema?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredTema.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredTema.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
            <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">Daftar Tema Kokurikuler</h1>
          </div>
          <Button 
            onClick={handleAdd}
            className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Tema
          </Button>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Kelola tema P5 (Projek Penguatan Profil Pelajar Pancasila) dan kokurikuler lainnya.
        </p>
      </div>

      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Tema</CardTitle>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">TOTAL: {temaList.length}</p>
        </CardHeader>
        <CardContent className="pt-4 px-4 pb-2">
          {/* Search Input */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Cari tema kokurikuler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs border-slate-200 focus-visible:ring-[#1e3a8a] focus-visible:border-[#1e3a8a]"
              />
            </div>
          </div>

          <div className="rounded-sm border border-slate-100 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[60px] text-white font-bold text-[10px] h-8 uppercase tracking-wider pl-4">No</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-8 uppercase tracking-wider">Tema Kegiatan Kokurikuler</TableHead>
                  <TableHead className="w-[120px] text-center text-white font-bold text-[10px] h-8 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="w-[100px] text-right text-white font-bold text-[10px] h-8 uppercase tracking-wider pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-[#1e3a8a] opacity-40" />
                        <span className="text-[11px] font-bold text-slate-400 animate-pulse">Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTema.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <div className="flex flex-col items-center gap-1 text-slate-300">
                        <FileText className="h-10 w-10 mb-2 opacity-10" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Tidak ada data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((tema, index) => (
                    <TableRow key={tema.id_tema} className="hover:bg-blue-50/20 transition-colors border-slate-50 divide-x divide-slate-100">
                      <TableCell className="py-1.5 pl-4 text-xs font-medium text-slate-400">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] font-bold text-[#1e3a8a] uppercase">
                        {tema.nama_tema}
                      </TableCell>
                      <TableCell className="py-1.5 text-center">
                        <Badge 
                          variant="outline" 
                          className={tema.status === '1' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold" 
                            : "bg-slate-50 text-slate-500 border-slate-200 text-[9px] font-bold"
                          }
                        >
                          {tema.status === '1' ? 'AKTIF' : 'NON-AKTIF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4 flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(tema)}
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(tema)}
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && filteredTema.length > itemsPerPage && (
            <div className="flex items-center justify-between py-4">
              <p className="text-[10px] text-slate-500 font-medium">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredTema.length)} dari {filteredTema.length} data
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-[10px] font-bold"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  PREV
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-[10px] font-bold text-[#1e3a8a]">HALAMAN {currentPage}</span>
                  <span className="text-[10px] text-slate-400">/</span>
                  <span className="text-[10px] font-bold text-slate-400">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-[10px] font-bold"
                >
                  NEXT
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-md">
          <DialogHeader className="bg-[#1e3a8a] px-6 py-4 text-white">
            <DialogTitle className="text-white text-base">
              {editingTema ? 'Edit Tema Kokurikuler' : 'Tambah Tema Kokurikuler'}
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-[11px]">
              {editingTema ? 'Perbarui informasi tema yang sudah ada.' : 'Masukkan tema baru untuk projek kokurikuler.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_tema" className="text-[10px] font-bold uppercase text-slate-400">Tema Kegiatan Kokurikuler</Label>
              <Input
                id="nama_tema"
                value={formData.nama_tema}
                onChange={(e) => setFormData({ ...formData, nama_tema: e.target.value })}
                placeholder="Contoh: Pelestarian lingkungan hidup"
                className="h-9 text-xs border-slate-200 focus-visible:ring-[#1e3a8a]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-[10px] font-bold uppercase text-slate-400">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-9 text-xs border-slate-200">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">Aktif</SelectItem>
                  <SelectItem value="0" className="text-xs">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 px-6 py-3 border-t">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-8 text-[11px] font-bold uppercase gap-2 border-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingTema ? 'Simpan Perubahan' : 'Tambah Tema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-sm">
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Tema?</h3>
            <p className="text-[11px] text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus tema <span className="font-bold text-red-600">"{temaToDelete?.nama_tema}"</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="h-8 text-[11px] font-bold uppercase flex-1 border-slate-200"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
                className="h-8 text-[11px] font-bold uppercase flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
