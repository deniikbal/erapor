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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { Siswa, User, MarginSettings } from '@/lib/db';
import { FileText, Settings as SettingsIcon, Loader2, Download, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth-client';
import { jsPDF } from 'jspdf';
import { generateCoverPage } from '@/lib/pdf/coverPage';
import { generateSchoolInfoPage } from '@/lib/pdf/schoolInfoPage';
import { generateIdentityPage } from '@/lib/pdf/identityPage';
import { generateKeteranganPindahPage } from '@/lib/pdf/keteranganPindahPage';
import { generateKeteranganMasukPage } from '@/lib/pdf/keteranganMasukPage';
import { downloadBulkPDFs, generateSinglePDFWithAllStudents } from '@/lib/pdf/bulkPDFGenerator';

export default function PelengkapRaportPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentStudent: '' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Margin settings state
  const [marginSettings, setMarginSettings] = useState({
    margin_top: 20,
    margin_bottom: 20,
    margin_left: 20,
    margin_right: 20
  });
  const [savingMargin, setSavingMargin] = useState(false);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = siswaList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(siswaList.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

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
      fetchMarginSettings(user.ptk_id);
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

  const fetchMarginSettings = async (ptk_id: string) => {
    try {
      const response = await fetch(`/api/margin-settings?ptk_id=${ptk_id}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setMarginSettings({
          margin_top: Number(data.data.margin_top) || 20,
          margin_bottom: Number(data.data.margin_bottom) || 20,
          margin_left: Number(data.data.margin_left) || 20,
          margin_right: Number(data.data.margin_right) || 20
        });
      }
    } catch (err) {
      console.error('Error fetching margin settings:', err);
    }
  };

  const handleSaveMargin = async () => {
    if (!currentUser?.ptk_id) return;

    setSavingMargin(true);
    try {
      const response = await fetch('/api/margin-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ptk_id: currentUser.ptk_id,
          ...marginSettings
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Gagal menyimpan pengaturan margin');
        return;
      }

      toast.success('Pengaturan margin berhasil disimpan');
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSavingMargin(false);
    }
  };

  const handleGeneratePDF = async (siswa: Siswa) => {
    setGeneratingPdf(siswa.peserta_didik_id);

    try {
      toast.info('Membuat PDF...');

      // Fetch logo data
      const logoResponse = await fetch('/api/logo');
      const logoData = await logoResponse.json();

      console.log('Logo data received:', logoData);

      // Logo paths are stored as file paths (e.g., "logos/filename.png")
      // Need to prepend with base URL
      const logos = {
        logo_pemda: logoData.logo?.logo_pemda
          ? `/${logoData.logo.logo_pemda}`
          : null,
        logo_sek: logoData.logo?.logo_sek
          ? `/${logoData.logo.logo_sek}`
          : null
      };

      console.log('Logo URLs:', logos);

      // Fetch school data
      const sekolahResponse = await fetch('/api/sekolah');
      const sekolahData = await sekolahResponse.json();

      if (!sekolahResponse.ok || sekolahData.error) {
        throw new Error('Gagal mengambil data sekolah');
      }

      // Create PDF instance
      const doc = new jsPDF();

      // Page 1: Cover Page
      await generateCoverPage(doc, {
        nm_siswa: siswa.nm_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn
      }, logos, marginSettings);

      // Page 2: School Info Page
      doc.addPage();
      await generateSchoolInfoPage(doc, sekolahData.sekolah, marginSettings);

      // Page 3: Identity Page
      doc.addPage();
      await generateIdentityPage(doc, siswa, sekolahData.sekolah, marginSettings);

      // Page 4: Keterangan Pindah Page
      doc.addPage();
      await generateKeteranganPindahPage(doc, siswa, marginSettings);

      // Page 5: Keterangan Masuk Page
      doc.addPage();
      await generateKeteranganMasukPage(doc, siswa, marginSettings);

      // Save PDF
      const fileName = `Pelengkap_Siswa_${siswa.nm_siswa.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      toast.success(`PDF untuk ${siswa.nm_siswa} berhasil diunduh`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Gagal generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleGenerateBulkPDFs = async () => {
    if (siswaList.length === 0) {
      toast.error('Tidak ada siswa untuk di-generate');
      return;
    }

    setGeneratingBulk(true);
    setBulkProgress({ current: 0, total: siswaList.length, currentStudent: '' });

    try {
      toast.info('Mempersiapkan PDF untuk semua siswa...');

      // Fetch logo data
      const logoResponse = await fetch('/api/logo');
      const logoData = await logoResponse.json();

      console.log('Logo data received:', logoData);

      // Logo paths are stored as file paths (e.g., "logos/filename.png")
      // Need to prepend with base URL
      const logos = {
        logo_pemda: logoData.logo?.logo_pemda
          ? `/${logoData.logo.logo_pemda}`
          : null,
        logo_sek: logoData.logo?.logo_sek
          ? `/${logoData.logo.logo_sek}`
          : null
      };

      console.log('Logo URLs:', logos);

      // Fetch school data
      const sekolahResponse = await fetch('/api/sekolah');
      const sekolahData = await sekolahResponse.json();

      if (!sekolahResponse.ok || sekolahData.error) {
        throw new Error('Gagal mengambil data sekolah');
      }

      // Generate single PDF for all students
      await generateSinglePDFWithAllStudents(
        siswaList,
        sekolahData.sekolah,
        logos,
        marginSettings,
        (current: number, total: number, currentStudentName?: string) => {
          setBulkProgress({ current, total, currentStudent: currentStudentName || '' });
          toast.info(`Menambahkan siswa ke PDF: ${currentStudentName || ''} (${current} dari ${total})`);
        }
      );

      toast.success(`PDF untuk ${siswaList.length} siswa berhasil diunduh`);
    } catch (err) {
      console.error('Error generating bulk PDFs:', err);
      toast.error('Gagal generate PDF massal: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGeneratingBulk(false);
      setBulkProgress({ current: 0, total: 0, currentStudent: '' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pelengkap Raport</h1>
          <p className="text-muted-foreground">Generate PDF identitas siswa</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
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
          <h1 className="text-3xl font-bold tracking-tight">Pelengkap Raport</h1>
          <p className="text-muted-foreground">Generate PDF identitas siswa</p>
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
        <h1 className="text-3xl font-bold tracking-tight">Pelengkap Raport</h1>
        <p className="text-muted-foreground">
          Generate PDF identitas siswa ({siswaList.length} siswa)
        </p>
      </div>

      {/* Margin Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <CardTitle>Pengaturan Margin PDF</CardTitle>
          </div>
          <CardDescription>Atur margin untuk dokumen PDF (dalam mm)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="margin_top">Margin Atas (mm)</Label>
              <Input
                id="margin_top"
                type="number"
                step="0.1"
                value={marginSettings.margin_top}
                onChange={(e) => setMarginSettings({ ...marginSettings, margin_top: parseFloat(e.target.value) || 0 })}
                disabled={savingMargin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin_bottom">Margin Bawah (mm)</Label>
              <Input
                id="margin_bottom"
                type="number"
                step="0.1"
                value={marginSettings.margin_bottom}
                onChange={(e) => setMarginSettings({ ...marginSettings, margin_bottom: parseFloat(e.target.value) || 0 })}
                disabled={savingMargin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin_left">Margin Kiri (mm)</Label>
              <Input
                id="margin_left"
                type="number"
                step="0.1"
                value={marginSettings.margin_left}
                onChange={(e) => setMarginSettings({ ...marginSettings, margin_left: parseFloat(e.target.value) || 0 })}
                disabled={savingMargin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="margin_right">Margin Kanan (mm)</Label>
              <Input
                id="margin_right"
                type="number"
                step="0.1"
                value={marginSettings.margin_right}
                onChange={(e) => setMarginSettings({ ...marginSettings, margin_right: parseFloat(e.target.value) || 0 })}
                disabled={savingMargin}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleSaveMargin} disabled={savingMargin}>
              {savingMargin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Pengaturan'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Daftar Siswa</CardTitle>
              </div>
              <CardDescription>Klik tombol "Cetak PDF" untuk generate dokumen identitas siswa</CardDescription>
            </div>

            {/* Bulk Generate Button */}
            <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
              <Button
                onClick={handleGenerateBulkPDFs}
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={generatingBulk || siswaList.length === 0}
              >
                {generatingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membuat ({bulkProgress.current} dari {bulkProgress.total})
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4 mr-2" />
                    Cetak PDF Semua Siswa
                  </>
                )}
              </Button>
              {generatingBulk && bulkProgress.total > 0 && (
                <div className="text-sm text-muted-foreground">
                  Membuat PDF untuk: {bulkProgress.currentStudent || 'Memulai...'}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right w-[150px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada data siswa
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((siswa, index) => (
                    <TableRow key={siswa.peserta_didik_id}>
                      <TableCell className="font-medium">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell className="font-medium">{siswa.nm_siswa}</TableCell>
                      <TableCell>{siswa.nis}</TableCell>
                      <TableCell>{siswa.nm_kelas || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleGeneratePDF(siswa)}
                          size="sm"
                          variant="default"
                          className="bg-red-600 hover:bg-red-700"
                          disabled={generatingPdf === siswa.peserta_didik_id || generatingBulk}
                        >
                          {generatingPdf === siswa.peserta_didik_id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Membuat PDF...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3 mr-1" />
                              Cetak PDF
                            </>
                          )}
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
                  <p className="text-sm text-muted-foreground">Tidak ada data siswa</p>
                </CardContent>
              </Card>
            ) : (
              currentItems.map((siswa, index) => (
                <Card key={siswa.peserta_didik_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        {indexOfFirstItem + index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{siswa.nm_siswa}</h3>
                        <p className="text-sm text-muted-foreground">NIS: {siswa.nis}</p>
                        <p className="text-sm text-muted-foreground">Kelas: {siswa.nm_kelas || '-'}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleGeneratePDF(siswa)}
                      size="sm"
                      variant="default"
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={generatingPdf === siswa.peserta_didik_id || generatingBulk}
                    >
                      {generatingPdf === siswa.peserta_didik_id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Membuat PDF...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" />
                          Cetak PDF
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, siswaList.length)} dari {siswaList.length} siswa
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

    </div>
  );
}
