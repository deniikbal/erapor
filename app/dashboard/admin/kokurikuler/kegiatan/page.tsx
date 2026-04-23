'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Pencil, 
  Save, 
  X, 
  ChevronLeft,
  ChevronRight, 
  Plus, 
  Trash2, 
  Search,
  Loader2,
  AlertCircle,
  Settings2,
  BookOpen,
  ClipboardCheck,
  Target
} from 'lucide-react';
import type { TemaKokurikuler, KegiatanKokurikuler } from '@/lib/db';

export default function KegiatanKokurikulerPage() {
  const [temaList, setTemaList] = useState<TemaKokurikuler[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanKokurikuler[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  
  // Filters
  const [selectedTema, setSelectedTema] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('E');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<KegiatanKokurikuler | null>(null);
  const [itemToDelete, setItemToDelete] = useState<KegiatanKokurikuler | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Profil Lulusan (P5) States
  const [profilModalOpen, setProfilModalOpen] = useState(false);
  const [isAddingCapaian, setIsAddingCapaian] = useState(false);
  const [selectedKegiatanForProfil, setSelectedKegiatanForProfil] = useState<KegiatanKokurikuler | null>(null);
  const [assignedTargets, setAssignedTargets] = useState<any[]>([]);
  const [availableSubdimensi, setAvailableSubdimensi] = useState<any[]>([]);
  const [loadingProfil, setLoadingProfil] = useState(false);
  const [loadingSubdimensi, setLoadingSubdimensi] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchSubdimensiQuery, setSearchSubdimensiQuery] = useState('');

  const [formData, setFormData] = useState({
    fase: 'E',
    nama_kegiatan: '',
    tujuan_akhir: '',
    deskripsi_kegiatan: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTema && selectedFase) {
      fetchKegiatan();
    }
  }, [selectedTema, selectedFase]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/kokurikuler/tema');
      const data = await res.json();
      if (res.ok) {
        const activeTemas = (data.tema || []).filter((t: any) => t.status === '1');
        setTemaList(activeTemas);
        if (activeTemas.length > 0) {
          setSelectedTema(activeTemas[0].id_tema);
        }
      }
    } catch (error) {
      toast.error('Gagal memuat data tema');
    } finally {
      setLoading(false);
    }
  };

  const fetchKegiatan = async () => {
    try {
      setLoadingKegiatan(true);
      const res = await fetch(`/api/admin/kokurikuler/kegiatan?id_tema=${selectedTema}&fase=${selectedFase}`);
      const data = await res.json();
      if (res.ok) {
        setKegiatanList(data.kegiatan || []);
      } else {
        toast.error(data.error || 'Gagal memuat kegiatan');
      }
    } catch (error) {
      toast.error('Kesalahan koneksi saat memuat kegiatan');
    } finally {
      setLoadingKegiatan(false);
    }
  };

  const handleAdd = () => {
    setEditingKegiatan(null);
    setFormData({
      fase: selectedFase,
      nama_kegiatan: '',
      tujuan_akhir: '',
      deskripsi_kegiatan: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (kegiatan: KegiatanKokurikuler) => {
    setEditingKegiatan(kegiatan);
    setFormData({
      fase: kegiatan.fase,
      nama_kegiatan: kegiatan.nama_kegiatan,
      tujuan_akhir: kegiatan.tujuan_akhir,
      deskripsi_kegiatan: kegiatan.deskripsi_kegiatan
    });
    setDialogOpen(true);
  };

  // --- Profil Lulusan (P5) Functions ---
  
  const handleOpenProfilModal = (kegiatan: KegiatanKokurikuler) => {
    setSelectedKegiatanForProfil(kegiatan);
    setProfilModalOpen(true);
    fetchAssignedTargets(kegiatan.id_kegiatan);
    fetchAvailableSubdimensi();
  };

  const fetchAssignedTargets = async (id_kegiatan: string) => {
    try {
      const res = await fetch(`/api/admin/kokurikuler/kegiatan/target-capaian?id_kegiatan=${id_kegiatan}`);
      const data = await res.json();
      if (res.ok) {
        setAssignedTargets(data.targets || []);
      }
    } catch (error) {
      toast.error('Gagal memuat target capaian');
    }
  };

  const fetchAvailableSubdimensi = async () => {
    try {
      setLoadingSubdimensi(true);
      const res = await fetch('/api/referensi/subdimensi');
      const data = await res.json();
      if (res.ok) {
        setAvailableSubdimensi(data.subdimensi || []);
      }
    } catch (error) {
      toast.error('Gagal memuat referensi subdimensi');
    } finally {
      setLoadingSubdimensi(false);
    }
  };

  const handleAssignTarget = async (id_subdimensi: string) => {
    if (!selectedKegiatanForProfil) return;
    
    try {
      setLoadingAction(true);
      const res = await fetch('/api/admin/kokurikuler/kegiatan/target-capaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_kegiatan: selectedKegiatanForProfil.id_kegiatan,
          id_subdimensi,
          fase: selectedKegiatanForProfil.fase,
          jenjang: 'SMA' // Default jenjang
        })
      });

      if (res.ok) {
        toast.success('Target berhasil ditambahkan');
        fetchAssignedTargets(selectedKegiatanForProfil.id_kegiatan);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menambah target');
      }
    } catch (error) {
      toast.error('Kesalahan koneksi');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveTarget = async (id_target: string) => {
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kegiatan/target-capaian?id_target=${id_target}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Target berhasil dihapus');
        if (selectedKegiatanForProfil) {
          fetchAssignedTargets(selectedKegiatanForProfil.id_kegiatan);
        }
      }
    } catch (error) {
      toast.error('Gagal menghapus target');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama_kegiatan) {
      toast.error('Nama kegiatan wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const method = editingKegiatan ? 'PATCH' : 'POST';
      const body = editingKegiatan 
        ? { id_kegiatan: editingKegiatan.id_kegiatan, ...formData }
        : { id_tema: selectedTema, ...formData };

      const res = await fetch('/api/admin/kokurikuler/kegiatan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingKegiatan ? 'Kegiatan diperbarui' : 'Kegiatan ditambahkan');
        setDialogOpen(false);
        fetchKegiatan();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/kokurikuler/kegiatan?id=${itemToDelete.id_kegiatan}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Kegiatan dihapus');
        setDeleteDialogOpen(false);
        fetchKegiatan();
      } else {
        toast.error('Gagal menghapus kegiatan');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setDeleting(false);
    }
  };

  const filteredKegiatan = kegiatanList.filter(k => 
    k.nama_kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.tujuan_akhir?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTemaName = temaList.find(t => t.id_tema === selectedTema)?.nama_tema || '';

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
           <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">Data Kegiatan Kokurikuler</h1>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden">
        <CardContent className="p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase text-slate-500">Pilih Tema Kokurikuler</Label>
              <Select value={selectedTema} onValueChange={setSelectedTema}>
                <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                  <SelectValue placeholder="Pilih Tema" />
                </SelectTrigger>
                <SelectContent>
                  {temaList.map((tema) => (
                    <SelectItem key={tema.id_tema} value={tema.id_tema} className="text-xs">
                      {tema.nama_tema}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase text-slate-500">Pilih Fase</Label>
              <Select value={selectedFase} onValueChange={setSelectedFase}>
                <SelectTrigger className="h-9 text-xs border-slate-200 bg-white w-full">
                  <SelectValue placeholder="Pilih Fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="E" className="text-xs">E</SelectItem>
                  <SelectItem value="F" className="text-xs">F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Content */}
      <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-tight">
                  Data Kegiatan Kokurikuler untuk Tema {selectedTemaName}
                </CardTitle>
                <CardDescription className="text-[10px] italic text-slate-400">
                  Total kegiatan ditemukan: {filteredKegiatan.length} item
                </CardDescription>
              </div>
              <Button 
                onClick={handleAdd}
                className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2 flex-shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Kegiatan
              </Button>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-end gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-[11px] border-slate-200 focus-visible:ring-[#1e3a8a] bg-white shadow-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px] text-white font-bold text-[10px] h-9 uppercase tracking-wider pl-4">No</TableHead>
                  <TableHead className="w-[200px] text-white font-bold text-[10px] h-9 uppercase tracking-wider">Judul Kegiatan Kokurikuler</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Tujuan Akhir Kegiatan Kokurikuler</TableHead>
                  <TableHead className="w-[250px] text-white font-bold text-[10px] h-9 uppercase tracking-wider">Profil Lulusan</TableHead>
                  <TableHead className="w-[80px] text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Opsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingKegiatan ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a] opacity-50" />
                        <span className="text-[11px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Memuat Data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredKegiatan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-1 text-slate-300">
                        <BookOpen className="h-12 w-12 mb-2 opacity-10" />
                        <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Data</p>
                        <p className="text-[10px] italic">Gunakan tombol "Tambah Kegiatan" untuk mengisi data.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKegiatan.map((k, index) => (
                    <TableRow key={k.id_kegiatan} className="hover:bg-blue-50/20 divide-x divide-slate-100 border-b border-slate-50 transition-colors">
                      <TableCell className="py-2.5 pl-4 text-xs font-medium text-slate-400 align-top">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-2.5 font-bold text-[#1e3a8a] text-[11px] leading-relaxed align-top">
                        {k.nama_kegiatan}
                      </TableCell>
                      <TableCell className="py-2.5 text-[11px] text-slate-600 leading-relaxed font-medium align-top">
                        {k.tujuan_akhir}
                      </TableCell>
                      <TableCell className="py-2.5 text-[10px] text-slate-500 leading-relaxed align-top min-w-[220px]">
                        {k.targets && k.targets.length > 0 ? (() => {
                          // Group by nama_dimensi, filter null
                          const grouped: Record<string, { subdimensi: string[], urut: number }> = {};
                          k.targets.forEach((curr: any) => {
                            const key = curr.nama_dimensi || '—';
                            if (!grouped[key]) grouped[key] = { subdimensi: [], urut: curr.urut_dimensi ?? 99 };
                            if (curr.nama_subdimensi) grouped[key].subdimensi.push(curr.nama_subdimensi);
                          });
                          return (
                            <div className="space-y-1.5">
                              {Object.entries(grouped).map(([dimensi, val], idx) => (
                                <div key={idx} className="flex items-start gap-1.5 leading-snug">
                                  <span className="mt-0.5 text-slate-500 text-[11px]">•</span>
                                  <div className="flex-1">
                                    <span className="font-semibold text-slate-700 text-[11px]">{dimensi} :</span>
                                    <div className="text-blue-600 font-medium text-[10px] mt-0.5">
                                      {val.subdimensi.join(', ')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-300 italic text-[10px]">Belum ada profil lulusan terpilih.</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-center pr-4 align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-[10px] font-bold bg-blue-50 text-[#1e3a8a] border-blue-100 hover:bg-[#1e3a8a] hover:text-white transition-all uppercase gap-1"
                            >
                              <Settings2 className="h-3 w-3" />
                              Opsi
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 shadow-xl border-slate-200">
                            <DropdownMenuItem onClick={() => handleEdit(k)} className="text-[11px] font-medium py-2 gap-2 text-blue-600 cursor-pointer">
                              <Pencil className="h-3.5 w-3.5" /> Edit Data
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenProfilModal(k)} className="text-[11px] font-medium py-2 gap-2 text-emerald-600 cursor-pointer">
                              <Target className="h-3.5 w-3.5" /> Profil Lulusan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setItemToDelete(k); setDeleteDialogOpen(true); }} className="text-[11px] font-medium py-2 gap-2 text-red-600 cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer / Pagination Mockup */}
          <div className="p-4 border-t bg-slate-50/30 flex items-center justify-between">
            <p className="text-[10px] font-medium text-slate-400">Showing {filteredKegiatan.length} items</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" disabled><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="default" size="sm" className="h-7 w-7 p-0 bg-[#1e3a8a] text-white text-[10px] font-bold rounded-sm shadow-sm">1</Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-slate-200" disabled><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-2xl bg-white shadow-2xl">
          <DialogHeader className="bg-[#1e3a8a] px-6 py-4 text-white">
            <DialogTitle className="text-white text-base">
              {editingKegiatan ? 'Edit Kegiatan Kokurikuler' : 'Tambah Kegiatan Kokurikuler'}
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-[11px]">
              {editingKegiatan ? 'Perbarui rincian kegiatan projek.' : 'Masukkan rincian kegiatan projek baru untuk tema terpilih.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                 <Label className="text-[10px] font-bold uppercase text-slate-500">Fase</Label>
                 <Select value={formData.fase} onValueChange={(val) => setFormData({...formData, fase: val})}>
                    <SelectTrigger className="h-9 text-xs border-slate-200">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="E" className="text-xs">Fase E (Kelas 10)</SelectItem>
                       <SelectItem value="F" className="text-xs">Fase F (Kelas 11-12)</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Nama Kegiatan Kokurikuler</Label>
              <Input
                value={formData.nama_kegiatan}
                onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value })}
                placeholder="Masukkan judul kegiatan..."
                className="h-9 text-xs border-slate-200 focus-visible:ring-[#1e3a8a]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Tujuan Akhir Kegiatan</Label>
              <Textarea
                value={formData.tujuan_akhir}
                onChange={(e) => setFormData({ ...formData, tujuan_akhir: e.target.value })}
                placeholder="Deskripsikan tujuan akhir dari kegiatan ini..."
                className="min-h-[100px] text-xs border-slate-200 focus-visible:ring-[#1e3a8a] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-500">Profil Lulusan / Deskripsi</Label>
              <Textarea
                value={formData.deskripsi_kegiatan}
                onChange={(e) => setFormData({ ...formData, deskripsi_kegiatan: e.target.value })}
                placeholder="Contoh: - Beriman, Bertakwa kepada Tuhan YME\n- Kreatif\n- Gotong Royong"
                className="min-h-[120px] text-xs border-slate-200 focus-visible:ring-[#1e3a8a] font-mono text-[11px]"
              />
              <p className="text-[9px] text-slate-400 italic font-medium">* Gunakan tanda dash (-) untuk membuat daftar profil.</p>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 px-6 py-4 border-t gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-9 text-[11px] font-bold uppercase gap-2 border-slate-200 bg-white"
            >
              <X className="h-4 w-4" /> Batal
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="h-9 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingKegiatan ? 'Simpan Perubahan' : 'Simpan Kegiatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-sm bg-white">
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader className="p-0 mb-1">
              <DialogTitle className="text-sm font-bold text-slate-900 text-center">Hapus Kegiatan?</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 leading-relaxed text-center">
                Anda akan menghapus kegiatan <span className="font-bold text-red-600">"{itemToDelete?.nama_kegiatan}"</span>. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-center w-full mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="h-9 text-[11px] font-bold uppercase flex-1 border-slate-200 bg-white"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 text-[11px] font-bold uppercase flex-1 bg-red-600 hover:bg-red-700 shadow-md"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus Sekarang'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL PROFIL LULUSAN (P5) --- */}
      <Dialog open={profilModalOpen} onOpenChange={(open) => {
        setProfilModalOpen(open);
        if (!open) { setAvailableSubdimensi([]); setAssignedTargets([]); setSearchSubdimensiQuery(''); setIsAddingCapaian(false); }
      }}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-4xl bg-white shadow-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <DialogHeader className="bg-[#1e3a8a] px-6 py-4 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <DialogTitle className="text-white text-sm font-bold uppercase tracking-wide">
                  Data Profil Lulusan pada Kegiatan
                </DialogTitle>
                <p className="text-blue-100 text-[10px] italic font-medium">
                  {selectedKegiatanForProfil?.nama_kegiatan}
                </p>
              </div>
              {isAddingCapaian && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsAddingCapaian(false); setSearchSubdimensiQuery(''); }}
                  className="h-8 border-blue-200 text-blue-100 hover:bg-blue-800 hover:text-white text-[11px] font-bold uppercase gap-1 bg-transparent"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Kembali
                </Button>
              )}
            </div>
          </DialogHeader>

          {!isAddingCapaian ? (
            /* ===== LAYAR 1: DATA DARI targetcapaian_kokurikuler ===== */
            <>
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#1e3a8a] rounded-full" />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Target Capaian Terpilih</span>
                  <span className="ml-1 bg-[#1e3a8a] text-white text-[10px] font-bold rounded-full px-2 py-0.5">{assignedTargets.length}</span>
                </div>
                <Button
                  onClick={() => { setIsAddingCapaian(true); fetchAvailableSubdimensi(); }}
                  className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2 px-4"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Capaian
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <Table className="border-collapse w-full">
                  <TableHeader className="bg-[#1e3a8a] sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[50px] text-[10px] font-bold text-white h-9 text-center uppercase pl-4">No</TableHead>
                      <TableHead className="text-[10px] font-bold text-white h-9 uppercase">Dimensi Profil Lulusan</TableHead>
                      <TableHead className="text-[10px] font-bold text-white h-9 uppercase">Subdimensi</TableHead>
                      <TableHead className="w-[80px] text-[10px] font-bold text-white h-9 text-center uppercase pr-4">Opsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProfil ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-[#1e3a8a] opacity-50" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Memuat Data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : assignedTargets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-300">
                            <ClipboardCheck className="h-10 w-10 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-wide">Belum Ada Target Capaian</p>
                            <p className="text-[10px] italic text-slate-400">Klik "Tambah Capaian" untuk memilih profil lulusan.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedTargets.map((item, idx) => (
                        <TableRow key={item.id_target} className="hover:bg-blue-50/30 border-b border-slate-100 divide-x divide-slate-100 transition-colors">
                          <TableCell className="py-2 text-center text-[11px] text-slate-400 font-medium pl-4">{idx + 1}</TableCell>
                          <TableCell className="py-2 text-[11px] font-bold text-[#1e3a8a]">{item.nama_dimensi}</TableCell>
                          <TableCell className="py-2 text-[11px] text-slate-600 font-medium">{item.nama_subdimensi}</TableCell>
                          <TableCell className="py-2 text-center pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={loadingAction}
                              onClick={() => handleRemoveTarget(item.id_target)}
                              className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600"
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

              <div className="p-3 bg-slate-50 border-t flex justify-end shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setProfilModalOpen(false)}
                  className="h-8 text-[11px] font-bold uppercase px-6 border-slate-300 bg-white hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Tutup
                </Button>
              </div>
            </>
          ) : (
            /* ===== LAYAR 2: PILIH dari dpl_subdimensi ===== */
            <>
              <div className="p-3 bg-slate-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari dimensi atau subdimensi..."
                    value={searchSubdimensiQuery}
                    onChange={(e) => setSearchSubdimensiQuery(e.target.value)}
                    className="pl-9 h-8 text-[11px] border-slate-200 bg-white focus-visible:ring-[#1e3a8a]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Klik <span className="font-bold text-[#1e3a8a]">+ Tambahkan</span> untuk menambahkan ke target capaian.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <Table className="border-collapse w-full">
                  <TableHeader className="bg-[#1e3a8a] sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[50px] text-[10px] font-bold text-white h-9 text-center uppercase pl-4">No</TableHead>
                      <TableHead className="text-[10px] font-bold text-white h-9 uppercase">Dimensi Profil Lulusan</TableHead>
                      <TableHead className="text-[10px] font-bold text-white h-9 uppercase">Subdimensi</TableHead>
                      <TableHead className="w-[140px] text-[10px] font-bold text-white h-9 text-center uppercase pr-4">Opsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSubdimensi ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-[#1e3a8a] opacity-50" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Memuat Referensi...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : availableSubdimensi.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center">
                          <p className="text-slate-400 text-xs italic">Data subdimensi kosong. Pastikan tabel dpl_subdimensi telah terisi.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableSubdimensi
                        .filter(s =>
                          s.nama_subdimensi?.toLowerCase().includes(searchSubdimensiQuery.toLowerCase()) ||
                          s.nama_dimensi?.toLowerCase().includes(searchSubdimensiQuery.toLowerCase())
                        )
                        .map((item, idx) => {
                          const isAssigned = assignedTargets.some(t => t.id_subdimensi === item.id_subdimensi);
                          return (
                            <TableRow
                              key={item.id_subdimensi}
                              className={`border-b border-slate-100 divide-x divide-slate-100 transition-colors ${
                                isAssigned ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-blue-50/40'
                              }`}
                            >
                              <TableCell className="py-2 text-center text-[11px] text-slate-400 font-medium pl-4">{idx + 1}</TableCell>
                              <TableCell className="py-2 text-[11px] font-bold text-slate-700 leading-snug">{item.nama_dimensi}</TableCell>
                              <TableCell className="py-2 text-[11px] text-slate-600 font-medium leading-snug">{item.nama_subdimensi}</TableCell>
                              <TableCell className="py-2 text-center pr-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isAssigned || loadingAction}
                                  onClick={() => handleAssignTarget(item.id_subdimensi)}
                                  className={`h-7 px-3 text-[10px] font-bold uppercase gap-1 transition-all ${
                                    isAssigned
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default'
                                      : 'border-blue-300 text-blue-700 hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a]'
                                  }`}
                                >
                                  {isAssigned ? (
                                    <><ClipboardCheck className="h-3.5 w-3.5" /> Sudah Ada</>
                                  ) : (
                                    <><Plus className="h-3.5 w-3.5" /> Tambahkan</>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-slate-50 border-t flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400">
                  <span className="font-bold text-emerald-600">{assignedTargets.length}</span> subdimensi sudah dipilih
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setIsAddingCapaian(false); setSearchSubdimensiQuery(''); }}
                  className="h-8 text-[11px] font-bold uppercase px-6 border-slate-300 bg-white hover:bg-slate-100"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali ke Daftar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
