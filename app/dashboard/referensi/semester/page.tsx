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
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Semester } from '@/lib/db';

export default function SemesterSettingPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/semester');
      const result = await response.json();
      if (response.ok) {
        setSemesters(result.data || []);
      } else {
        toast.error('Gagal mengambil data semester');
      }
    } catch (error) {
      console.error('Fetch semesters error:', error);
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const setActiveSemester = async (semester_id: string) => {
    setUpdatingId(semester_id);
    try {
      const response = await fetch('/api/semester/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ semester_id }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Semester aktif berhasil diperbarui');
        // Refresh list
        fetchSemesters();
      } else {
        toast.error(result.error || 'Gagal memperbarui semester aktif');
      }
    } catch (error) {
      console.error('Update semester error:', error);
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Semester</h1>
        <p className="text-muted-foreground">Pilih semester yang akan digunakan secara global sebagai semester aktif.</p>
      </div>

      <Card className="rounded-sm border-l-4 border-l-emerald-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Daftar Semester
            </CardTitle>
            <CardDescription>
              Tentukan semester aktif untuk memfilter data Kelas, Siswa, dan Nilai.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSemesters}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm text-muted-foreground">Memuat data semester...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Nama Semester</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semesters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Tidak ada data semester ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    semesters.map((s) => (
                      <TableRow key={s.semester_id} className={s.periode_aktif === '1' ? "bg-emerald-50/50" : ""}>
                        <TableCell className="font-mono text-xs">{s.semester_id}</TableCell>
                        <TableCell className="font-medium">{s.nama_semester}</TableCell>
                        <TableCell>{s.tahun_ajaran_id}</TableCell>
                        <TableCell className="text-center">
                          {s.periode_aktif === '1' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Tidak Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === s.semester_id}
                            onClick={() => setActiveSemester(s.semester_id)}
                            className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {updatingId === s.semester_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Pilih Semester Ini'
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
        </CardContent>
      </Card>

      <div className="bg-blue-50 border-l-4 border-l-blue-500 p-4 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Calendar className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Informasi Semester</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Mengubah semester aktif akan mempengaruhi data yang ditampilkan pada:
              </p>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>Daftar Rombongan Belajar (Kelas)</li>
                <li>Halaman Input Nilai</li>
                <li>Rekapitulasi Kehadiran</li>
                <li>Pencetakan Raport</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
