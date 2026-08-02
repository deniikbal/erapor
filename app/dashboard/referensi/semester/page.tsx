'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
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
    <div className="space-y-6 pb-6">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-20 h-28 w-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/80">
              Referensi
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">Pengaturan Semester</h1>
            <p className="mt-1 text-sm text-blue-200/70">
              Pilih semester aktif yang digunakan secara global oleh seluruh sistem.
            </p>
          </div>
          {activeSemester && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:mt-0">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">Semester Aktif</p>
                <p className="text-sm font-black text-white">{activeSemester.nama_semester}</p>
                <p className="text-[10px] text-blue-200/60">{activeSemester.tahun_ajaran_id}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabel Semester ── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
        {/* card header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#1e3a8a]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Daftar Semester</h3>
            {!loading && semesters.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                {semesters.length}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshActiveSemester}
            disabled={loading}
            className="h-7 gap-1.5 border-blue-200 px-3 text-[10px] font-bold text-[#1e3a8a] hover:bg-blue-50 uppercase"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* content */}
        {loading && semesters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a8a]" />
            <p className="text-[12px] text-slate-400 animate-pulse">Memuat data semester...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#1e3a8a]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[110px] text-white font-bold text-[10px] h-9 uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Nama Semester</TableHead>
                <TableHead className="text-white font-bold text-[10px] h-9 uppercase tracking-wider">Tahun Ajaran</TableHead>
                <TableHead className="text-center text-white font-bold text-[10px] h-9 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right text-white font-bold text-[10px] h-9 uppercase tracking-wider pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <GraduationCap className="h-8 w-8 text-slate-200" />
                      <p className="text-[12px] text-slate-400">Tidak ada data semester ditemukan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                semesters.map((s) => {
                  const isActive = activeSemester?.semester_id === s.semester_id;
                  const isUpdating = updatingId === s.semester_id;
                  return (
                    <TableRow
                      key={s.semester_id}
                      className={`transition-colors ${
                        isActive
                          ? 'bg-blue-50/60 border-l-2 border-l-[#1e3a8a]'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <TableCell className="py-3 text-[10px] font-mono text-slate-400">
                        {s.semester_id}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1e3a8a]" />
                          )}
                          <span className={`text-[12px] font-bold ${isActive ? 'text-[#1e3a8a]' : 'text-slate-700'}`}>
                            {s.nama_semester}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {s.tahun_ajaran_id}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {isActive ? (
                          <Badge className="bg-[#1e3a8a] text-white px-2.5 py-0.5 text-[9px] font-black uppercase shadow-sm">
                            ✓ AKTIF
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 text-slate-400 px-2.5 py-0.5 text-[9px] font-medium bg-white">
                            NON-AKTIF
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1e3a8a]">
                            <CheckCircle2 className="h-3 w-3" />
                            Sedang Aktif
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleSetActive(s.semester_id)}
                            className="h-7 gap-1.5 bg-[#1e3a8a] px-3 text-[10px] font-bold text-white shadow-sm hover:bg-black uppercase transition-all"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                Pilih
                                <ChevronRight className="h-3 w-3" />
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Info Box ── */}
      <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-md">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
          <Info className="h-4 w-4 text-[#1e3a8a]" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-[#1e3a8a]">
            Informasi Semester
          </h3>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Perubahan semester bersifat global dan akan langsung memengaruhi seluruh modul Guru, Admin,
            serta filter raport di sistem.
          </p>
        </div>
      </div>

    </div>
  );
}
