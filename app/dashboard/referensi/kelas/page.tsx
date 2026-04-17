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
import { School, Users, Loader2 } from 'lucide-react';
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

      console.log('Fetch kelas response:', data);

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data kelas');
        console.error('Error response:', data);
        return;
      }

      console.log('Kelas list:', data.kelas);
      console.log('Debug info:', data.debug);
      setKelasList(data.kelas || []);
    } catch (err) {
      console.error('Fetch kelas error:', err);
      setError('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnggota = async (rombongan_belajar_id: string) => {
    setLoadingAnggota(true);
    try {
      const url = `/api/kelas/${rombongan_belajar_id}/anggota`;
      console.log('Fetching anggota from:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('Anggota response:', data);

      if (!response.ok || data.error) {
        console.error('Error fetching anggota:', data);
        toast.error(data.error || 'Gagal mengambil data anggota kelas');
        return;
      }

      console.log('Setting anggota list:', data.siswa?.length, 'siswa');
      setAnggotaList(data.siswa || []);
    } catch (err) {
      console.error('Fetch anggota error:', err);
      toast.error('Gagal mengambil data anggota kelas');
    } finally {
      setLoadingAnggota(false);
    }
  };

  const handleAnggotaClick = async (kelas: Kelas) => {
    console.log('Opening anggota modal for kelas:', kelas);
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

      // Refresh anggota list
      if (selectedKelas) {
        fetchAnggota(selectedKelas.rombongan_belajar_id);

        // Also refresh kelas list to update jumlah_siswa
        fetchKelas();
      }
    } catch (err) {
      console.error('Delete anggota error:', err);
      toast.error('Gagal menghapus anggota kelas');
    } finally {
      setDeletingId(null);
    }
  };



  // Filter kelas by jenis_rombel (convert to number for comparison)
  const kelasReguler = kelasList.filter(k => {
    const jenis = Number(k.jenis_rombel);
    return jenis === 1 || jenis === 9;
  });
  const kelasPilihan = kelasList.filter(k => Number(k.jenis_rombel) === 16);
  const kelasEkskul = kelasList.filter(k => Number(k.jenis_rombel) === 51);

  console.log('Filtered - Reguler:', kelasReguler.length, 'Pilihan:', kelasPilihan.length, 'Ekskul:', kelasEkskul.length);

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
        <div className="text-sm text-muted-foreground">
          Menampilkan {indexOfFirstItem + 1} - {indexOfLastItem} dari {totalItems} data
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-7 text-[10px] font-bold border-slate-200"
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
                    className={currentPage === page ? "bg-[#1e3a8a] hover:bg-black h-7 w-7 p-0 text-[10px] font-bold" : "h-7 w-7 p-0 text-[10px] border-slate-200"}
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
            className="h-7 text-[10px] font-bold border-slate-200"
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
                <TableHead className="w-[50px] text-white font-bold text-[10px] h-9 uppercase tracking-wider pl-4">No</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Kelas</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider">Jenis Rombel</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider">Tingkat</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Wali Kelas</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider">Siswa</TableHead>
                <TableHead className="text-right text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Tidak ada data kelas
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.rombongan_belajar_id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="py-1.5 pl-4 text-xs font-medium text-slate-400">{indexOfFirstItem + index + 1}</TableCell>
                    <TableCell className="py-1.5 font-bold text-[#1e3a8a] text-xs">{item.nm_kelas}</TableCell>
                    <TableCell className="py-1.5 text-center text-[10px] font-medium text-slate-500">{item.jenis_rombel}</TableCell>
                    <TableCell className="py-1.5 text-center text-xs font-bold text-slate-600">{item.tingkat_pendidikan_id || '-'}</TableCell>
                    <TableCell className="py-1.5 text-xs text-slate-700">{item.nama_wali_kelas || '-'}</TableCell>
                    <TableCell className="py-1.5 text-center">
                      <span className="text-[10px] font-black bg-blue-50 text-[#1e3a8a] px-2 py-0.5 rounded-full border border-blue-100">
                        {item.jumlah_siswa || 0}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right pr-4">
                      <Button
                        onClick={() => handleAnggotaClick(item)}
                        size="sm"
                        className="h-7 px-3 bg-[#1e3a8a] hover:bg-black text-white text-[10px] font-bold uppercase transition-all"
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Kelas</h1>
          <p className="text-muted-foreground">Kelola data kelas dan rombongan belajar</p>
        </div>
        <Card className="rounded-sm border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Data Kelas
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Kelola rombongan belajar reguler, pilihan, dan ekstrakurikuler.
        </p>
      </div>

      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Kelas</CardTitle>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">TOTAL: {kelasList.length}</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reguler" className="w-full">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-lg h-9">
              <TabsTrigger value="reguler" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">REGULER ({kelasReguler.length})</TabsTrigger>
              <TabsTrigger value="pilihan" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">PILIHAN ({kelasPilihan.length})</TabsTrigger>
              <TabsTrigger value="ekskul" className="rounded-md text-[11px] font-black data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] h-7">EKSKUL ({kelasEkskul.length})</TabsTrigger>
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
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent shadow-sm">
                    <TableHead className="w-[50px] font-black text-[10px] h-9 uppercase pl-4">No</TableHead>
                    <TableHead className="font-black text-[10px] h-9 uppercase">Nama Siswa</TableHead>
                    <TableHead className="font-black text-[10px] h-9 uppercase">NISN</TableHead>
                    <TableHead className="font-black text-[10px] h-9 uppercase">Rombel</TableHead>
                    <TableHead className="text-right font-black text-[10px] h-9 uppercase pr-4 text-rose-500">Aksi</TableHead>
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
                      <TableRow key={siswa.peserta_didik_id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-1.5 pl-4 text-xs font-medium text-slate-400">{index + 1}</TableCell>
                        <TableCell className="py-1.5 text-xs font-bold text-slate-700">{siswa.nm_siswa}</TableCell>
                        <TableCell className="py-1.5 text-xs font-medium text-slate-500">{siswa.nisn || '-'}</TableCell>
                        <TableCell className="py-1.5 text-[10px] font-bold text-slate-400">{siswa.nm_kelas}</TableCell>
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
