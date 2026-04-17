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
import { Calendar, CheckCircle2, Loader2, RefreshCw, Info } from 'lucide-react';
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Pengaturan Semester
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Pilih semester aktif yang akan digunakan secara global oleh seluruh sistem.
        </p>
      </div>

      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Daftar Semester</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshActiveSemester}
            disabled={loading}
            className="h-7 text-[10px] font-bold border-blue-200 hover:bg-blue-50 text-[#1e3a8a] py-0 transition-all uppercase"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH DATA
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading && semesters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data semester...</p>
            </div>
          ) : (
            <div className="">
              <Table>
                <TableHeader className="bg-[#1e3a8a]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[100px] text-white font-bold text-[10px] h-9 uppercase tracking-wider">ID</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Semester</TableHead>
                    <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Tahun Ajaran</TableHead>
                    <TableHead className="text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Aksi</TableHead>
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
                        className={activeSemester?.semester_id === s.semester_id ? "bg-blue-50/50" : "hover:bg-slate-50 transition-colors"}
                      >
                        <TableCell className="py-2 text-[10px] font-mono text-slate-400">{s.semester_id}</TableCell>
                        <TableCell className="py-2">
                           <span className={`text-xs font-bold ${activeSemester?.semester_id === s.semester_id ? 'text-[#1e3a8a]' : 'text-slate-700'}`}>
                            {s.nama_semester}
                           </span>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-slate-500 font-medium">{s.tahun_ajaran_id}</TableCell>
                        <TableCell className="py-2 text-center">
                          {activeSemester?.semester_id === s.semester_id ? (
                            <Badge className="bg-[#1e3a8a] text-white shadow-sm px-2 py-0 h-5 text-[9px] font-bold uppercase">
                              AKTIF
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 px-2 py-0 h-5 text-[9px] bg-white font-medium">
                              NON-AKTIF
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button
                            size="sm"
                            disabled={updatingId === s.semester_id || activeSemester?.semester_id === s.semester_id}
                            onClick={() => handleSetActive(s.semester_id)}
                            className={`h-7 px-3 text-[10px] font-bold transition-all uppercase ${
                              activeSemester?.semester_id === s.semester_id 
                              ? "bg-blue-50 text-[#1e3a8a] cursor-default border-none" 
                              : "bg-[#1e3a8a] hover:bg-black text-white shadow-sm"
                            }`}
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

      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg shadow-sm">
        <div className="flex gap-3">
          <div className="flex-shrink-0 bg-white p-1.5 rounded-md h-fit border border-blue-100 shadow-sm">
            <Info className="h-3.5 w-3.5 text-[#1e3a8a]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[11px] font-black text-[#1e3a8a] uppercase tracking-tight">Informasi Sinkronisasi Semester</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              Perubahan semester bersifat global dan akan langsung memengaruhi seluruh modul Guru, Admin, serta filter raport di sistem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
