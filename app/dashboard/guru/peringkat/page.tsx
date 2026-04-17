'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Trophy, Medal, Star, Info, ChevronRight, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
    tingkat_pendidikan_id: string;
}

interface Subject {
    mata_pelajaran_id: string;
    nm_mapel: string;
    nm_ringkas: string | null;
}

interface RankingItem {
    peserta_didik_id: string;
    nm_siswa: string;
    nisn: string;
    grades: Record<string, number>;
    total: number;
    average: number;
    rank: number;
}

export default function PeringkatKelasPage() {
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rankingData, setRankingData] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadUserAndClasses = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser?.ptk_id) {
                    const response = await fetch(`/api/guru/peringkat?ptk_id=${currentUser.ptk_id}`);
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

    const fetchRankingData = useCallback(async (classId: string) => {
        if (!user?.ptk_id || !classId) return;

        setLoadingData(true);
        setError('');
        try {
            const response = await fetch(
                `/api/guru/peringkat?ptk_id=${user.ptk_id}&rombongan_belajar_id=${classId}`
            );
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setSubjects(data.subjects || []);
            setRankingData(data.ranking || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data peringkat');
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedClassId) {
            fetchRankingData(selectedClassId);
        }
    }, [selectedClassId, fetchRankingData]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
        if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
        return null;
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return "bg-yellow-50 text-yellow-700 border-yellow-200";
        if (rank === 2) return "bg-slate-50 text-slate-700 border-slate-200";
        if (rank === 3) return "bg-amber-50 text-amber-700 border-amber-200";
        return "bg-gray-50 text-gray-600 border-gray-100";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card className="rounded-sm border-l-4 border-l-orange-600">
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
        <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-slate-900">
            <div className="flex items-center gap-3">
                <div className="h-10 w-1 pt-1 bg-orange-600 rounded-full" />
                <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a] uppercase">
                    Peringkat Siswa (Rangking)
                </h1>
            </div>
            <Card className="rounded-sm shadow-sm border-none bg-gradient-to-r from-orange-50 to-white">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="class-select" className="text-sm font-bold text-gray-700 min-w-[100px]">
                                Pilih Kelas Perwalian :
                            </Label>
                        </div>
                        <div className="flex-1 max-w-sm">
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={loadingData}
                            >
                                <SelectTrigger id="class-select" className="bg-white border-orange-200 focus:ring-orange-500">
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
                        {selectedClassId && (
                           <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-100/50 px-3 py-1.5 rounded-full border border-orange-200">
                               <Info className="h-3.5 w-3.5" />
                               <span>Data dihitung dari total nilai akhir seluruh mata pelajaran yang sudah terisi.</span>
                           </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-blue-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Siswa</p>
                            <p className="text-xl font-bold text-blue-900">{rankingData.length} Siswa</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Star className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Tertinggi</p>
                            <p className="text-xl font-bold text-emerald-900">
                                {rankingData.length > 0 ? rankingData[0].average : 0}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-purple-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Trophy className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">Peringkat 1</p>
                            <p className="text-sm font-bold text-purple-900 truncate max-w-[150px]">
                                {rankingData.length > 0 ? rankingData[0].nm_siswa : '-'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Alert variant="destructive" className="rounded-sm border-l-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="rounded-sm shadow-md border-none overflow-hidden w-full max-w-full min-w-0">
                <CardContent className="p-0">
                        <Table className="border-collapse">
                            <TableHeader className="bg-[#4a6b8a]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-white font-bold w-[60px] border-r border-white/10 text-center sticky left-0 z-[5] bg-[#4a6b8a]">
                                        Rank
                                    </TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 min-w-[200px] sticky left-[60px] z-[5] bg-[#4a6b8a]">
                                        Nama Siswa
                                    </TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 text-center px-2">
                                        NISN
                                    </TableHead>
                                    
                                    {/* Dynamic Subject Columns */}
                                    {subjects.map((sub) => (
                                        <TableHead 
                                            key={sub.mata_pelajaran_id}
                                            className="text-white font-bold border-r border-white/10 text-center text-[10px] min-w-[60px] px-1"
                                            title={sub.nm_mapel}
                                        >
                                            <div className="flex flex-col items-center leading-tight">
                                                <span>{sub.nm_ringkas || sub.nm_mapel.substring(0, 5)}</span>
                                            </div>
                                        </TableHead>
                                    ))}

                                    <TableHead className="text-white font-bold border-r border-white/10 text-center bg-[#3a5b7a] min-w-[80px]">Total</TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 text-center bg-[#3a5b7a] min-w-[80px]">Rata-rata</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="sticky left-0 z-[1] bg-white"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                                            <TableCell className="sticky left-[60px] z-[1] bg-white"><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                            {subjects.map((s) => (
                                                <TableCell key={s.mata_pelajaran_id}><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                            ))}
                                            <TableCell><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : rankingData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={subjects.length + 5} className="h-32 text-center text-muted-foreground">
                                            {selectedClassId ? 'Tidak ada data siswa' : 'Silakan pilih kelas perwalian terlebih dahulu'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rankingData.map((item, index) => (
                                        <TableRow 
                                            key={item.peserta_didik_id} 
                                            className={cn(
                                                "hover:bg-blue-50/30 transition-colors",
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                            )}
                                        >
                                            <TableCell className={cn(
                                                "text-center font-bold border-r sticky left-0 z-[1] w-[60px]",
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            )}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {getRankIcon(item.rank)}
                                                    <span className={cn(item.rank <= 3 ? "text-lg" : "text-sm")}>
                                                        {item.rank}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "font-medium text-gray-700 border-r sticky left-[60px] z-[1] min-w-[200px]",
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            )}>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold uppercase">{item.nm_siswa}</span>
                                                    <span className="text-[10px] text-gray-400">ID: {item.peserta_didik_id.substring(0, 8)}...</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-gray-500 border-r border-gray-100">
                                                {item.nisn || '-'}
                                            </TableCell>
                                            
                                            {subjects.map((sub) => {
                                                const val = item.grades[sub.mata_pelajaran_id];
                                                return (
                                                    <TableCell 
                                                        key={sub.mata_pelajaran_id} 
                                                        className={cn(
                                                            "text-center border-r border-gray-100 text-sm",
                                                            val && val < 75 ? "text-red-500 font-medium" : "text-gray-600"
                                                        )}
                                                    >
                                                        {val ?? '-'}
                                                    </TableCell>
                                                );
                                            })}

                                            <TableCell className="text-center font-bold text-blue-700 border-r border-gray-100 bg-blue-50/20">
                                                {item.total}
                                            </TableCell>
                                            <TableCell className="text-center border-r border-gray-100 bg-orange-50/20">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-orange-700">{item.average}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                </CardContent>
            </Card>


            
            <div className="text-[11px] text-gray-400 italic flex items-center gap-1.5 px-1">
                <ChevronRight className="h-3 w-3" />
                <span>Catatan: Kolom mata pelajaran menggunakan nama singkatan/pendek. Arahkan kursor ke judul kolom untuk melihat nama lengkap mata pelajaran.</span>
            </div>
        </div>
    );
}
