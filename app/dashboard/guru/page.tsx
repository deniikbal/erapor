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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { PTK } from '@/lib/db';
import {
  Users,
  Pencil,
  Loader2,
  UserCheck,
  GraduationCap,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DataGuruPage() {
  const [guruList, setGuruList] = useState<PTK[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedGuru, setSelectedGuru] = useState<PTK | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: '',
    gelar_depan: '',
    gelar_belakang: '',
  });

  // Filter guru based on search
  const filteredGuru = guruList.filter((guru) =>
    guru.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGuru.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGuru.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  useEffect(() => {
    fetchGuru();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchGuru = async () => {
    try {
      const response = await fetch('/api/guru');
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data guru');
        return;
      }

      setGuruList(data.guru);
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (guru: PTK) => {
    setSelectedGuru(guru);
    setFormData({
      nama: guru.nama || '',
      gelar_depan: guru.gelar_depan || '',
      gelar_belakang: guru.gelar_belakang || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveGuru = async () => {
    if (!selectedGuru) return;

    const trimmedNama = formData.nama.trim();
    if (!trimmedNama) {
      const errorMessage = 'Nama guru tidak boleh kosong';
      setModalError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const response = await fetch('/api/guru', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ptk_id: selectedGuru.ptk_id,
          nama: trimmedNama,
          gelar_depan: formData.gelar_depan.trim(),
          gelar_belakang: formData.gelar_belakang.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data.error || 'Gagal mengupdate data';
        setModalError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setGuruList(prev => prev.map(g =>
        g.ptk_id === selectedGuru.ptk_id
          ? {
              ...g,
              nama: trimmedNama,
              gelar_depan: formData.gelar_depan,
              gelar_belakang: formData.gelar_belakang,
            }
          : g
      ));

      setIsModalOpen(false);

      const displayName = `${formData.gelar_depan} ${trimmedNama} ${formData.gelar_belakang}`.trim().replace(/\s+/g, ' ');
      toast.success('Data guru berhasil diupdate', {
        description: displayName,
      });
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan saat menyimpan data';
      setModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getJenisPTKLabel = (jenisPtkId: string) => {
    const mapping: { [key: string]: string } = {
      '91': 'Kepala Sekolah',
      '92': 'Guru',
      '93': 'Guru BK',
      '94': 'Tenaga Administrasi',
    };
    return mapping[jenisPtkId] || `Kode ${jenisPtkId}`;
  };

  // Stats computed from guru data
  const totalGuru = guruList.length;
  const guruPria = guruList.filter(g => g.jenis_kelamin === 'L').length;
  const guruWanita = guruList.filter(g => g.jenis_kelamin === 'P').length;

  const statisticsCards = [
    {
      title: 'Total Guru',
      value: loading ? null : totalGuru,
      description: 'Pendidik & tenaga kependidikan',
      icon: Users,
      gradient: 'from-blue-600 to-blue-800',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Guru Laki-laki',
      value: loading ? null : guruPria,
      description: `${totalGuru > 0 ? ((guruPria / totalGuru) * 100).toFixed(0) : 0}% dari total`,
      icon: UserCheck,
      gradient: 'from-indigo-500 to-indigo-700',
      lightBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
    {
      title: 'Guru Perempuan',
      value: loading ? null : guruWanita,
      description: `${totalGuru > 0 ? ((guruWanita / totalGuru) * 100).toFixed(0) : 0}% dari total`,
      icon: GraduationCap,
      gradient: 'from-emerald-500 to-emerald-700',
      lightBg: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Guru</h1>
          <p className="text-muted-foreground">Kelola data pendidik dan tenaga kependidikan</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-20 h-28 w-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 rounded-full bg-white/10" />

        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/80">
              Manajemen Guru
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">
              Data Pendidik & Tenaga Kependidikan
            </h1>
            <p className="mt-1 text-sm text-blue-200/70">
              Kelola data guru, gelar akademik, dan pantau informasi PTK
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:mt-0">
            <Users className="h-4 w-4 text-blue-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">Total PTK</p>
              <p className="text-sm font-black text-white">{totalGuru} Orang</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statisticsCards.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:ring-blue-200"
          >
            <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient}`} />
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {stat.title}
                </p>
                {stat.value === null ? (
                  <div className="mt-1 h-7 w-16 animate-pulse rounded-md bg-slate-100" />
                ) : (
                  <p className={`mt-0.5 text-3xl font-black ${stat.textColor}`}>
                    {stat.value.toLocaleString('id-ID')}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-slate-400">{stat.description}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.lightBg} transition-transform duration-200 group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daftar Guru Table */}
      <Card className="rounded-xl shadow-md border-none overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1e3a8a]" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">
                Daftar Guru & Tenaga Kependidikan
              </CardTitle>
            </div>
            <CardDescription className="text-[10px]">
              {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuru.length)} dari {filteredGuru.length}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nama guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm pl-9 h-9 text-xs"
            />
          </div>

          <div className="rounded-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-white font-bold text-[10px] uppercase w-[50px] border-r border-white/10 text-center h-10">No</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Nama PTK</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">NIP</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">NUPTK</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10">JK</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Jenis PTK</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase text-right pr-4 h-10">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                      {searchQuery ? 'Tidak ada guru yang cocok dengan pencarian' : 'Tidak ada data guru'}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((guru, index) => (
                    <TableRow key={guru.ptk_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100 h-10">
                      <TableCell className="text-center font-bold text-slate-400 text-[10px] border-r py-1">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell className="border-r py-1">
                        <div className="font-semibold text-[12px] text-[#1e3a8a]">
                          {guru.gelar_depan && <span className="text-[10px] font-normal text-slate-500 mr-1">{guru.gelar_depan}</span>}
                          {guru.nama}
                          {guru.gelar_belakang && <span className="text-[10px] font-normal text-slate-500 ml-1">, {guru.gelar_belakang}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="border-r py-1 text-xs font-medium text-slate-600">{guru.nip || '-'}</TableCell>
                      <TableCell className="border-r py-1 text-xs text-slate-500">{guru.nuptk || '-'}</TableCell>
                      <TableCell className="text-center border-r py-1">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {guru.jenis_kelamin}
                        </span>
                      </TableCell>
                      <TableCell className="border-r py-1 text-xs text-slate-600">{getJenisPTKLabel(guru.jenis_ptk_id)}</TableCell>
                      <TableCell className="text-right py-1 pr-4">
                        <Button
                          onClick={() => handleEditClick(guru)}
                          size="sm"
                          className="h-7 px-3 bg-[#1e3a8a] hover:bg-indigo-900 text-white text-[10px] font-bold shadow-sm"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          EDIT
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-xs text-muted-foreground">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuru.length)} dari {filteredGuru.length} data
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>

                <div className="flex gap-1">
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
                          onClick={() => paginate(page)}
                          className={`h-8 w-8 p-0 text-xs ${currentPage === page ? "bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" : ""}`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-1 text-xs text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Guru Modal (nama + gelar) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Data Guru</DialogTitle>
            <DialogDescription>
              Update nama dan gelar untuk guru ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Guru<span className="text-red-500"> *</span></Label>
              <Input
                id="nama"
                placeholder="Contoh: Budi Santoso"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                disabled={isSaving}
                required
              />
              <p className="text-xs text-muted-foreground">
                Nama lengkap tanpa gelar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gelar_depan">Gelar Depan</Label>
              <Input
                id="gelar_depan"
                placeholder="Contoh: Dr., Drs., Prof."
                value={formData.gelar_depan}
                onChange={(e) => setFormData({ ...formData, gelar_depan: e.target.value })}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Gelar akademik yang ditempatkan di depan nama
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gelar_belakang">Gelar Belakang</Label>
              <Input
                id="gelar_belakang"
                placeholder="Contoh: S.Pd., M.Pd., S.Si."
                value={formData.gelar_belakang}
                onChange={(e) => setFormData({ ...formData, gelar_belakang: e.target.value })}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Gelar akademik yang ditempatkan di belakang nama
              </p>
            </div>

            {modalError && (
              <Alert variant="destructive">
                <AlertDescription>{modalError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveGuru}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
