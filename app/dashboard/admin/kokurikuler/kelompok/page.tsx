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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Search,
  Loader2,
  AlertCircle,
  Users,
  BookOpen,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  X,
  Edit,
  ClipboardCheck,
  UserPlus
} from 'lucide-react';
import { useSemester } from '@/components/providers/semester-context';
import type { KelompokKokurikuler, PTK } from '@/lib/db';

export default function KelompokKokurikulerPage() {
  const { activeSemester } = useSemester();
  const [kelompokList, setKelompokList] = useState<KelompokKokurikuler[]>([]);
  const [guruList, setGuruList] = useState<PTK[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Filters
  const [selectedTingkatFilter, setSelectedTingkatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Kokurikuler Modal State
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [isAddingKegiatan, setIsAddingKegiatan] = useState(false);
  const [selectedKelompok, setSelectedKelompok] = useState<KelompokKokurikuler | null>(null);
  const [assignedKegiatan, setAssignedKegiatan] = useState<any[]>([]);
  const [availableKegiatan, setAvailableKegiatan] = useState<any[]>([]);
  const [loadingDataModal, setLoadingDataModal] = useState(false);
  const [searchKegiatanQuery, setSearchKegiatanQuery] = useState('');

  // Anggota Modal State
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberList, setMemberList] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [availableSiswa, setAvailableSiswa] = useState<any[]>([]);
  const [selectedRombelId, setSelectedRombelId] = useState<string>('');
  const [loadingMemberModal, setLoadingMemberModal] = useState(false);
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KelompokKokurikuler | null>(null);

  const [formData, setFormData] = useState({
    nm_kelompok: '',
    tingkat_pendidikan_id: '',
    fase: '',
    ptk_id: ''
  });

  useEffect(() => {
    if (activeSemester) {
      fetchInitialData();
      fetchKelompok();
    }
  }, [activeSemester]);

  const fetchInitialData = async () => {
    try {
      const resGuru = await fetch('/api/guru');
      const dataGuru = await resGuru.json();
      if (resGuru.ok) setGuruList(dataGuru.guru || []);
    } catch (error) {
      toast.error('Gagal memuat data guru');
    }
  };

  const fetchKelompok = async () => {
    if (!activeSemester) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok?semester_id=${activeSemester.semester_id}`);
      const data = await res.json();
      if (res.ok) {
        setKelompokList(data.kelompok || []);
      } else {
        toast.error(data.error || 'Gagal memuat data kelompok');
      }
    } catch (error) {
      toast.error('Kesalahan koneksi saat memuat kelompok');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedKegiatan = async (kelompokId: string) => {
    try {
      setLoadingDataModal(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/kegiatan?kelompok_id=${kelompokId}`);
      const data = await res.json();
      if (res.ok) {
        setAssignedKegiatan(data.kegiatan || []);
      } else {
        toast.error(data.error || 'Gagal memuat kegiatan kelompok');
      }
    } catch (error) {
      toast.error('Kesalahan koneksi saat memuat kegiatan kelompok');
    } finally {
      setLoadingDataModal(false);
    }
  };

  const fetchAvailableKegiatan = async (fase: string) => {
    try {
      setLoadingDataModal(true);
      const res = await fetch(`/api/admin/kokurikuler/kegiatan?fase=${fase}`);
      const data = await res.json();
      if (res.ok) {
        setAvailableKegiatan(data.kegiatan || []);
      }
    } catch (error) {
      toast.error('Gagal memuat daftar kegiatan tersedia');
    } finally {
      setLoadingDataModal(false);
    }
  };

  const handleOpenDataModal = (kelompok: KelompokKokurikuler) => {
    setSelectedKelompok(kelompok);
    setIsAddingKegiatan(false);
    fetchAssignedKegiatan(kelompok.kelompok_id);
    setDataModalOpen(true);
  };

  const handleSwitchToAdd = () => {
    if (selectedKelompok) {
      fetchAvailableKegiatan(selectedKelompok.fase);
      setIsAddingKegiatan(true);
    }
  };

  const handleAssignKegiatan = async (kegiatanId: string) => {
    if (!selectedKelompok || !activeSemester) return;

    try {
      setLoadingAction(true);
      const res = await fetch('/api/admin/kokurikuler/kelompok/kegiatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompok_id: selectedKelompok.kelompok_id,
          id_kegiatan: kegiatanId,
          semester_id: activeSemester.semester_id,
          fase: selectedKelompok.fase
        })
      });

      if (res.ok) {
        toast.success('Kegiatan berhasil ditambahkan');
        fetchAssignedKegiatan(selectedKelompok.kelompok_id);
        setIsAddingKegiatan(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menambahkan kegiatan');
      }
    } catch (error) {
      toast.error('Kesalahan saat menyimpan');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveKegiatan = async (idklp_kokurikuler: string) => {
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/kegiatan?id=${idklp_kokurikuler}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Kegiatan berhasil dihapus dari kelompok');
        if (selectedKelompok) fetchAssignedKegiatan(selectedKelompok.kelompok_id);
      } else {
        toast.error('Gagal menghapus kegiatan');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveAllKegiatan = async () => {
    if (!selectedKelompok) return;
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/kegiatan?kelompok_id=${selectedKelompok.kelompok_id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Semua kegiatan berhasil dihapus');
        fetchAssignedKegiatan(selectedKelompok.kelompok_id);
      } else {
        toast.error('Gagal menghapus semua kegiatan');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setLoadingAction(false);
    }
  };

  // MEMBERS LOGIC
  const fetchMembers = async (kelompokId: string) => {
    try {
      setLoadingMemberModal(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/anggota?kelompok_id=${kelompokId}&semester_id=${activeSemester?.semester_id}`);
      const data = await res.json();
      if (res.ok) {
        setMemberList(data.anggota || []);
      }
    } catch (error) {
      toast.error('Gagal memuat daftar anggota');
    } finally {
      setLoadingMemberModal(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/kelas');
      const data = await res.json();
      if (res.ok) {
        // Tampilkan kelas reguler (biasanya jenis_rombel 1 atau 16)
        // Gunakan pengamanan tipe data (Number)
        const regularClasses = (data.kelas || [])
          .filter((c: any) => {
            const jr = Number(c.jenis_rombel);
            return jr === 1 || jr === 16;
          })
          .sort((a: any, b: any) => 
            a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' })
          );
        setClassList(regularClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAvailableSiswa = async (rombonganBelajarId: string) => {
    if (!rombonganBelajarId || !activeSemester) return;
    try {
      setLoadingMemberModal(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/anggota?rombel_id=${rombonganBelajarId}&semester_id=${activeSemester.semester_id}`);
      const data = await res.json();
      if (res.ok) {
        setAvailableSiswa(data.siswa || []);
      }
    } catch (error) {
      toast.error('Gagal memuat daftar siswa');
    } finally {
      setLoadingMemberModal(false);
    }
  };

  const handleOpenMemberModal = (kelompok: KelompokKokurikuler) => {
    setSelectedKelompok(kelompok);
    setIsAddingMember(false);
    fetchMembers(kelompok.kelompok_id);
    fetchClasses();
    setMemberModalOpen(true);
  };

  const handleSwitchToAddMember = () => {
    setIsAddingMember(true);
    setAvailableSiswa([]);
    setSelectedRombelId('');
  };

  const handleAssignMember = async (pdId: string | string[]) => {
    if (!selectedKelompok || !activeSemester) return;
    try {
      setLoadingAction(true);
      const res = await fetch('/api/admin/kokurikuler/kelompok/anggota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompok_id: selectedKelompok.kelompok_id,
          peserta_didik_ids: pdId,
          semester_id: activeSemester.semester_id,
          fase: selectedKelompok.fase
        })
      });
      if (res.ok) {
        toast.success('Anggota berhasil ditambahkan');
        fetchMembers(selectedKelompok.kelompok_id);
        setIsAddingMember(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menambahkan anggota');
      }
    } catch (error) {
      toast.error('Kesalahan saat menyimpan');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveMember = async (anggota_kelompok_id: string) => {
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/anggota?id=${anggota_kelompok_id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Anggota berhasil dihapus');
        if (selectedKelompok) fetchMembers(selectedKelompok.kelompok_id);
      } else {
        toast.error('Gagal menghapus anggota');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveAllMembers = async () => {
    if (!selectedKelompok) return;
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok/anggota?kelompok_id=${selectedKelompok.kelompok_id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Semua anggota berhasil dihapus');
        fetchMembers(selectedKelompok.kelompok_id);
      } else {
        toast.error('Gagal menghapus semua anggota');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      nm_kelompok: '',
      tingkat_pendidikan_id: '',
      fase: '',
      ptk_id: ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nm_kelompok || !formData.tingkat_pendidikan_id || !formData.fase || !formData.ptk_id) {
      toast.error('Semua data wajib diisi');
      return;
    }

    try {
      setLoadingAction(true);
      const res = await fetch('/api/admin/kokurikuler/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          semester_id: activeSemester?.semester_id
        }),
      });

      if (res.ok) {
        toast.success('Kelompok berhasil disimpan');
        setDialogOpen(false);
        fetchKelompok();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setLoadingAction(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoadingAction(true);
      const res = await fetch(`/api/admin/kokurikuler/kelompok?id=${itemToDelete.kelompok_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Kelompok berhasil dihapus');
        setConfirmDeleteOpen(false);
        fetchKelompok();
      } else {
        toast.error('Gagal menghapus kelompok');
      }
    } catch (error) {
      toast.error('Kesalahan saat menghapus');
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredKelompok = kelompokList.filter(k => {
    const matchTingkat = selectedTingkatFilter === 'all' || k.tingkat_pendidikan_id === selectedTingkatFilter;
    const matchSearch = k.nm_kelompok?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       k.nama_pembimbing?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTingkat && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
           <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">Kelompok Kokurikuler</h1>
        </div>
        <div className="text-[10px] bg-blue-50 text-[#1e3a8a] px-3 py-1 rounded-full font-bold border border-blue-100 uppercase">
          Semester: {activeSemester?.nama_semester}
        </div>
      </div>

      {/* Filters Section */}
      <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-2">
                <Filter className="h-3 w-3" /> Filter Tingkat
              </Label>
              <Select value={selectedTingkatFilter} onValueChange={setSelectedTingkatFilter}>
                <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                  <SelectValue placeholder="Pilih Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Tingkat</SelectItem>
                  <SelectItem value="10" className="text-xs">Tingkat 10</SelectItem>
                  <SelectItem value="11" className="text-xs">Tingkat 11</SelectItem>
                  <SelectItem value="12" className="text-xs">Tingkat 12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-2">
                <Search className="h-3 w-3" /> Pencarian
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Cari nama kelompok atau koordinator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-[11px] border-slate-200 focus-visible:ring-[#1e3a8a] bg-white shadow-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-tight">
              Data Kelompok Kokurikuler
            </CardTitle>
            <CardDescription className="text-[10px] italic text-slate-400">
              Total kelompok ditemukan: {filteredKelompok.length} item
            </CardDescription>
          </div>
          <Button 
            onClick={handleAdd}
            className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[11px] font-bold uppercase gap-2 flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Kelompok
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px] text-white font-bold text-[10px] h-10 uppercase tracking-wider pl-4 text-center">No</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-10 uppercase tracking-wider">Nama Kelompok</TableHead>
                  <TableHead className="w-[80px] text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider">Tingkat</TableHead>
                  <TableHead className="w-[80px] text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider">Fase</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-10 uppercase tracking-wider">Koordinator</TableHead>
                  <TableHead className="w-[150px] text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider">Data Kokurikuler</TableHead>
                  <TableHead className="w-[120px] text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider">Anggota</TableHead>
                  <TableHead className="w-[180px] text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider pr-4">Opsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a] opacity-50" />
                        <span className="text-[11px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Memuat Data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredKelompok.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20">
                      <div className="flex flex-col items-center gap-1 text-slate-300">
                        <BookOpen className="h-12 w-12 mb-2 opacity-10" />
                        <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Data</p>
                        <p className="text-[10px] italic">Klik "Tambah Kelompok" untuk membuat kelompok baru.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKelompok.map((k, index) => (
                    <TableRow key={k.kelompok_id} className="hover:bg-blue-50/20 divide-x divide-slate-100 border-b border-slate-50 transition-colors">
                      <TableCell className="py-2.5 text-center text-xs font-medium text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-2.5 font-bold text-[#1e3a8a] text-[11px] uppercase">
                        {k.nm_kelompok}
                      </TableCell>
                      <TableCell className="py-2.5 text-center text-[10px] font-bold text-slate-600">
                        {k.tingkat_pendidikan_id}
                      </TableCell>
                      <TableCell className="py-2.5 text-center text-[10px] font-bold text-slate-600">
                        {k.fase}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                           <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-[#1e3a8a] border border-blue-200">
                              <UserCheck className="h-3.5 w-3.5" />
                           </div>
                           <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">
                            {k.nama_pembimbing}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => handleOpenDataModal(k)}
                          className="h-8 text-[10px] font-bold text-slate-600 border-slate-300 gap-1.5 px-3 hover:bg-slate-50 shadow-sm"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" />
                          Data Kokurikuler
                        </Button>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => handleOpenMemberModal(k)}
                          className="h-8 text-[10px] font-bold text-slate-600 border-slate-300 gap-1.5 px-3 hover:bg-slate-50 shadow-sm"
                        >
                          <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                          Anggota
                        </Button>
                      </TableCell>
                      <TableCell className="py-2 text-center pr-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold text-slate-600 border-yellow-500/50 gap-1.5 px-3 hover:bg-yellow-50"
                          >
                            <Edit className="h-3.5 w-3.5 text-yellow-600" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setItemToDelete(k); setConfirmDeleteOpen(true); }}
                            className="h-8 text-[10px] font-bold text-slate-600 border-red-500/50 gap-1.5 px-3 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog - Matched with Screenshot */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-2xl bg-white shadow-2xl">
          <DialogHeader className="bg-white px-6 py-4 border-b">
            <DialogTitle className="text-slate-800 text-lg font-medium">
              Tambah/Edit Data Kelompok Kokurikuler
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 py-6 space-y-6">
            {/* Nama Kelompok */}
            <div className="grid grid-cols-7 items-center gap-4">
              <Label className="col-span-2 text-sm font-bold text-slate-700">Nama Kelompok</Label>
              <div className="col-span-1 text-center font-bold text-slate-700">:</div>
              <div className="col-span-4">
                <Input
                  value={formData.nm_kelompok}
                  onChange={(e) => setFormData({ ...formData, nm_kelompok: e.target.value })}
                  placeholder=""
                  className="h-10 text-sm border-slate-200 focus-visible:ring-indigo-500 rounded-md"
                />
              </div>
            </div>

            {/* Tingkat Pendidikan */}
            <div className="grid grid-cols-7 items-center gap-4">
              <Label className="col-span-2 text-sm font-bold text-slate-700">Tingkat Pendidikan</Label>
              <div className="col-span-1 text-center font-bold text-slate-700">:</div>
              <div className="col-span-4">
                 <Select value={formData.tingkat_pendidikan_id} onValueChange={(val) => setFormData({...formData, tingkat_pendidikan_id: val})}>
                    <SelectTrigger className="h-10 text-sm border-slate-200 rounded-md">
                       <SelectValue placeholder="Pilih Tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10" className="text-sm">Tingkat 10</SelectItem>
                      <SelectItem value="11" className="text-sm">Tingkat 11</SelectItem>
                      <SelectItem value="12" className="text-sm">Tingkat 12</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
            </div>

            {/* Fase */}
            <div className="grid grid-cols-7 items-center gap-4">
              <Label className="col-span-2 text-sm font-bold text-slate-700">Fase</Label>
              <div className="col-span-1 text-center font-bold text-slate-700">:</div>
              <div className="col-span-4">
                 <Select value={formData.fase} onValueChange={(val) => setFormData({...formData, fase: val})}>
                    <SelectTrigger className="h-10 text-sm border-slate-200 rounded-md">
                       <SelectValue placeholder="Pilih Fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="E" className="text-sm">Fase E</SelectItem>
                      <SelectItem value="F" className="text-sm">Fase F</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
            </div>

            {/* Koordinator */}
            <div className="grid grid-cols-7 items-center gap-4">
              <Label className="col-span-2 text-sm font-bold text-slate-700">Koordinator</Label>
              <div className="col-span-1 text-center font-bold text-slate-700">:</div>
              <div className="col-span-4">
                 <Select value={formData.ptk_id} onValueChange={(val) => setFormData({...formData, ptk_id: val})}>
                    <SelectTrigger className="h-10 text-sm border-slate-200 rounded-md">
                       <SelectValue placeholder="Pilih Koordinator" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {guruList.map(g => (
                        <SelectItem key={g.ptk_id} value={g.ptk_id} className="text-sm">
                          {g.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white px-6 py-4 border-t gap-2 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={loadingAction}
              className="h-10 text-white bg-slate-400 hover:bg-slate-500 border-none px-6"
            >
              Close
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loadingAction}
              className="h-10 bg-indigo-500 hover:bg-indigo-600 text-white px-6 gap-2"
            >
              {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Kokurikuler Sub-Modal */}
      <Dialog open={dataModalOpen} onOpenChange={setDataModalOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-4xl bg-white shadow-2xl">
          <DialogHeader className="bg-[#1e3a8a] px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-1.5 rounded-md">
                <ClipboardCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-sm font-bold uppercase tracking-tight">
                  Data Kokurikuler Kelompok
                </DialogTitle>
                <p className="text-blue-100/70 text-[9px] font-medium uppercase mt-0.5">
                  {selectedKelompok?.nm_kelompok} • Fase {selectedKelompok?.fase}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-3 min-h-[300px]">
            {!isAddingKegiatan ? (
              /* LAYAR 1: DAFTAR KEGIATAN TERSIMPAN */
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Kegiatan Terpilih <span className="text-[#1e3a8a]">({assignedKegiatan.length})</span>
                  </p>
                  <Button 
                    onClick={handleSwitchToAdd}
                    className="h-7 bg-[#1e3a8a] hover:bg-black text-white text-[10px] font-bold gap-1.5 px-3 uppercase tracking-tighter shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Kokurikuler
                  </Button>
                </div>

                <div className="border border-slate-100 rounded-sm overflow-hidden shadow-sm shadow-blue-50/50">
                  <Table className="relative">
                    <TableHeader className="bg-[#0f172a] sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-white font-bold text-[9px] h-9 text-center w-10 border-r border-white/5 uppercase">No</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-9 w-32 border-r border-white/5 uppercase">Tema</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-9 w-48 border-r border-white/5 uppercase">Kegiatan</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-9 border-r border-white/5 uppercase">Tujuan Akhir</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-9 text-center w-24 uppercase">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDataModal ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1e3a8a] opacity-40" />
                          </TableCell>
                        </TableRow>
                      ) : assignedKegiatan.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 px-4 text-slate-300 text-[10px] italic font-medium">
                            Belum ada kegiatan yang dipilih.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignedKegiatan.map((item, idx) => (
                          <TableRow key={item.idklp_kokurikuler} className="text-[10px] border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                            <TableCell className="py-1.5 text-center border-r border-slate-100 text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="py-1.5 border-r border-slate-100 font-medium text-slate-500">{item.tema || '-'}</TableCell>
                            <TableCell className="py-1.5 font-bold text-[#1e3a8a] border-r border-slate-100 leading-relaxed">{item.nama_kegiatan}</TableCell>
                            <TableCell className="py-1.5 border-r border-slate-100 leading-relaxed pr-3">
                              {item.targets && item.targets.length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(
                                    item.targets.reduce((acc: any, curr: any) => {
                                      if (!acc[curr.nama_dimensi]) acc[curr.nama_dimensi] = [];
                                      acc[curr.nama_dimensi].push(curr.nama_subdimensi);
                                      return acc;
                                    }, {})
                                  ).map(([dimensi, subdimensiList]: [string, any], idx) => (
                                    <div key={idx} className="flex items-start gap-1 leading-snug">
                                      <span className="text-[#1e3a8a]">•</span>
                                      <div className="flex-1">
                                        <span className="font-bold text-slate-800 uppercase tracking-tighter text-[9px]">{dimensi} :</span>
                                        <div className="text-blue-600 font-medium ml-0.5 text-[9px]">
                                          {subdimensiList.join(", ")}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[9px]">Belum ada target capaian terpilih.</span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveKegiatan(item.idklp_kokurikuler)}
                                disabled={loadingAction}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                title="Hapus"
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

                {assignedKegiatan.length > 0 && (
                  <div className="flex justify-start">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveAllKegiatan}
                      disabled={loadingAction || assignedKegiatan.length === 0}
                      className="h-6 text-[9px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 uppercase tracking-widest gap-1 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Kosongkan Kegiatan
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* LAYAR 2: PILIH KEGIATAN PROJEK */
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50/80 p-2 rounded-sm border border-slate-100">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                    <Input 
                      placeholder="Cari kegiatan..."
                      value={searchKegiatanQuery}
                      onChange={(e) => setSearchKegiatanQuery(e.target.value)}
                      className="pl-7 h-7 text-[10px] border-slate-200 bg-white"
                    />
                  </div>
                  <Button 
                    onClick={() => setIsAddingKegiatan(false)}
                    variant="ghost"
                    className="h-7 text-slate-500 text-[10px] font-bold gap-1.5 px-3 hover:bg-slate-200/50 uppercase tracking-tighter"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    KEMBALI
                  </Button>
                </div>

                <div className="border border-slate-100 rounded-sm overflow-hidden max-h-[350px] overflow-y-auto scrollbar-thin shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#1e3a8a] sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-white text-[9px] font-bold h-8 uppercase text-center w-10">No</TableHead>
                        <TableHead className="text-white text-[9px] font-bold h-8 uppercase w-32">Tema</TableHead>
                        <TableHead className="text-white text-[9px] font-bold h-8 uppercase">Nama Kegiatan</TableHead>
                        <TableHead className="text-white text-[9px] font-bold h-8 uppercase text-center w-24">Opsi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableKegiatan.filter(k => 
                        k.nama_kegiatan.toLowerCase().includes(searchKegiatanQuery.toLowerCase())
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20 text-slate-300 text-[10px] italic font-bold uppercase tracking-widest">
                            Kegiatan tidak ditemukan.
                          </TableCell>
                        </TableRow>
                      ) : (
                        availableKegiatan
                          .filter(k => k.nama_kegiatan.toLowerCase().includes(searchKegiatanQuery.toLowerCase()))
                          .map((item, idx) => (
                            <TableRow key={item.id_kegiatan} className="text-[10px] border-b border-slate-50 hover:bg-blue-50/30">
                              <TableCell className="py-1.5 text-center text-slate-400">{idx + 1}</TableCell>
                              <TableCell className="py-1.5 text-slate-500 font-medium">{item.tema || 'Tema Projek'}</TableCell>
                              <TableCell className="py-1.5 font-bold text-[#1e3a8a]">{item.nama_kegiatan}</TableCell>
                              <TableCell className="py-1.5 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleAssignKegiatan(item.id_kegiatan)}
                                  disabled={loadingAction}
                                  className="h-6 text-[9px] font-bold text-white bg-[#1e3a8a] border-none gap-1 px-3 hover:bg-black rounded-sm shadow-sm transition-all"
                                >
                                  <Plus className="h-3 w-3" />
                                  PILIH
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 px-5 py-3 border-t flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setDataModalOpen(false)}
              className="h-8 text-slate-500 border-slate-200 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-wider px-6 shadow-sm"
            >
              Tutup Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anggota Kelompok Sub-Modal */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-3xl bg-white shadow-2xl">
          <DialogHeader className="bg-[#1e3a8a] px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-1.5 rounded-md">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-sm font-bold uppercase tracking-tight">
                  Data Anggota Kelompok
                </DialogTitle>
                <p className="text-blue-100/70 text-[9px] font-medium uppercase mt-0.5">
                  {selectedKelompok?.nm_kelompok} • Fase {selectedKelompok?.fase}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-3 min-h-[300px]">
            {!isAddingMember ? (
              /* LAYAR 1: DAFTAR ANGGOTA */
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Anggota Saat Ini <span className="text-[#1e3a8a]">({memberList.length})</span>
                  </p>
                  <Button 
                    onClick={handleSwitchToAddMember}
                    className="h-7 bg-[#1e3a8a] hover:bg-black text-white text-[10px] font-bold gap-1.5 px-3 uppercase tracking-tighter"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Anggota
                  </Button>
                </div>

                <div className="border border-slate-100 rounded-sm overflow-hidden max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 shadow-sm transition-all hover:border-blue-100">
                  <Table className="relative">
                    <TableHeader className="bg-[#0f172a] sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-white font-bold text-[9px] h-8 text-center w-10 border-r border-white/5 uppercase">No</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 border-r border-white/5 uppercase">Nama Siswa</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 border-r border-white/5 uppercase">NISN</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 border-r border-white/5 uppercase">Kelas</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 text-center w-24 border-white/5 uppercase">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMemberModal ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1e3a8a] opacity-40" />
                          </TableCell>
                        </TableRow>
                      ) : memberList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 px-4 text-slate-300 text-[10px] italic font-medium">
                            Anggota belum terdaftar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        memberList.map((item, idx) => (
                          <TableRow key={item.anggota_kelompok_id} className="text-[10px] border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                            <TableCell className="py-1.5 text-center border-r border-slate-100 text-slate-400 font-medium">{idx + 1}</TableCell>
                            <TableCell className="py-1.5 font-bold text-[#1e3a8a] border-r border-slate-100 uppercase">{item.nm_siswa}</TableCell>
                            <TableCell className="py-1.5 border-r border-slate-100 text-slate-500">{item.nisn || '-'}</TableCell>
                            <TableCell className="py-1.5 border-r border-slate-100 uppercase text-slate-500 font-medium">{item.nama_kelas_reguler || '-'}</TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveMember(item.anggota_kelompok_id)}
                                disabled={loadingAction}
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                title="Hapus Anggota"
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
                
                {memberList.length > 0 && (
                  <div className="flex justify-start">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemoveAllMembers}
                      disabled={loadingAction}
                      className="h-6 text-[9px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 uppercase tracking-widest gap-1 px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus Semua Anggota
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* LAYAR 2: TAMBAH ANGGOTA */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-50/80 p-2 rounded-sm border border-slate-100">
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 max-w-[240px]">
                      <Select 
                        value={selectedRombelId} 
                        onValueChange={(val) => {
                          setSelectedRombelId(val);
                          fetchAvailableSiswa(val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-[10px] border-slate-200 bg-white font-bold text-slate-600">
                          <SelectValue placeholder="PILIH KELAS REGULER" />
                        </SelectTrigger>
                        <SelectContent>
                          {classList.map((c) => (
                            <SelectItem key={c.rombongan_belajar_id} value={c.rombongan_belajar_id} className="text-[10px] uppercase font-medium">
                              {c.nm_kelas}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => handleAssignMember(availableSiswa.map(s => s.peserta_didik_id))}
                      disabled={loadingAction || availableSiswa.length === 0}
                      className="h-8 bg-[#1e3a8a] hover:bg-black text-white text-[10px] font-bold gap-1.5 px-3 uppercase tracking-tighter"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Semua
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setIsAddingMember(false)}
                      variant="ghost"
                      className="h-8 text-slate-500 text-[10px] font-bold gap-1.5 px-3 hover:bg-slate-200/50 uppercase tracking-tighter"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      KEMBALI
                    </Button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-sm overflow-hidden max-h-[350px] overflow-y-auto scrollbar-thin shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#1e3a8a] sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-white font-bold text-[9px] h-8 text-center w-10 uppercase">No</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 uppercase">Nama Siswa</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 uppercase">NISN</TableHead>
                        <TableHead className="text-white font-bold text-[9px] h-8 uppercase text-center w-28">Opsi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMemberModal ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1e3a8a] opacity-40" />
                          </TableCell>
                        </TableRow>
                      ) : selectedRombelId && availableSiswa.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-[10px] italic">
                            Tidak ada siswa ditemukan di kelas ini.
                          </TableCell>
                        </TableRow>
                      ) : !selectedRombelId ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-16 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                            Pilih kelas reguler untuk menarik data siswa
                          </TableCell>
                        </TableRow>
                      ) : (
                        availableSiswa.map((item, idx) => (
                          <TableRow key={item.peserta_didik_id} className="text-[10px] border-b border-slate-50 hover:bg-blue-50/30">
                            <TableCell className="py-1.5 text-center w-10 text-slate-400">{idx + 1}</TableCell>
                            <TableCell className="py-1.5 uppercase font-bold text-slate-600">{item.nm_siswa}</TableCell>
                            <TableCell className="py-1.5 text-slate-500 font-medium">{item.nisn}</TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleAssignMember(item.peserta_didik_id)}
                                disabled={loadingAction}
                                className="h-6 text-[9px] font-bold text-white bg-[#1e3a8a] border-none gap-1 px-3 hover:bg-black rounded-sm transition-all"
                              >
                                <Plus className="h-3 w-3" />
                                TAMBAHKAN
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 px-5 py-3 border-t flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setMemberModalOpen(false)}
              className="h-8 text-slate-500 border-slate-200 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-wider px-6 shadow-sm"
            >
              Tutup Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog - Matched with Screenshot */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="p-0 overflow-hidden border-none sm:max-w-sm">
          <div className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Kelompok?</h3>
            <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
              Anda akan menghapus kelompok <span className="font-bold text-red-600">{itemToDelete?.nm_kelompok}</span>.
            </p>
            <div className="flex gap-2 justify-center w-full">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={loadingAction}
                className="h-9 text-[11px] font-bold uppercase flex-1 border-slate-200 bg-white"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={loadingAction}
                className="h-9 text-[11px] font-bold uppercase flex-1 bg-red-600 hover:bg-red-700 shadow-md"
              >
                {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus Sekarang'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
