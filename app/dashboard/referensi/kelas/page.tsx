'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { Kelas } from '@/lib/db';
import {
  School,
  Users,
  Loader2,
  BookOpen,
  BookMarked,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

interface SiswaAnggota {
  peserta_didik_id: string;
  nisn: string | null;
  nm_siswa: string;
  nm_kelas: string;
  anggota_rombel_id: string;
}

export default function DataKelasPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination for each tab
  const [currentPageReguler, setCurrentPageReguler] = useState(1);
  const [currentPagePilihan, setCurrentPagePilihan] = useState(1);
  const [currentPageEkskul, setCurrentPageEkskul] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal Anggota
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null);
  const [anggotaList, setAnggotaList] = useState<SiswaAnggota[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchKelas();
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
      setError('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnggota = async (rombongan_belajar_id: string) => {
    setLoadingAnggota(true);
    try {
      const response = await fetch(`/api/kelas/${rombongan_belajar_id}/anggota`);
      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Gagal mengambil data anggota kelas');
        return;
      }

      setAnggotaList(data.siswa || []);
    } catch (err) {
      toast.error('Gagal mengambil data anggota kelas');
    } finally {
      setLoadingAnggota(false);
    }
  };

  const handleAnggotaClick = async (kelas: Kelas) => {
    setSelectedKelas(kelas);
    setIsModalOpen(true);
    setAnggotaList([]);
    fetchAnggota(kelas.rombongan_belajar_id);
  };

  const handleDeleteAnggota = async (anggota: SiswaAnggota) => {
    if (!confirm(`Hapus ${anggota.nm_siswa} dari kelas ${anggota.nm_kelas}?`)) {
      return;
    }

    setDeletingId(anggota.anggota_rombel_id);
    try {
      const response = await fetch(`/api/kelas/anggota/${anggota.anggota_rombel_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Gagal menghapus anggota kelas');
        return;
      }

      toast.success('Siswa berhasil dihapus dari kelas');

      if (selectedKelas) {
        fetchAnggota(selectedKelas.rombongan_belajar_id);
        fetchKelas();
      }
    } catch (err) {
      toast.error('Gagal menghapus anggota kelas');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter kelas by jenis_rombel
  const kelasReguler = kelasList.filter(k => {
    const jenis = Number(k.jenis_rombel);
    return jenis === 1 || jenis === 9;
  });
  const kelasPilihan = kelasList.filter(k => Number(k.jenis_rombel) === 16);
  const kelasEkskul = kelasList.filter(k => Number(k.jenis_rombel) === 51);

  // Pagination helpers
  const getPaginatedData = (data: Kelas[], currentPage: number) => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      items: data.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(data.length / itemsPerPage),
      indexOfFirstItem,
      indexOfLastItem: Math.min(indexOfLastItem, data.length),
    };
  };

  const renderPagination = (totalPages: number, currentPage: number, setCurrentPage: (page: number) => void, totalItems: number, indexOfFirstItem: number, indexOfLastItem: number) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-xs text-muted-foreground">
          Menampilkan {indexOfFirstItem + 1} - {indexOfLastItem} dari {totalItems} data
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 text-xs"
          >
            Prev
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
                    onClick={() => setCurrentPage(page)}
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
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const renderKelasTable = (kelas: Kelas[], currentPage: number, setCurrentPage: (page: number) => void) => {
    const { items, totalPages, indexOfFirstItem, indexOfLastItem } = getPaginatedData(kelas, currentPage);

    return (
      <>
        <div className="rounded-sm border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-[#1e3a8a]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[50px] text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10 text-center">No</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10">Nama Kelas</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10">Jenis Rombel</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10">Tingkat</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10">Wali Kelas</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-10 uppercase tracking-wider border-r border-white/10">Siswa</TableHead>
                <TableHead className="text-right text-white font-bold text-[10px] h-10 uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    Tidak ada data kelas
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.rombongan_belajar_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100 h-10">
                    <TableCell className="text-center font-bold text-slate-400 text-[10px] border-r py-1">{indexOfFirstItem + index + 1}</TableCell>
                    <TableCell className="border-r py-1 font-bold text-[#1e3a8a] text-xs">{item.nm_kelas}</TableCell>
                    <TableCell className="text-center border-r py-1 text-[10px] font-medium text-slate-500">{item.jenis_rombel}</TableCell>
                    <TableCell className="text-center border-r py-1 text-xs font-bold text-slate-600">{item.tingkat_pendidikan_id || '-'}</TableCell>
                    <TableCell className="border-r py-1 text-xs text-slate-700">{item.nama_wali_kelas || '-'}</TableCell>
                    <TableCell className="text-center border-r py-1">
                      <span className="text-[10px] font-black bg-blue-50 text-[#1e3a8a] px-2 py-0.5 rounded-full border border-blue-100">
                        {item.jumlah_siswa || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-1 pr-4">
                      <Button
                        onClick={() => handleAnggotaClick(item)}
                        size="sm"
                        className="h-7 px-3 bg-[#1e3a8a] hover:bg-indigo-900 text-white text-[10px] font-bold shadow-sm"
                      >
                        <Users className="h-3 w-3 mr-1.5" />
                        Anggota
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {renderPagination(totalPages, currentPage, setCurrentPage, kelas.length, indexOfFirstItem, indexOfLastItem)}
      </>
    );
  };

  // Stats
  const totalKelas = kelasList.length;
  const totalReguler = kelasReguler.length;
  const totalPilihan = kelasPilihan.length;
  const totalEkskul = kelasEkskul.length;

  const statisticsCards = [
    {
      title: 'Total Kelas',
      value: loading ? null : totalKelas,
      description: 'Rombongan belajar aktif',
      icon: School,
      gradient: 'from-blue-600 to-blue-800',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Kelas Reguler',
      value: loading ? null : totalReguler,
      description: 'Rombel reguler (1 & 9)',
      icon: BookOpen,
      gradient: 'from-indigo-500 to-indigo-700',
      lightBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
    {
      title: 'Kelas Pilihan',
      value: loading ? null : totalPilihan,
      description: 'Rombel pilihan (16)',
      icon: BookMarked,
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
          <h1 className="text-3xl font-bold tracking-tight">Data Kelas</h1>
          <p className="text-muted-foreground">Kelola data kelas dan rombongan belajar</p>
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
              Referensi Kelas
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">
              Data Kelas & Rombongan Belajar
            </h1>
            <p className="mt-1 text-sm text-blue-200/70">
              Kelola rombongan belajar reguler, pilihan, dan ekstrakurikuler
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:mt-0">
            <School className="h-4 w-4 text-blue-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">Total Kelas</p>
              <p className="text-sm font-black text-white">{totalKelas} Kelas</p>
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

      {/* Daftar Kelas Table */}
      <Card className="rounded-xl shadow-md border-none overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-[#1e3a8a]" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">
                Daftar Kelas
              </CardTitle>
            </div>
            <CardDescription className="text-[10px]">
              TOTAL: {totalKelas} | Reguler: {totalReguler} | Pilihan: {totalPilihan} | Ekskul: {totalEkskul}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="reguler" className="w-full">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-lg h-9">
              <TabsTrigger value="reguler" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">REGULER ({totalReguler})</TabsTrigger>
              <TabsTrigger value="pilihan" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">PILIHAN ({totalPilihan})</TabsTrigger>
              <TabsTrigger value="ekskul" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">EKSKUL ({totalEkskul})</TabsTrigger>
            </TabsList>

            <TabsContent value="reguler" className="mt-4">
              {renderKelasTable(kelasReguler, currentPageReguler, setCurrentPageReguler)}
            </TabsContent>

            <TabsContent value="pilihan" className="mt-4">
              {renderKelasTable(kelasPilihan, currentPagePilihan, setCurrentPagePilihan)}
            </TabsContent>

            <TabsContent value="ekskul" className="mt-4">
              {renderKelasTable(kelasEkskul, currentPageEkskul, setCurrentPageEkskul)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal Anggota Kelas */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="py-3 px-6 bg-[#1e3a8a] text-white">
            <DialogTitle className="text-white text-base">Anggota Kelas</DialogTitle>
            <DialogDescription className="text-blue-100 text-[11px]">
               Daftar siswa terdaftar di kelas <span className="font-black text-white">{selectedKelas?.nm_kelas}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-0">
          {loadingAnggota ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Mengambil data...</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-[#1e3a8a] sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[50px] text-white font-bold text-[10px] h-9 uppercase pl-4 border-r border-white/10 text-center">No</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase border-r border-white/10">Nama Siswa</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase border-r border-white/10">NISN</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase border-r border-white/10">Rombel</TableHead>
                    <TableHead className="text-right text-white font-bold text-[10px] h-9 uppercase pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anggotaList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-[11px] text-slate-400 italic">
                        Tidak ada siswa di kelas ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    anggotaList.map((siswa, index) => (
                      <TableRow key={siswa.peserta_didik_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100">
                        <TableCell className="py-1.5 pl-4 text-center text-xs font-medium text-slate-400 border-r">{index + 1}</TableCell>
                        <TableCell className="py-1.5 text-xs font-bold text-[#1e3a8a] border-r">{siswa.nm_siswa}</TableCell>
                        <TableCell className="py-1.5 text-xs font-medium text-slate-500 border-r">{siswa.nisn || '-'}</TableCell>
                        <TableCell className="py-1.5 text-[10px] font-bold text-slate-400 border-r">{siswa.nm_kelas}</TableCell>
                        <TableCell className="py-1.5 text-right pr-4">
                          <Button
                            onClick={() => handleDeleteAnggota(siswa)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all uppercase"
                            disabled={deletingId === siswa.anggota_rombel_id}
                          >
                            {deletingId === siswa.anggota_rombel_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Hapus'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
