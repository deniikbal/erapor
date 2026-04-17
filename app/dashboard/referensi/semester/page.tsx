'use client';

import { useState } from 'react';
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
import { useSemester } from '@/components/providers/semester-context';

export default function SemesterSettingPage() {
  const { semesters, activeSemester, loading, refreshActiveSemester, updateActiveSemester } = useSemester();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleSetActive = async (semesterId: string) => {
    setUpdatingId(semesterId);
    await updateActiveSemester(semesterId);
    setUpdatingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e3a8a]">Pengaturan Semester</h1>
        <p className="text-muted-foreground">Pilih semester yang akan digunakan secara global sebagai semester aktif.</p>
      </div>

      <Card className="rounded-sm border-l-4 border-l-emerald-600 shadow-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-slate-50/50 border-b">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2 text-[#1e3a8a]">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Daftar Semester
            </CardTitle>
            <CardDescription>
              Tentukan semester aktif untuk memfilter data Kelas, Siswa, dan Nilai secara global.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshActiveSemester}
            disabled={loading}
            className="hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading && semesters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data semester...</p>
            </div>
          ) : (
            <div className="">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[100px] font-bold">ID</TableHead>
                    <TableHead className="font-bold">Nama Semester</TableHead>
                    <TableHead className="font-bold">Tahun Ajaran</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semesters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Tidak ada data semester ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    semesters.map((s) => (
                      <TableRow 
                        key={s.semester_id} 
                        className={activeSemester?.semester_id === s.semester_id ? "bg-emerald-50/40" : "hover:bg-slate-50/50 transition-colors"}
                      >
                        <TableCell className="font-mono text-xs text-slate-500">{s.semester_id}</TableCell>
                        <TableCell className="font-semibold text-slate-700">{s.nama_semester}</TableCell>
                        <TableCell>{s.tahun_ajaran_id}</TableCell>
                        <TableCell className="text-center">
                          {activeSemester?.semester_id === s.semester_id ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 shadow-sm px-3 py-1">
                              <CheckCircle2 className="h-3 w-3 mr-1.5" />
                              Sedang Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-slate-200 px-3 py-1 bg-white">
                              Non-Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            variant={activeSemester?.semester_id === s.semester_id ? "secondary" : "outline"}
                            disabled={updatingId === s.semester_id || activeSemester?.semester_id === s.semester_id}
                            onClick={() => handleSetActive(s.semester_id)}
                            className={activeSemester?.semester_id === s.semester_id 
                              ? "bg-emerald-100 text-emerald-800 border-none opacity-80 cursor-default" 
                              : "border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            }
                          >
                            {updatingId === s.semester_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : activeSemester?.semester_id === s.semester_id ? (
                              'Aktif'
                            ) : (
                              'Pilih Semester'
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

      <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-lg shadow-sm">
        <div className="flex gap-4">
          <div className="flex-shrink-0 bg-blue-100 p-2 rounded-full h-fit">
            <Calendar className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-blue-900">Informasi Penting</h3>
            <div className="text-sm text-blue-700 leading-relaxed">
              <p>
                Perubahan semester aktif bersifat <strong>Global</strong>. Ini berarti seluruh pengguna (Guru & Admin) akan melihat data yang difilter berdasarkan semester ini.
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Daftar Rombongan Belajar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Halaman Input Nilai & Kehadiran</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Proses Pencetakan Raport</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Statistik Perkembangan Siswa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
