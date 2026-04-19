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
import { ClipboardCheck, Loader2, Search, User } from 'lucide-react';
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

export default function StatusPenilaianPage() {
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [statusData, setStatusData] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadUserAndClasses = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser?.ptk_id) {
                    const response = await fetch(`/api/guru/status-penilaian?ptk_id=${currentUser.ptk_id}`);
                    const data = await response.json();

                    if (data.error) throw new Error(data.error);

                    setClasses(data.classes || []);
                    if (data.classes?.length > 0) {
                        setSelectedClassId(data.classes[0].rombongan_belajar_id);
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Gagal memuat data kelas');
            } finally {
                setLoading(false);
            }
        };

        loadUserAndClasses();
    }, []);

    const fetchStatusData = useCallback(async (classId: string) => {
        if (!user?.ptk_id || !classId) return;

        setLoadingData(true);
        try {
            const response = await fetch(
                `/api/guru/status-penilaian?ptk_id=${user.ptk_id}&rombongan_belajar_id=${classId}`
            );
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setStatusData(data.status || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat status penilaian');
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedClassId) {
            fetchStatusData(selectedClassId);
        }
    }, [selectedClassId, fetchStatusData]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card className="rounded-sm border-l-4 border-l-blue-600">
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
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-[#1e3a8a]" />
                    <h1 className="text-xl font-black tracking-tight text-[#1e3a8a] uppercase">
                        Status Penilaian Guru
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] italic ml-7">
                    Pantau kelengkapan penginputan nilai rapor dan deskripsi kompetensi per mata pelajaran.
                </p>
            </div>

            <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                <CardContent className="py-3 px-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                            <Search className="h-3.5 w-3.5 text-blue-500" />
                            <Label htmlFor="class-select" className="text-xs font-bold text-gray-500 uppercase">
                                Pilih Kelas
                            </Label>
                        </div>
                        <div className="flex-1 max-w-xs">
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={loadingData}
                            >
                                <SelectTrigger id="class-select" className="h-8 bg-white border-blue-200 text-xs text-[#1e3a8a] font-semibold">
                                    <SelectValue placeholder="Pilih kelas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.rombongan_belajar_id} value={cls.rombongan_belajar_id} className="text-xs">
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

            <Card className="rounded-sm shadow-md border-none overflow-hidden bg-white">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-[#1e3a8a]">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-white font-bold text-[10px] uppercase w-[50px] border-r border-white/10 text-center h-10">No</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Mata Pelajaran</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10">Guru Pengampu</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10">Rombel</TableHead>
                                <TableHead className="text-white font-bold p-0 text-[10px] uppercase text-center h-10" colSpan={2}>
                                    <div className="border-b border-white/10 py-1">Kelengkapan Data Nilai</div>
                                    <div className="grid grid-cols-2">
                                        <span className="py-1 border-r border-white/10">Nilai Pengetahuan</span>
                                        <span className="py-1">Deskripsi Sikap</span>
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
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        {selectedClassId ? 'Tidak ada data mata pelajaran' : 'Silakan pilih kelas terlebih dahulu'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                statusData.map((item, index) => (
                                    <TableRow key={item.mata_pelajaran_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100 h-10">
                                        <TableCell className="text-center font-bold text-slate-400 text-[10px] border-r py-1">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-[#1e3a8a] text-[11px] border-r py-1">{item.nm_mapel}</TableCell>
                                        <TableCell className="border-r py-1">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                    <User className="h-3 w-3 text-blue-500" />
                                                    <span className="font-semibold text-slate-700 capitalize">
                                                        {item.nama_guru !== '-' ? item.nama_guru.toLowerCase() : 'Belum ditentukan'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center border-r py-1 font-medium text-slate-600 text-[10px]">{item.rombel}</TableCell>
                                        <TableCell className="p-0 border-r w-[110px]">
                                            <div className={`flex items-center justify-center h-10 text-[11px] font-bold ${item.count_nilai === item.total_siswa ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {item.count_nilai} / {item.total_siswa}
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 w-[110px]">
                                            <div className={`flex items-center justify-center h-10 text-[11px] font-bold ${item.count_deskripsi === item.total_siswa ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
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
        </div>
    );
}
