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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-1 pt-1 bg-blue-600 rounded-full" />
                <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a] uppercase">
                    Status Penilaian oleh Guru Mapel
                </h1>
            </div>

            <Card className="rounded-sm shadow-sm border-none bg-gradient-to-r from-blue-50 to-white">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <Label htmlFor="class-select" className="text-sm font-bold text-gray-700 min-w-[100px]">
                            Pilih Kelas :
                        </Label>
                        <div className="flex-1 max-w-sm">
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={loadingData}
                            >
                                <SelectTrigger id="class-select" className="bg-white border-blue-200 focus:ring-blue-500">
                                    <SelectValue placeholder="Pilih kelas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.rombongan_belajar_id} value={cls.rombongan_belajar_id}>
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
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-[#5c7c9c]">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-white font-bold w-[60px] border-r border-blue-400/30 text-center">No</TableHead>
                                <TableHead className="text-white font-bold border-r border-blue-400/30">Nama Mapel</TableHead>
                                <TableHead className="text-white font-bold border-r border-blue-400/30">Guru Pengampu</TableHead>
                                <TableHead className="text-white font-bold border-r border-blue-400/30 text-center">Rombel</TableHead>
                                <TableHead className="text-white font-bold p-0 text-center" colSpan={2}>
                                    <div className="border-b border-blue-400/30 py-2">Nilai Rapor</div>
                                    <div className="grid grid-cols-2">
                                        <span className="py-2 border-r border-blue-400/30">Nilai Rapor</span>
                                        <span className="py-2">Deskripsi</span>
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
                                    <TableRow key={item.mata_pelajaran_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <TableCell className="text-center font-medium border-r w-[60px]">{index + 1}</TableCell>
                                        <TableCell className="font-medium text-gray-700 border-r">{item.nm_mapel}</TableCell>
                                        <TableCell className="border-r">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-blue-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {item.nama_guru !== '-' ? item.nama_guru : 'Belum ditentukan'}
                                                    </span>
                                                </div>
                                                {item.nama_guru === '-' && (
                                                    <span className="text-[10px] text-red-400 italic font-mono pl-5">
                                                        Data pengampu tidak ditemukan
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center border-r">{item.rombel}</TableCell>
                                        <TableCell className="p-0 border-r w-[110px]">
                                            <div className={`flex items-center justify-center h-[40px] ${item.count_nilai === item.total_siswa ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-red-100 text-red-700 font-bold'}`}>
                                                {item.count_nilai} Data
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0 w-[110px]">
                                            <div className={`flex items-center justify-center h-[40px] ${item.count_deskripsi === item.total_siswa ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-red-100 text-red-700 font-bold'}`}>
                                                {item.count_deskripsi} Data
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Sudah Lengkap</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>Belum Lengkap</span>
                </div>
            </div>
        </div>
    );
}
