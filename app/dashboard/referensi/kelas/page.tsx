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

  const renderKelasTable = (kelas: Kelas[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">No</TableHead>
            <TableHead>Nama Kelas</TableHead>
            <TableHead className="text-center">Jenis Rombel</TableHead>
            <TableHead className="text-center">Tingkat</TableHead>
            <TableHead>Nama Wali Kelas</TableHead>
            <TableHead className="text-center">Jumlah Siswa</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kelas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada data kelas
              </TableCell>
            </TableRow>
          ) : (
            kelas.map((item, index) => (
              <TableRow key={item.rombongan_belajar_id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">{item.nm_kelas}</TableCell>
                <TableCell className="text-center">{item.jenis_rombel}</TableCell>
                <TableCell className="text-center">{item.tingkat_pendidikan_id || '-'}</TableCell>
                <TableCell>{item.nama_wali_kelas || '-'}</TableCell>
                <TableCell className="text-center">{item.jumlah_siswa || 0}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    onClick={() => handleAnggotaClick(item)} 
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Anggota
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Kelas</h1>
          <p className="text-muted-foreground">Kelola data kelas dan rombongan belajar</p>
        </div>
        <Card>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Kelas</h1>
        <p className="text-muted-foreground">Kelola data kelas dan rombongan belajar</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            <CardTitle>Daftar Kelas</CardTitle>
          </div>
          <CardDescription>
            Total: {kelasList.length} kelas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reguler" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reguler">Reguler ({kelasReguler.length})</TabsTrigger>
              <TabsTrigger value="pilihan">Pilihan ({kelasPilihan.length})</TabsTrigger>
              <TabsTrigger value="ekskul">Ekskul ({kelasEkskul.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reguler" className="mt-4">
              {renderKelasTable(kelasReguler)}
            </TabsContent>
            
            <TabsContent value="pilihan" className="mt-4">
              {renderKelasTable(kelasPilihan)}
            </TabsContent>
            
            <TabsContent value="ekskul" className="mt-4">
              {renderKelasTable(kelasEkskul)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal Anggota Kelas */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anggota Kelas</DialogTitle>
            <DialogDescription>
              Daftar siswa di kelas: {selectedKelas?.nm_kelas}
            </DialogDescription>
          </DialogHeader>
          
          {loadingAnggota ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Rombel</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anggotaList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Tidak ada siswa di kelas ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    anggotaList.map((siswa, index) => (
                      <TableRow key={siswa.peserta_didik_id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{siswa.nm_siswa}</TableCell>
                        <TableCell>{siswa.nisn || '-'}</TableCell>
                        <TableCell>{siswa.nm_kelas}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            onClick={() => handleDeleteAnggota(siswa)} 
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === siswa.anggota_rombel_id}
                          >
                            {deletingId === siswa.anggota_rombel_id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Menghapus...
                              </>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
