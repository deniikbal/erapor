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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { Siswa, User } from '@/lib/db';
import { Users, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth-client';

export default function GuruUpdateDataSiswaPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Search
  const [searchNama, setSearchNama] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);

  // Form state - Data Siswa
  const [formDataSiswa, setFormDataSiswa] = useState({
    nm_siswa: '',
    nis: '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    agama: '',
    alamat_siswa: '',
    telepon_siswa: '',
    nm_ayah: '',
    nm_ibu: '',
    pekerjaan_ayah: '',
    pekerjaan_ibu: '',
  });

  // Form state - Data Pelengkap
  const [formDataPelengkap, setFormDataPelengkap] = useState({
    status_dalam_kel: '',
    anak_ke: '',
    sekolah_asal: '',
    diterima_kelas: '',
    alamat_ortu: '',
    telepon_ortu: '',
  });

  // Filter siswa berdasarkan search
  const filteredSiswa = siswaList.filter(siswa => {
    const matchNama = siswa.nm_siswa.toLowerCase().includes(searchNama.toLowerCase());
    return matchNama;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSiswa.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSiswa.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchNama]);

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setError('User tidak ditemukan. Silakan login kembali.');
        setLoading(false);
        return;
      }

      if (user.level !== 'Guru') {
        setError('Hanya guru yang dapat mengakses halaman ini');
        setLoading(false);
        return;
      }

      if (!user.ptk_id) {
        setError('PTK ID tidak ditemukan. Silakan hubungi administrator.');
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      fetchSiswa(user.ptk_id);
    };

    initUser();
  }, []);

  const fetchSiswa = async (ptk_id: string) => {
    try {
      const response = await fetch(`/api/siswa/by-wali-kelas?ptk_id=${ptk_id}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data siswa');
        return;
      }

      setSiswaList(data.siswa || []);
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleEditClick = (siswa: Siswa) => {
    setSelectedSiswa(siswa);

    // Set form data siswa
    setFormDataSiswa({
      nm_siswa: siswa.nm_siswa || '',
      nis: siswa.nis || '',
      nisn: siswa.nisn || '',
      tempat_lahir: siswa.tempat_lahir || '',
      tanggal_lahir: formatDateForInput(siswa.tanggal_lahir),
      jenis_kelamin: siswa.jenis_kelamin || '',
      agama: siswa.agama || '',
      alamat_siswa: siswa.alamat_siswa || '',
      telepon_siswa: siswa.telepon_siswa || '',
      nm_ayah: siswa.nm_ayah || '',
      nm_ibu: siswa.nm_ibu || '',
      pekerjaan_ayah: siswa.pekerjaan_ayah || '',
      pekerjaan_ibu: siswa.pekerjaan_ibu || '',
    });

    // Set form data pelengkap
    setFormDataPelengkap({
      status_dalam_kel: siswa.status_dalam_kel || '',
      anak_ke: siswa.anak_ke || '',
      sekolah_asal: siswa.sekolah_asal || '',
      diterima_kelas: siswa.diterima_kelas || '',
      alamat_ortu: siswa.alamat_ortu || '',
      telepon_ortu: siswa.telepon_ortu || '',
    });

    setModalError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedSiswa) return;

    // Validasi
    if (!formDataSiswa.nm_siswa.trim() || !formDataSiswa.nis.trim()) {
      setModalError('Nama dan NIS harus diisi');
      toast.error('Nama dan NIS harus diisi');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const response = await fetch('/api/siswa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          peserta_didik_id: selectedSiswa.peserta_didik_id,
          data_siswa: formDataSiswa,
          data_pelengkap: formDataPelengkap,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data.error || 'Gagal mengupdate data';
        setModalError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setIsModalOpen(false);
      toast.success('Data siswa berhasil diupdate');

      // Refresh data
      if (currentUser?.ptk_id) {
        fetchSiswa(currentUser.ptk_id);
      }
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan saat menyimpan data';
      setModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Update Data Siswa</h1>
          <p className="text-muted-foreground">Update data siswa yang Anda wali kelasi</p>
        </div>
        <Card>
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
          <h1 className="text-3xl font-bold tracking-tight">Update Data Siswa</h1>
          <p className="text-muted-foreground">Update data siswa yang Anda wali kelasi</p>
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
        <h1 className="text-3xl font-bold tracking-tight">Update Data Siswa</h1>
        <p className="text-muted-foreground">
          Update data siswa yang Anda wali kelasi ({siswaList.length} siswa)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Daftar Siswa Wali Kelas</CardTitle>
          </div>
          <CardDescription>Siswa dari kelas yang Anda wali kelasi</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Cari nama siswa..."
              value={searchNama}
              onChange={(e) => setSearchNama(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jenis Kelamin</TableHead>
                  <TableHead className="text-right w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchNama ? 'Tidak ada siswa yang sesuai pencarian' : 'Tidak ada data siswa'}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((siswa, index) => (
                    <TableRow key={siswa.peserta_didik_id}>
                      <TableCell className="font-medium">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell>{siswa.nis}</TableCell>
                      <TableCell className="font-medium">{siswa.nm_siswa}</TableCell>
                      <TableCell>{siswa.nm_kelas || '-'}</TableCell>
                      <TableCell>{siswa.jenis_kelamin || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleEditClick(siswa)}
                          size="sm"
                          variant="outline"
                          className="h-8"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="md:hidden space-y-4">
            {currentItems.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {searchNama ? 'Tidak ada siswa yang sesuai pencarian' : 'Tidak ada data siswa'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              currentItems.map((siswa, index) => (
                <Card key={siswa.peserta_didik_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {indexOfFirstItem + index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{siswa.nm_siswa}</h3>
                          <p className="text-sm text-muted-foreground">NIS: {siswa.nis}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleEditClick(siswa)}
                        size="sm"
                        variant="outline"
                        className="h-8"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Kelas</p>
                        <p className="font-medium">{siswa.nm_kelas || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jenis Kelamin</p>
                        <p className="font-medium">{siswa.jenis_kelamin || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSiswa.length)} dari {filteredSiswa.length} siswa
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  Previous
                </Button>

                {/* Page numbers - Hide some on mobile */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    // On mobile, only show 3 page numbers
                    const isMobileHidden = i > 0 && i < 4 && totalPages > 3;

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => paginate(pageNum)}
                        className={`w-8 h-8 p-0 ${isMobileHidden ? 'hidden sm:inline-flex' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Siswa</DialogTitle>
            <DialogDescription>
              Update data siswa dan data pelengkap. Klik simpan untuk menyimpan perubahan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Data Siswa */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Siswa</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Peserta Didik ID - Read Only */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="peserta_didik_id">Peserta Didik ID</Label>
                  <Input
                    id="peserta_didik_id"
                    value={selectedSiswa?.peserta_didik_id || ''}
                    readOnly
                    disabled
                    className="bg-muted font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nm_siswa">Nama Siswa *</Label>
                  <Input
                    id="nm_siswa"
                    value={formDataSiswa.nm_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nis">NIS *</Label>
                  <Input
                    id="nis"
                    value={formDataSiswa.nis}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nis: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN</Label>
                  <Input
                    id="nisn"
                    value={formDataSiswa.nisn}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nisn: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                  <Input
                    id="tempat_lahir"
                    value={formDataSiswa.tempat_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tempat_lahir: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    value={formDataSiswa.tanggal_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tanggal_lahir: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                  <Select
                    value={formDataSiswa.jenis_kelamin}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, jenis_kelamin: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="jenis_kelamin">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agama">Agama</Label>
                  <Select
                    value={formDataSiswa.agama}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, agama: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="agama">
                      <SelectValue placeholder="Pilih agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Kristen">Kristen</SelectItem>
                      <SelectItem value="Katolik">Katolik</SelectItem>
                      <SelectItem value="Hindu">Hindu</SelectItem>
                      <SelectItem value="Buddha">Buddha</SelectItem>
                      <SelectItem value="Konghucu">Konghucu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telepon_siswa">Telepon Siswa</Label>
                  <Input
                    id="telepon_siswa"
                    value={formDataSiswa.telepon_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, telepon_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="alamat_siswa">Alamat Siswa</Label>
                  <Input
                    id="alamat_siswa"
                    value={formDataSiswa.alamat_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, alamat_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nm_ayah">Nama Ayah</Label>
                  <Input
                    id="nm_ayah"
                    value={formDataSiswa.nm_ayah}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ayah: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pekerjaan_ayah">Pekerjaan Ayah</Label>
                  <Input
                    id="pekerjaan_ayah"
                    value={formDataSiswa.pekerjaan_ayah}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ayah: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nm_ibu">Nama Ibu</Label>
                  <Input
                    id="nm_ibu"
                    value={formDataSiswa.nm_ibu}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ibu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pekerjaan_ibu">Pekerjaan Ibu</Label>
                  <Input
                    id="pekerjaan_ibu"
                    value={formDataSiswa.pekerjaan_ibu}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ibu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Data Pelengkap */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Pelengkap</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="status_dalam_kel">Status Dalam Keluarga</Label>
                  <Select
                    value={formDataPelengkap.status_dalam_kel}
                    onValueChange={(value) => setFormDataPelengkap({ ...formDataPelengkap, status_dalam_kel: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="status_dalam_kel">
                      <SelectValue placeholder="Pilih status dalam keluarga" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anak Kandung">Anak Kandung</SelectItem>
                      <SelectItem value="Anak Angkat">Anak Angkat</SelectItem>
                      <SelectItem value="Anak Tiri">Anak Tiri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anak_ke">Anak Ke-</Label>
                  <Input
                    id="anak_ke"
                    placeholder="Contoh: 1"
                    value={formDataPelengkap.anak_ke}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, anak_ke: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sekolah_asal">Sekolah Asal</Label>
                  <Input
                    id="sekolah_asal"
                    value={formDataPelengkap.sekolah_asal}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, sekolah_asal: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diterima_kelas">Diterima di Kelas</Label>
                  <Input
                    id="diterima_kelas"
                    placeholder="Contoh: X"
                    value={formDataPelengkap.diterima_kelas}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, diterima_kelas: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telepon_ortu">Telepon Orang Tua</Label>
                  <Input
                    id="telepon_ortu"
                    value={formDataPelengkap.telepon_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, telepon_ortu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="alamat_ortu">Alamat Orang Tua</Label>
                  <Input
                    id="alamat_ortu"
                    value={formDataPelengkap.alamat_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, alamat_ortu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
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
    </div>
  );
}
