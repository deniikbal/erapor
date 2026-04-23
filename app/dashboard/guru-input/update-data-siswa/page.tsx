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
import { Users, Pencil, Loader2, Search, ChevronLeft, ChevronRight, Save, X, UserCog, GraduationCap } from 'lucide-react';
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
    if (isNaN(date.getTime())) return '';
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
            <Skeleton className="h-7 w-64" />
          </div>
          <Skeleton className="h-4 w-96 ml-3" />
        </div>
        <Card className="rounded-sm border-blue-100 shadow-sm">
          <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
            <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">Update Data Siswa</h1>
          </div>
          <p className="text-slate-500 text-[11px] ml-3 italic">Terjadi kesalahan pada sistem.</p>
        </div>
        <Alert variant="destructive" className="rounded-sm border-red-200">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Update Data Siswa
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Lengkapi dan perbarui data profil siswa yang Anda wali kelasi ({siswaList.length} siswa).
        </p>
      </div>

      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Siswa Wali Kelas</CardTitle>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">KELAS: {siswaList[0]?.nm_kelas || '-'}</p>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Search */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Cari nama siswa..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
                className="pl-8 h-8 text-xs border-slate-200"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-sm border border-slate-100 overflow-hidden hidden md:block">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px] text-white font-bold text-[10px] h-9 uppercase tracking-wider pl-4">No</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">NIS / NISN</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Siswa</TableHead>
                  <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Jenis Kelamin</TableHead>
                  <TableHead className="w-[80px] text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs italic">
                      {searchNama ? 'Tidak ada siswa yang sesuai pencarian' : 'Tidak ada data siswa'}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((siswa, index) => (
                    <TableRow key={siswa.peserta_didik_id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="py-1.5 pl-4 text-xs font-medium text-slate-400">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell className="py-1.5 text-xs text-slate-600 font-medium">
                        <div>{siswa.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">{siswa.nisn || '-'}</div>
                      </TableCell>
                      <TableCell className="py-1.5 font-bold text-[#1e3a8a] text-xs uppercase tracking-tight">{siswa.nm_siswa}</TableCell>
                      <TableCell className="py-1.5 text-xs text-slate-600 italic">{siswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</TableCell>
                      <TableCell className="text-center py-1.5 pr-4">
                        <Button
                          onClick={() => handleEditClick(siswa)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-[#1e3a8a] hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {currentItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic border rounded-sm">
                {searchNama ? 'Tidak ada siswa yang sesuai pencarian' : 'Tidak ada data siswa'}
              </div>
            ) : (
              currentItems.map((siswa, index) => (
                <div key={siswa.peserta_didik_id} className="p-3 border border-blue-50 rounded-sm bg-slate-50/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center text-[#1e3a8a] text-[10px] font-bold border border-blue-100">
                        {indexOfFirstItem + index + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1e3a8a] uppercase">{siswa.nm_siswa}</div>
                        <div className="text-[10px] text-slate-400 font-medium">NIS: {siswa.nis}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleEditClick(siswa)}
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] font-bold border-slate-200"
                    >
                      EDIT
                    </Button>
                  </div>
                  <Separator className="bg-slate-100" />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-medium mr-1">JK:</span>
                      <span className="text-slate-600 font-bold">{siswa.jenis_kelamin || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium mr-1">KELAS:</span>
                      <span className="text-slate-600 font-bold">{siswa.nm_kelas || '-'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2">
              <div className="text-[11px] text-slate-500 font-medium">
                Menampilkan <span className="font-bold text-[#1e3a8a]">{indexOfFirstItem + 1}</span> - <span className="font-bold text-[#1e3a8a]">{Math.min(indexOfLastItem, filteredSiswa.length)}</span> dari <span className="font-bold text-[#1e3a8a]">{filteredSiswa.length}</span> siswa
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="h-7 text-[10px] font-bold border-slate-200"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  PREV
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => paginate(pageNum)}
                            className={currentPage === pageNum 
                              ? "bg-[#1e3a8a] hover:bg-black h-7 w-7 p-0 text-[10px] font-bold border-none" 
                              : "h-7 w-7 p-0 text-[10px] font-bold border-slate-200"}
                          >
                            {pageNum}
                          </Button>
                        );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="text-[10px] text-slate-300">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="h-7 text-[10px] font-bold border-slate-200"
                >
                  NEXT
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-md">
          <DialogHeader className="py-3 px-6 bg-[#1e3a8a] text-white">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-200" />
              <DialogTitle className="text-white text-base">Edit Data Siswa</DialogTitle>
            </div>
            <DialogDescription className="text-blue-100 text-[11px] italic">
              Formulir pembaruan data profil dan pelengkap siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">
            {/* Section: Data Utama */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-50 pb-1">
                <GraduationCap className="h-4 w-4 text-[#1e3a8a]" />
                <h3 className="text-[11px] font-black uppercase text-[#1e3a8a] tracking-wider">Data Identitas Siswa</h3>
              </div>
              
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-3">
                  <Label htmlFor="peserta_didik_id" className="text-[10px] font-bold uppercase text-slate-500">ID Peserta Didik</Label>
                  <Input
                    id="peserta_didik_id"
                    value={selectedSiswa?.peserta_didik_id || ''}
                    readOnly
                    disabled
                    className="h-8 bg-slate-50 font-mono text-[10px] border-slate-200 text-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nm_siswa" className="text-[10px] font-bold uppercase text-slate-500">Nama Lengkap *</Label>
                  <Input
                    id="nm_siswa"
                    value={formDataSiswa.nm_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_siswa: e.target.value })}
                    disabled={isSaving}
                    placeholder="Nama lengkap siswa"
                    className="h-8 text-xs border-slate-200 font-bold text-[#1e3a8a]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nis" className="text-[10px] font-bold uppercase text-slate-500">NIS (Nomor Induk) *</Label>
                  <Input
                    id="nis"
                    value={formDataSiswa.nis}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nis: e.target.value })}
                    disabled={isSaving}
                    placeholder="NIS"
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nisn" className="text-[10px] font-bold uppercase text-slate-500">NISN (Nasional)</Label>
                  <Input
                    id="nisn"
                    value={formDataSiswa.nisn}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nisn: e.target.value })}
                    disabled={isSaving}
                    placeholder="NISN"
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tempat_lahir" className="text-[10px] font-bold uppercase text-slate-500">Tempat Lahir</Label>
                  <Input
                    id="tempat_lahir"
                    value={formDataSiswa.tempat_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tempat_lahir: e.target.value })}
                    disabled={isSaving}
                    placeholder="Kota/Kab"
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tanggal_lahir" className="text-[10px] font-bold uppercase text-slate-500">Tanggal Lahir</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    value={formDataSiswa.tanggal_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tanggal_lahir: e.target.value })}
                    disabled={isSaving}
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jenis_kelamin" className="text-[10px] font-bold uppercase text-slate-500">Jenis Kelamin</Label>
                  <Select
                    value={formDataSiswa.jenis_kelamin}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, jenis_kelamin: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="jenis_kelamin" className="h-8 text-xs border-slate-200">
                      <SelectValue placeholder="Pilih JK" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L" className="text-xs">Laki-laki</SelectItem>
                      <SelectItem value="P" className="text-xs">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="agama" className="text-[10px] font-bold uppercase text-slate-500">Agama</Label>
                  <Select
                    value={formDataSiswa.agama}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, agama: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="agama" className="h-8 text-xs border-slate-200">
                      <SelectValue placeholder="Pilih Agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam" className="text-xs">Islam</SelectItem>
                      <SelectItem value="Kristen" className="text-xs">Kristen</SelectItem>
                      <SelectItem value="Katolik" className="text-xs">Katolik</SelectItem>
                      <SelectItem value="Hindu" className="text-xs">Hindu</SelectItem>
                      <SelectItem value="Buddha" className="text-xs">Buddha</SelectItem>
                      <SelectItem value="Konghucu" className="text-xs">Konghucu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="telepon_siswa" className="text-[10px] font-bold uppercase text-slate-500">Telepon Siswa</Label>
                  <Input
                    id="telepon_siswa"
                    value={formDataSiswa.telepon_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, telepon_siswa: e.target.value })}
                    disabled={isSaving}
                    placeholder="08..."
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="alamat_siswa" className="text-[10px] font-bold uppercase text-slate-500">Alamat Lengkap Siswa</Label>
                  <Input
                    id="alamat_siswa"
                    value={formDataSiswa.alamat_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, alamat_siswa: e.target.value })}
                    disabled={isSaving}
                    placeholder="Jl. ..."
                    className="h-8 text-xs border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Section: Data Orang Tua */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 border-b border-blue-50 pb-1 pt-2">
                <Users className="h-4 w-4 text-[#1e3a8a]" />
                <h3 className="text-[11px] font-black uppercase text-[#1e3a8a] tracking-wider">Data Orang Tua</h3>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3 p-3 bg-slate-50/50 rounded-sm border border-slate-100">
                  <div className="space-y-1">
                    <Label htmlFor="nm_ayah" className="text-[10px] font-bold uppercase text-slate-500">Nama Ayah</Label>
                    <Input
                      id="nm_ayah"
                      value={formDataSiswa.nm_ayah}
                      onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ayah: e.target.value })}
                      disabled={isSaving}
                      placeholder="Nama ayah"
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pekerjaan_ayah" className="text-[10px] font-bold uppercase text-slate-500">Pekerjaan Ayah</Label>
                    <Input
                      id="pekerjaan_ayah"
                      value={formDataSiswa.pekerjaan_ayah}
                      onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ayah: e.target.value })}
                      disabled={isSaving}
                      placeholder="Pekerjaan"
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-slate-50/50 rounded-sm border border-slate-100">
                  <div className="space-y-1">
                    <Label htmlFor="nm_ibu" className="text-[10px] font-bold uppercase text-slate-500">Nama Ibu</Label>
                    <Input
                      id="nm_ibu"
                      value={formDataSiswa.nm_ibu}
                      onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ibu: e.target.value })}
                      disabled={isSaving}
                      placeholder="Nama ibu"
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pekerjaan_ibu" className="text-[10px] font-bold uppercase text-slate-500">Pekerjaan Ibu</Label>
                    <Input
                      id="pekerjaan_ibu"
                      value={formDataSiswa.pekerjaan_ibu}
                      onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ibu: e.target.value })}
                      disabled={isSaving}
                      placeholder="Pekerjaan"
                      className="h-8 text-xs border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Data Pelengkap */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-50 pb-1 pt-2">
                <UserCog className="h-4 w-4 text-[#1e3a8a]" />
                <h3 className="text-[11px] font-black uppercase text-[#1e3a8a] tracking-wider">Data Pelengkap Riwayat</h3>
              </div>
              
              <div className="grid gap-3 md:grid-cols-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="status_dalam_kel" className="text-[10px] font-bold uppercase text-slate-500">Status Keluarga</Label>
                  <Select
                    value={formDataPelengkap.status_dalam_kel}
                    onValueChange={(value) => setFormDataPelengkap({ ...formDataPelengkap, status_dalam_kel: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="status_dalam_kel" className="h-8 text-xs border-slate-200">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anak Kandung" className="text-xs">Anak Kandung</SelectItem>
                      <SelectItem value="Anak Angkat" className="text-xs">Anak Angkat</SelectItem>
                      <SelectItem value="Anak Tiri" className="text-xs">Anak Tiri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="anak_ke" className="text-[10px] font-bold uppercase text-slate-500">Anak Ke-</Label>
                  <Input
                    id="anak_ke"
                    placeholder="0"
                    value={formDataPelengkap.anak_ke}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, anak_ke: e.target.value })}
                    disabled={isSaving}
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sekolah_asal" className="text-[10px] font-bold uppercase text-slate-500">Sekolah Asal</Label>
                  <Input
                    id="sekolah_asal"
                    value={formDataPelengkap.sekolah_asal}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, sekolah_asal: e.target.value })}
                    disabled={isSaving}
                    placeholder="SMP/MTs..."
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="diterima_kelas" className="text-[10px] font-bold uppercase text-slate-500">Diterima di Kelas</Label>
                  <Input
                    id="diterima_kelas"
                    placeholder="X / XI / XII"
                    value={formDataPelengkap.diterima_kelas}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, diterima_kelas: e.target.value })}
                    disabled={isSaving}
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="telepon_ortu" className="text-[10px] font-bold uppercase text-slate-500">Telepon Orang Tua</Label>
                  <Input
                    id="telepon_ortu"
                    value={formDataPelengkap.telepon_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, telepon_ortu: e.target.value })}
                    disabled={isSaving}
                    placeholder="08..."
                    className="h-8 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1 md:col-span-3">
                  <Label htmlFor="alamat_ortu" className="text-[10px] font-bold uppercase text-slate-500">Alamat Orang Tua</Label>
                  <Input
                    id="alamat_ortu"
                    value={formDataPelengkap.alamat_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, alamat_ortu: e.target.value })}
                    disabled={isSaving}
                    placeholder="Sesuai domisili ortu..."
                    className="h-8 text-xs border-slate-200"
                  />
                </div>
              </div>
            </div>

            {modalError && (
              <Alert variant="destructive" className="rounded-sm border-red-100 py-2">
                <AlertDescription className="text-[10px] font-bold italic">{modalError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="px-6 py-3 bg-slate-50 border-t flex items-center justify-between flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="h-8 text-[11px] font-bold uppercase border-slate-200"
            >
              <X className="mr-1.5 h-3 w-3" />
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 text-[11px] font-bold uppercase bg-[#1e3a8a] text-white hover:bg-black"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3 w-3" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
