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
import type { Siswa } from '@/lib/db';
import {
  Users,
  Pencil,
  Loader2,
  FileSpreadsheet,
  GraduationCap,
  UserCheck,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

export default function DataSiswaPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Search
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
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

  // Natural sort helper
  const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
  };

  // Get unique kelas list dengan natural sort
  const kelasList = Array.from(new Set(siswaList.map(s => s.nm_kelas).filter(Boolean) as string[])).sort(naturalSort);

  // Filter siswa berdasarkan kelas dan search
  const filteredSiswa = siswaList.filter(siswa => {
    const matchKelas = selectedKelas === 'all' || siswa.nm_kelas === selectedKelas;
    const matchNama = siswa.nm_siswa.toLowerCase().includes(searchNama.toLowerCase());
    return matchKelas && matchNama;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSiswa.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSiswa.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelas, searchNama]);

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    try {
      const response = await fetch('/api/siswa');
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data siswa');
        return;
      }

      setSiswaList(data.siswa);
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (siswa: Siswa) => {
    setSelectedSiswa(siswa);

    setFormDataSiswa({
      nm_siswa: siswa.nm_siswa || '',
      nis: siswa.nis || '',
      nisn: siswa.nisn || '',
      tempat_lahir: siswa.tempat_lahir || '',
      tanggal_lahir: siswa.tanggal_lahir ? siswa.tanggal_lahir.split('T')[0] : '',
      jenis_kelamin: siswa.jenis_kelamin || '',
      agama: siswa.agama || '',
      alamat_siswa: siswa.alamat_siswa || '',
      telepon_siswa: siswa.telepon_siswa || '',
      nm_ayah: siswa.nm_ayah || '',
      nm_ibu: siswa.nm_ibu || '',
      pekerjaan_ayah: siswa.pekerjaan_ayah || '',
      pekerjaan_ibu: siswa.pekerjaan_ibu || '',
    });

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

      await fetchSiswa();
      setIsModalOpen(false);

      toast.success('Data siswa berhasil diupdate', {
        description: `${formDataSiswa.nm_siswa} - ${formDataSiswa.nis}`,
      });
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan saat menyimpan data';
      setModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTTL = (tempat: string | null, tanggal: string | null) => {
    if (!tempat && !tanggal) return '-';
    const tgl = tanggal ? new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : '';
    return `${tempat || '-'}, ${tgl || '-'}`;
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const exportData = filteredSiswa;

      if (exportData.length === 0) {
        toast.error('Tidak ada data siswa untuk di-export');
        return;
      }

      const worksheet = workbook.addWorksheet('Data Siswa');

      worksheet.columns = [
        { header: 'No', key: 'no', width: 8 },
        { header: 'Nama Siswa', key: 'nm_siswa', width: 40 },
        { header: 'NISN', key: 'nisn', width: 20 },
        { header: 'Kelas', key: 'nm_kelas', width: 20 },
      ];

      exportData.forEach((siswa, index) => {
        worksheet.addRow({
          no: index + 1,
          nm_siswa: siswa.nm_siswa,
          nisn: siswa.nisn || '-',
          nm_kelas: siswa.nm_kelas || '-',
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: rowNumber === 1 ? 'center' : 'left' };
          if (rowNumber === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Siswa_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Berhasil export Excel', {
        description: `Berhasil mengeksport ${exportData.length} data siswa.`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengeksport data ke Excel');
    }
  };

  // Stats computed from siswa data
  const totalSiswa = siswaList.length;
  const siswaLaki = siswaList.filter(s => s.jenis_kelamin === 'L').length;
  const siswaPerempuan = siswaList.filter(s => s.jenis_kelamin === 'P').length;
  const totalKelas = kelasList.length;

  const statisticsCards = [
    {
      title: 'Total Siswa',
      value: loading ? null : totalSiswa,
      description: 'Peserta didik terdaftar',
      icon: Users,
      gradient: 'from-blue-600 to-blue-800',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Siswa Laki-laki',
      value: loading ? null : siswaLaki,
      description: `${totalSiswa > 0 ? ((siswaLaki / totalSiswa) * 100).toFixed(0) : 0}% dari total`,
      icon: UserCheck,
      gradient: 'from-indigo-500 to-indigo-700',
      lightBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
    },
    {
      title: 'Siswa Perempuan',
      value: loading ? null : siswaPerempuan,
      description: `${totalSiswa > 0 ? ((siswaPerempuan / totalSiswa) * 100).toFixed(0) : 0}% dari total`,
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
          <h1 className="text-3xl font-bold tracking-tight">Data Siswa</h1>
          <p className="text-muted-foreground">Kelola data peserta didik</p>
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
              Manajemen Siswa
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">
              Data Peserta Didik
            </h1>
            <p className="mt-1 text-sm text-blue-200/70">
              Kelola data siswa, identitas, dan informasi akademik
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:mt-0">
            <Users className="h-4 w-4 text-blue-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">Total Siswa</p>
              <p className="text-sm font-black text-white">{totalSiswa} Orang</p>
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

      {/* Daftar Siswa Table */}
      <Card className="rounded-xl shadow-md border-none overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1e3a8a]" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#1e3a8a]">
                Daftar Siswa
              </CardTitle>
            </div>
            <CardDescription className="text-[10px]">
              {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSiswa.length)} dari {filteredSiswa.length}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filter & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama siswa..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList.map(kelas => (
                    <SelectItem key={kelas} value={kelas} className="text-xs">
                      {kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="h-9 gap-1.5 border-indigo-200 px-3 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </div>

          <div className="rounded-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-[#1e3a8a]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-white font-bold text-[10px] uppercase w-[50px] border-r border-white/10 text-center h-10">No</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Nama Siswa</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">NIS</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">NISN</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10">JK</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">TTL</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Agama</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10">Tingkat</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Kelas</TableHead>
                  <TableHead className="text-white font-bold text-[10px] uppercase text-right pr-4 h-10">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground text-xs">
                      {searchNama || selectedKelas !== 'all' ? 'Tidak ada siswa yang cocok dengan filter' : 'Tidak ada data siswa'}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((siswa, index) => (
                    <TableRow key={siswa.peserta_didik_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100 h-10">
                      <TableCell className="text-center font-bold text-slate-400 text-[10px] border-r py-1">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell className="border-r py-1 font-semibold text-[12px] text-[#1e3a8a]">{siswa.nm_siswa}</TableCell>
                      <TableCell className="border-r py-1 text-xs font-medium text-slate-600">{siswa.nis}</TableCell>
                      <TableCell className="border-r py-1 text-xs text-slate-500">{siswa.nisn || '-'}</TableCell>
                      <TableCell className="text-center border-r py-1">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {siswa.jenis_kelamin || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="border-r py-1 text-[10px] leading-tight text-slate-500">{formatTTL(siswa.tempat_lahir, siswa.tanggal_lahir)}</TableCell>
                      <TableCell className="border-r py-1 text-xs text-slate-600">{siswa.agama || '-'}</TableCell>
                      <TableCell className="text-center border-r py-1 text-xs font-bold text-slate-600">{siswa.tingkat_pendidikan_id || '-'}</TableCell>
                      <TableCell className="border-r py-1 text-xs font-bold text-indigo-600">{siswa.nm_kelas || '-'}</TableCell>
                      <TableCell className="text-right py-1 pr-4">
                        <Button
                          onClick={() => handleEditClick(siswa)}
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
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredSiswa.length)} dari {filteredSiswa.length} data
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

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Siswa</DialogTitle>
            <DialogDescription>
              Update data siswa: {selectedSiswa?.nm_siswa}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Data Siswa Section */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1e3a8a] border-b pb-1">Data Siswa</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                <div className="col-span-3 space-y-1">
                  <Label htmlFor="nm_siswa" className="text-xs font-semibold text-slate-600">Nama Siswa *</Label>
                  <Input
                    id="nm_siswa"
                    className="h-8 text-sm"
                    value={formDataSiswa.nm_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nis" className="text-xs font-semibold text-slate-600">NIS *</Label>
                  <Input
                    id="nis"
                    className="h-8 text-sm"
                    value={formDataSiswa.nis}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nis: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nisn" className="text-xs font-semibold text-slate-600">NISN</Label>
                  <Input
                    id="nisn"
                    className="h-8 text-sm"
                    value={formDataSiswa.nisn}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nisn: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jenis_kelamin" className="text-xs font-semibold text-slate-600">Jenis Kelamin</Label>
                  <Select
                    value={formDataSiswa.jenis_kelamin}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, jenis_kelamin: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="P">P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tempat_lahir" className="text-xs font-semibold text-slate-600">Tempat Lahir</Label>
                  <Input
                    id="tempat_lahir"
                    className="h-8 text-sm"
                    value={formDataSiswa.tempat_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tempat_lahir: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tanggal_lahir" className="text-xs font-semibold text-slate-600">Tanggal Lahir</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    className="h-8 text-sm"
                    value={formDataSiswa.tanggal_lahir}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, tanggal_lahir: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="agama" className="text-xs font-semibold text-slate-600">Agama</Label>
                  <Select
                    value={formDataSiswa.agama}
                    onValueChange={(value) => setFormDataSiswa({ ...formDataSiswa, agama: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih" />
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

                <div className="col-span-3 space-y-1">
                  <Label htmlFor="alamat_siswa" className="text-xs font-semibold text-slate-600">Alamat Siswa</Label>
                  <Input
                    id="alamat_siswa"
                    className="h-8 text-sm"
                    value={formDataSiswa.alamat_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, alamat_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="telepon_siswa" className="text-xs font-semibold text-slate-600">No HP Siswa</Label>
                  <Input
                    id="telepon_siswa"
                    className="h-8 text-sm"
                    value={formDataSiswa.telepon_siswa}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, telepon_siswa: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nm_ayah" className="text-xs font-semibold text-slate-600">Nama Ayah</Label>
                  <Input
                    id="nm_ayah"
                    className="h-8 text-sm"
                    value={formDataSiswa.nm_ayah}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ayah: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nm_ibu" className="text-xs font-semibold text-slate-600">Nama Ibu</Label>
                  <Input
                    id="nm_ibu"
                    className="h-8 text-sm"
                    value={formDataSiswa.nm_ibu}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, nm_ibu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1">
                  <Label htmlFor="pekerjaan_ayah" className="text-xs font-semibold text-slate-600">Pekerjaan Ayah</Label>
                  <Input
                    id="pekerjaan_ayah"
                    className="h-8 text-sm"
                    value={formDataSiswa.pekerjaan_ayah}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ayah: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pekerjaan_ibu" className="text-xs font-semibold text-slate-600">Pekerjaan Ibu</Label>
                  <Input
                    id="pekerjaan_ibu"
                    className="h-8 text-sm"
                    value={formDataSiswa.pekerjaan_ibu}
                    onChange={(e) => setFormDataSiswa({ ...formDataSiswa, pekerjaan_ibu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-1" />

            {/* Data Pelengkap Section */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1e3a8a] border-b pb-1">Data Pelengkap</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                <div className="space-y-1">
                  <Label htmlFor="status_dalam_kel" className="text-xs font-semibold text-slate-600">Status Dalam Keluarga</Label>
                  <Select
                    value={formDataPelengkap.status_dalam_kel}
                    onValueChange={(value) => setFormDataPelengkap({ ...formDataPelengkap, status_dalam_kel: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Anak Kandung">Anak Kandung</SelectItem>
                      <SelectItem value="Anak Angkat">Anak Angkat</SelectItem>
                      <SelectItem value="Anak Tiri">Anak Tiri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="anak_ke" className="text-xs font-semibold text-slate-600">Anak Ke</Label>
                  <Input
                    id="anak_ke"
                    type="number"
                    className="h-8 text-sm"
                    value={formDataPelengkap.anak_ke}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, anak_ke: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="diterima_kelas" className="text-xs font-semibold text-slate-600">Diterima Di Kelas</Label>
                  <Input
                    id="diterima_kelas"
                    placeholder="X"
                    className="h-8 text-sm"
                    value={formDataPelengkap.diterima_kelas}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, diterima_kelas: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="col-span-3 space-y-1">
                  <Label htmlFor="alamat_ortu" className="text-xs font-semibold text-slate-600">Alamat Orang Tua</Label>
                  <Input
                    id="alamat_ortu"
                    className="h-8 text-sm"
                    value={formDataPelengkap.alamat_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, alamat_ortu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1">
                  <Label htmlFor="sekolah_asal" className="text-xs font-semibold text-slate-600">Sekolah Asal</Label>
                  <Input
                    id="sekolah_asal"
                    className="h-8 text-sm"
                    value={formDataPelengkap.sekolah_asal}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, sekolah_asal: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="telepon_ortu" className="text-xs font-semibold text-slate-600">Telepon Orang Tua</Label>
                  <Input
                    id="telepon_ortu"
                    className="h-8 text-sm"
                    value={formDataPelengkap.telepon_ortu}
                    onChange={(e) => setFormDataPelengkap({ ...formDataPelengkap, telepon_ortu: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          {modalError && (
            <Alert variant="destructive">
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}

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
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white"
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
