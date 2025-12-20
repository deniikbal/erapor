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
import { Users, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DataGuruPage() {
  const [guruList, setGuruList] = useState<PTK[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
    gelar_depan: '',
    gelar_belakang: '',
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = guruList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(guruList.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  useEffect(() => {
    fetchGuru();
  }, []);

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
      gelar_depan: guru.gelar_depan || '',
      gelar_belakang: guru.gelar_belakang || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveGelar = async () => {
    if (!selectedGuru) return;

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

      // Update local state
      setGuruList(prev => prev.map(g => 
        g.ptk_id === selectedGuru.ptk_id 
          ? { ...g, gelar_depan: formData.gelar_depan, gelar_belakang: formData.gelar_belakang }
          : g
      ));
      
      setIsModalOpen(false);
      
      // Show success toast
      toast.success('Gelar guru berhasil diupdate', {
        description: `${formData.gelar_depan} ${selectedGuru.nama} ${formData.gelar_belakang}`.trim(),
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
    // Mapping jenis PTK (bisa disesuaikan dengan data real)
    const mapping: { [key: string]: string } = {
      '91': 'Kepala Sekolah',
      '92': 'Guru',
      '93': 'Guru BK',
      '94': 'Tenaga Administrasi',
    };
    return mapping[jenisPtkId] || `Kode ${jenisPtkId}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Guru</h1>
          <p className="text-muted-foreground">Kelola data pendidik dan tenaga kependidikan</p>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Guru</h1>
        <p className="text-muted-foreground">Kelola data pendidik dan tenaga kependidikan</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Daftar Guru & Tenaga Kependidikan</CardTitle>
          </div>
          <CardDescription>
            Total: {guruList.length} guru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>Nama PTK</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>NUPTK</TableHead>
                  <TableHead className="text-center">JK</TableHead>
                  <TableHead>Jenis PTK</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Tidak ada data guru
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((guru, index) => (
                    <TableRow key={guru.ptk_id}>
                      <TableCell className="font-medium">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {guru.gelar_depan && <span>{guru.gelar_depan} </span>}
                          {guru.nama}
                          {guru.gelar_belakang && <span>, {guru.gelar_belakang}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{guru.nip || '-'}</TableCell>
                      <TableCell>{guru.nuptk || '-'}</TableCell>
                      <TableCell className="text-center">
                        {guru.jenis_kelamin}
                      </TableCell>
                      <TableCell>{getJenisPTKLabel(guru.jenis_ptk_id)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => handleEditClick(guru)} 
                          size="sm"
                          style={{ backgroundColor: '#059669', color: 'white' }}
                          className="hover:bg-emerald-700"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit Gelar
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
              <div className="text-sm text-muted-foreground">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, guruList.length)} dari {guruList.length} data
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
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
                          className={currentPage === page ? "bg-emerald-600 hover:bg-emerald-700" : ""}
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
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Gelar Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Gelar Guru</DialogTitle>
            <DialogDescription>
              Update gelar depan dan belakang untuk {selectedGuru?.nama}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              onClick={handleSaveGelar}
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
