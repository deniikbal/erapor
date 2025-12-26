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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { TanggalRapor, Semester } from '@/lib/db';
import { Calendar, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DataTanggalRaporPage() {
  const [tanggalRaporList, setTanggalRaporList] = useState<TanggalRapor[]>([]);
  const [semesterList, setSemesterList] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSemester, setLoadingSemester] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<TanggalRapor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TanggalRapor | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    semester_id: '',
    tanggal: '',
    semester: '',
    tempat_ttd: '',
  });

  useEffect(() => {
    fetchTanggalRapor();
    fetchSemester();
  }, []);

  const fetchSemester = async () => {
    try {
      const response = await fetch('/api/semester');
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('Failed to fetch semester:', data.error);
        return;
      }

      setSemesterList(data.data || []);
    } catch (err) {
      console.error('Error fetching semester:', err);
    } finally {
      setLoadingSemester(false);
    }
  };

  const fetchTanggalRapor = async () => {
    try {
      const response = await fetch('/api/tanggalrapor');
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data tanggal rapor');
        return;
      }

      setTanggalRaporList(data.data || []);
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setSelectedItem(null);
    setFormData({
      semester_id: '',
      tanggal: '',
      semester: '',
      tempat_ttd: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleEditClick = (item: TanggalRapor) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      semester_id: item.semester_id || '',
      tanggal: item.tanggal ? formatDateForInput(item.tanggal) : '',
      semester: item.semester || '',
      tempat_ttd: item.tempat_ttd || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.semester_id || !formData.tanggal || !formData.tempat_ttd.trim()) {
      setModalError('Semua field harus diisi');
      toast.error('Semua field harus diisi');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const url = '/api/tanggalrapor';
      const method = modalMode === 'create' ? 'POST' : 'PATCH';
      const body = modalMode === 'create'
        ? formData
        : { ...formData, tanggal_id: selectedItem?.tanggal_id };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data.error || 'Gagal menyimpan data';
        setModalError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setIsModalOpen(false);
      toast.success(
        modalMode === 'create'
          ? 'Data tanggal rapor berhasil ditambahkan'
          : 'Data tanggal rapor berhasil diupdate'
      );

      fetchTanggalRapor();
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan saat menyimpan data';
      setModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (item: TanggalRapor) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setDeletingId(itemToDelete.tanggal_id);
    try {
      const response = await fetch(`/api/tanggalrapor?id=${itemToDelete.tanggal_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Gagal menghapus data');
        return;
      }

      toast.success('Data tanggal rapor berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchTanggalRapor();
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateForInput = (dateString: string) => {
    // Convert UTC date to local date for input[type="date"]
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getSemesterLabel = (semesterId: string | null) => {
    if (!semesterId) return '-';
    const semester = semesterList.find(s => s.semester_id === semesterId);
    return semester ? semester.nama_semester : semesterId;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Tanggal Rapor</h1>
          <p className="text-muted-foreground">Kelola data tanggal pembagian rapor</p>
        </div>
        <Card className="rounded-sm border-l-4 border-l-emerald-600">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Tanggal Rapor</h1>
          <p className="text-muted-foreground">Kelola data tanggal pembagian rapor</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Tanggal Rapor</h1>
          <p className="text-muted-foreground">Kelola data tanggal pembagian rapor</p>
        </div>
        <Button onClick={handleCreateClick} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Data
        </Button>
      </div>

      <Card className="rounded-sm border-l-4 border-l-emerald-600">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Daftar Tanggal Rapor</CardTitle>
          </div>
          <CardDescription>Data tanggal pembagian rapor per semester</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Tanggal Rapor</TableHead>
                  <TableHead>Tempat</TableHead>
                  <TableHead className="text-right w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tanggalRaporList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada data tanggal rapor
                    </TableCell>
                  </TableRow>
                ) : (
                  tanggalRaporList.map((item, index) => (
                    <TableRow key={item.tanggal_id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{getSemesterLabel(item.semester_id)}</TableCell>
                      <TableCell>{item.tanggal ? formatDate(item.tanggal) : '-'}</TableCell>
                      <TableCell>{item.tempat_ttd || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleEditClick(item)}
                            size="sm"
                            variant="outline"
                            className="h-8"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(item)}
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            disabled={deletingId === item.tanggal_id}
                          >
                            {deletingId === item.tanggal_id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
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

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Tambah Data Tanggal Rapor' : 'Edit Data Tanggal Rapor'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'create'
                ? 'Isi form di bawah untuk menambahkan data tanggal rapor baru'
                : 'Update informasi tanggal rapor'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="semester_id">Semester</Label>
              <Select
                value={formData.semester_id}
                onValueChange={(value) => {
                  const selectedSemester = semesterList.find(s => s.semester_id === value);
                  setFormData({
                    ...formData,
                    semester_id: value,
                    semester: selectedSemester?.semester || ''
                  });
                }}
                disabled={isSaving || loadingSemester}
              >
                <SelectTrigger id="semester_id">
                  <SelectValue placeholder={loadingSemester ? "Memuat..." : "Pilih semester"} />
                </SelectTrigger>
                <SelectContent>
                  {semesterList.map((sem) => (
                    <SelectItem key={sem.semester_id} value={sem.semester_id}>
                      {sem.nama_semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Rapor</Label>
              <Input
                id="tanggal"
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempat_ttd">Tempat</Label>
              <Input
                id="tempat_ttd"
                placeholder="Masukkan tempat pembagian rapor"
                value={formData.tempat_ttd}
                onChange={(e) => setFormData({ ...formData, tempat_ttd: e.target.value })}
                disabled={isSaving}
              />
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
              onClick={handleSave}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data tanggal rapor untuk semester{' '}
              <span className="font-semibold text-foreground">
                {itemToDelete ? getSemesterLabel(itemToDelete.semester_id) : ''}
              </span>
              ?
              <br />
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
