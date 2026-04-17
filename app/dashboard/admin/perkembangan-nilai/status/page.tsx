'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCurrentUser } from '@/lib/auth-client';
import { ClipboardCheck, Loader2, Search, User, Layers } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
    tingkat_pendidikan_id: string;
}

interface StatusItem {
    mata_pelajaran_id: string;
    nm_mapel: string;
    rombel: string;
    nama_guru: string;
    total_siswa: number;
    count_nilai: number;
    count_deskripsi: number;
}

export default function AdminStatusPenilaianPage() {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [statusData, setStatusData] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const response = await fetch('/api/admin/status-penilaian');
                const data = await response.json();

                if (data.error) throw new Error(data.error);

                setClasses(data.classes || []);
                if (data.classes?.length > 0) {
                    setSelectedClassId(data.classes[0].rombongan_belajar_id);
                }
            } catch (err: any) {
                setError(err.message || 'Gagal memuat data kelas');
            } finally {
                setLoading(false);
            }
        };

        loadClasses();
    }, []);

    const fetchStatusData = useCallback(async (classId: string) => {
        if (!classId) return;

        setLoadingData(true);
        setError('');
        try {
            const response = await fetch(`/api/admin/status-penilaian?rombongan_belajar_id=${classId}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setStatusData(data.status || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat status penilaian');
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchStatusData(selectedClassId);
        }
    }, [selectedClassId, fetchStatusData]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card className="rounded-sm border-l-4 border-l-[#1e3a8a]">
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
                    Monitoring Status Penilaian Guru
                </h1>
            </div>

            <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                <CardContent className="py-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                            <Layers className="h-4 w-4 text-[#1e3a8a]" />
                            <Label htmlFor="class-select" className="text-xs font-bold text-slate-600 uppercase">
                                Pilih Rombel :
                            </Label>
                        </div>
                        <div className="flex-1 max-w-xs">
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={loadingData}
                            >
                                <SelectTrigger id="class-select" className="h-8 bg-slate-50 border-blue-100 focus:ring-blue-500 font-bold text-sm text-[#1e3a8a]">
                                    <SelectValue placeholder="Pilih kelas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.rombongan_belajar_id} value={cls.rombongan_belajar_id} className="text-xs font-medium">
                                            {cls.nm_kelas}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive" className="rounded-sm border-l-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="rounded-sm shadow-md border-none overflow-hidden">
                <CardContent className="p-0 px-4 pb-4">
                    <Table className="mt-4 border rounded-md">
                        <TableHeader className="bg-[#1e3a8a]">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-white font-bold w-[40px] border-r border-white/10 text-center uppercase text-[9px] py-1.5">No</TableHead>
                                <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[9px] py-1.5">Mata Pelajaran</TableHead>
                                <TableHead className="text-white font-bold border-r border-white/10 uppercase text-[9px] py-1.5">Guru Pengampu</TableHead>
                                <TableHead className="text-white font-bold border-r border-white/10 text-center uppercase text-[9px] py-1.5">Rombel</TableHead>
                                <TableHead className="text-white font-bold p-0 text-center uppercase text-[9px] py-1.5" colSpan={2}>
                                    <div className="border-b border-white/10 py-0.5">Progres Nilai Rapor</div>
                                    <div className="grid grid-cols-2">
                                        <span className="py-0.5 border-r border-white/10">Angka</span>
                                        <span className="py-0.5">Deskripsi</span>
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingData ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    </TableRow>
                                ))
                            ) : statusData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                                        {selectedClassId ? 'Data mata pelajaran tidak tersedia untuk kelas ini' : 'Silakan pilih kelas terlebih dahulu'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                statusData.map((item, index) => (
                                    <TableRow key={item.mata_pelajaran_id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-blue-50/50 transition-colors'}>
                                        <TableCell className="text-center font-bold text-[#1e3a8a] border-r w-[50px] py-1.5 text-xs">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-[#1e3a8a] border-r py-1.5 text-xs">{item.nm_mapel}</TableCell>
                                        <TableCell className="border-r py-1.5">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-indigo-500" />
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {item.nama_guru !== '-' ? item.nama_guru : 'Belum ditentukan'}
                                                    </span>
                                                </div>
                                                {item.nama_guru === '-' && (
                                                    <span className="text-[9px] text-red-500 italic font-medium pl-4">
                                                        Mapping guru kosong
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center border-r font-bold text-slate-600 py-1.5 text-xs">{item.rombel}</TableCell>
                                        <TableCell className="p-0 border-r w-[80px]">
                                            <div className={`flex items-center justify-center h-[36px] text-[11px] ${item.count_nilai === item.total_siswa ? 'bg-emerald-50 text-emerald-700 font-bold border-y border-emerald-100' : 'bg-red-50 text-red-600 font-bold border-y border-red-100'}`}>
                                                {item.count_nilai} / {item.total_siswa}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 w-[80px]">
                                            <div className={`flex items-center justify-center h-[36px] text-[11px] ${item.count_deskripsi === item.total_siswa ? 'bg-emerald-50 text-emerald-700 font-bold border-y border-emerald-100' : 'bg-red-50 text-red-600 font-bold border-y border-red-100'}`}>
                                                {item.count_deskripsi} / {item.total_siswa}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-4 text-[10px] mt-2">
                <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-700">Sudah Lengkap</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="font-bold text-red-700">Belum Lengkap</span>
                </div>
                <div className="flex-1" />
                <div className="text-[9px] text-slate-400 italic">
                    * Data disinkronkan dengan tabel_nilaiakhir dan tabel_deskripsi
                </div>
            </div>
        </div>
    );
}
