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
import { Trophy, Medal, Star, Info, ChevronRight, User, Users, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useSemester } from '@/components/providers/semester-context';

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
    nm_kelas: string;
    grades: Record<string, number>;
    total: number;
    average: number;
    rank: number;
}

export default function AdminPeringkatKelasPage() {
    const { activeSemester } = useSemester();
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [rankingMode, setRankingMode] = useState<'class' | 'grade'>('class');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('10');
    const [limit, setLimit] = useState<string>(''); // Empty means all
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rankingData, setRankingData] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const semesterId = activeSemester?.semester_id;
                const url = `/api/admin/peringkat${semesterId ? `?semester_id=${semesterId}` : ''}`;
                
                const response = await fetch(url);
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

        if (activeSemester) {
            loadClasses();
        }
    }, [activeSemester]);

    const fetchRankingData = useCallback(async (mode: 'class' | 'grade', id: string) => {
        if (!id) return;

        setLoadingData(true);
        setError('');
        try {
            const semesterId = activeSemester?.semester_id;
            const semesterParam = semesterId ? `&semester_id=${semesterId}` : '';
            
            const url = mode === 'class' 
                ? `/api/admin/peringkat?rombongan_belajar_id=${id}${semesterParam}`
                : `/api/admin/peringkat?tingkat_pendidikan_id=${id}${semesterParam}`;
                
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setSubjects(data.subjects || []);
            setRankingData(data.ranking || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data peringkat');
        } finally {
            setLoadingData(false);
        }
    }, [activeSemester]);

    useEffect(() => {
        if (rankingMode === 'class' && selectedClassId) {
            fetchRankingData('class', selectedClassId);
        } else if (rankingMode === 'grade' && selectedGrade) {
            fetchRankingData('grade', selectedGrade);
        }
    }, [rankingMode, selectedClassId, selectedGrade, fetchRankingData]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
        if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
        return null;
    };

    // Filter data based on limit
    const displayData = limit ? rankingData.slice(0, parseInt(limit)) : rankingData;

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
        <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1 pt-1 bg-blue-600 rounded-full" />
                    <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a] uppercase">
                        Peringkat Siswa (Admin)
                    </h1>
                </div>

                <div className="flex items-center bg-white p-1 rounded-lg border shadow-sm">
                    <button
                        onClick={() => setRankingMode('class')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2",
                            rankingMode === 'class' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <User className="h-3.5 w-3.5" />
                        Per Kelas
                    </button>
                    <button
                        onClick={() => setRankingMode('grade')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2",
                            rankingMode === 'grade' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Per Angkatan
                    </button>
                </div>
            </div>
            
            <Card className="rounded-sm shadow-sm border-none bg-gradient-to-r from-blue-50 to-white">
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {rankingMode === 'class' ? (
                            <div className="flex items-center gap-4 flex-1">
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
                        ) : (
                            <div className="flex items-center gap-4 flex-1">
                                <Label htmlFor="grade-select" className="text-sm font-bold text-gray-700 min-w-[100px]">
                                    Pilih Tingkat :
                                </Label>
                                <div className="flex-1 max-w-sm">
                                    <Select
                                        value={selectedGrade}
                                        onValueChange={setSelectedGrade}
                                        disabled={loadingData}
                                    >
                                        <SelectTrigger id="grade-select" className="bg-white border-blue-200 focus:ring-blue-500">
                                            <SelectValue placeholder="Pilih tingkat..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">Tingkat 10 (Kelas X)</SelectItem>
                                            <SelectItem value="11">Tingkat 11 (Kelas XI)</SelectItem>
                                            <SelectItem value="12">Tingkat 12 (Kelas XII)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Label htmlFor="limit-input" className="text-sm font-bold text-gray-700 whitespace-nowrap">
                                Batas Peringkat :
                            </Label>
                            <div className="relative w-32">
                                <Input
                                    id="limit-input"
                                    type="number"
                                    placeholder="Semua"
                                    value={limit}
                                    onChange={(e) => setLimit(e.target.value)}
                                    className="pl-8 bg-white border-blue-200"
                                />
                                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                            <span className="text-[11px] text-gray-400 italic">Kosongkan untuk menampilkan semua</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-indigo-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <User className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">Total Siswa</p>
                            <p className="text-xl font-bold text-indigo-900">{rankingData.length} Siswa</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Star className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Nilai Tertinggi</p>
                            <p className="text-xl font-bold text-emerald-900">
                                {rankingData.length > 0 ? rankingData[0].average : 0}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-amber-50/50">
                    <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Trophy className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Peringkat 1 {rankingMode === 'grade' ? 'Angkatan' : ''}</p>
                            <p className="text-sm font-bold text-amber-900 truncate max-w-[150px]">
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
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                        <Table className="border-collapse">
                            <TableHeader className="bg-[#1e3a8a]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-white font-bold w-[45px] py-1.5 h-auto text-[11px] border-r border-white/10 text-center sticky left-0 z-[5] bg-[#1e3a8a]">
                                        Rank
                                    </TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 min-w-[200px] py-1.5 h-auto text-[11px] sticky left-[45px] z-[5] bg-[#1e3a8a]">
                                        Nama Siswa / Kelas
                                    </TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 text-center py-1.5 h-auto text-[11px] px-2">
                                        NISN
                                    </TableHead>
                                    
                                    {rankingMode === 'class' && subjects.map((sub) => (
                                        <TableHead 
                                            key={sub.mata_pelajaran_id}
                                            className="text-white font-medium border-r border-white/10 text-center text-[9px] min-w-[50px] px-1 py-1 h-auto"
                                            title={sub.nm_mapel}
                                        >
                                            <div className="flex flex-col items-center leading-[1.1]">
                                                <span>{sub.nm_ringkas || sub.nm_mapel.substring(0, 5)}</span>
                                            </div>
                                        </TableHead>
                                    ))}

                                    <TableHead className="text-white font-bold border-r border-white/10 text-center py-1.5 h-auto text-[11px] bg-[#162e6e] min-w-[70px]">Total</TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 text-center py-1.5 h-auto text-[11px] bg-[#162e6e] min-w-[70px]">Rata²</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i} className="h-8">
                                            <TableCell className="sticky left-0 z-[1] bg-white text-center py-1.5">
                                                <Skeleton className="h-3 w-4 mx-auto" />
                                            </TableCell>
                                            <TableCell className="sticky left-[45px] z-[1] bg-white py-1.5">
                                                <div className="space-y-1">
                                                    <Skeleton className="h-3 w-full" />
                                                    <Skeleton className="h-2 w-1/2" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1.5"><Skeleton className="h-3 w-12 mx-auto" /></TableCell>
                                            {rankingMode === 'class' && subjects.map((s) => (
                                                <TableCell key={s.mata_pelajaran_id} className="py-1.5"><Skeleton className="h-3 w-6 mx-auto" /></TableCell>
                                            ))}
                                            <TableCell className="py-1.5"><Skeleton className="h-3 w-8 mx-auto" /></TableCell>
                                            <TableCell className="py-1.5"><Skeleton className="h-3 w-8 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : displayData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={subjects.length + 6} className="h-32 text-center text-muted-foreground italic">
                                            {selectedClassId || selectedGrade ? 'Tidak ada data nilai tersedia' : 'Pilih filter untuk melihat peringkat'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayData.map((item, index) => (
                                        <TableRow 
                                            key={item.peserta_didik_id} 
                                            className={cn(
                                                "hover:bg-blue-50/50 transition-colors border-b border-gray-100",
                                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                                            )}
                                        >
                                            <TableCell className={cn(
                                                "text-center font-bold border-r sticky left-0 z-[1] w-[45px] py-1.5 px-1",
                                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                            )}>
                                                <div className="flex items-center justify-center gap-1 scale-90">
                                                    {getRankIcon(item.rank)}
                                                    <span className={cn(item.rank <= 3 ? "text-sm font-black text-blue-900" : "text-[11px] text-gray-500")}>
                                                        {item.rank}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "font-medium border-r sticky left-[45px] z-[1] min-w-[200px] py-1.5 px-3",
                                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                            )}>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-[11px] font-semibold uppercase text-slate-700 truncate max-w-[190px]">{item.nm_siswa}</span>
                                                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{item.nm_kelas}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-[10px] text-gray-500 border-r border-gray-100 py-1.5 px-2">
                                                {item.nisn || '-'}
                                            </TableCell>
                                            
                                            {rankingMode === 'class' && subjects.map((sub) => {
                                                const val = item.grades[sub.mata_pelajaran_id];
                                                return (
                                                    <TableCell 
                                                        key={sub.mata_pelajaran_id} 
                                                        className={cn(
                                                            "text-center border-r border-gray-100 text-[11px] py-1.5 px-1",
                                                            val && val < 75 ? "text-red-500 font-bold bg-red-50/5" : "text-gray-600"
                                                        )}
                                                    >
                                                        {val ?? '-'}
                                                    </TableCell>
                                                );
                                            })}

                                            <TableCell className="text-center font-bold text-blue-700 border-r border-gray-100 bg-blue-50/20 py-1.5 px-2 text-[11px]">
                                                {item.total}
                                            </TableCell>
                                            <TableCell className="text-center border-r border-gray-100 bg-amber-50/20 py-1.5 px-2">
                                                <span className="font-bold text-amber-700 text-[11px]">{item.average}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <div className="text-[11px] text-gray-500 italic flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 text-blue-500" />
                    <span>
                        {rankingMode === 'grade' 
                            ? "Pada mode Angkatan, ranking dihitung berdasarkan akumulasi seluruh mata pelajaran yang diambil siswa di tingkat tersebut."
                            : "Nama mata pelajaran ditampilkan dalam kode/singkatan. Detail lengkap muncul saat kursor diarahkan ke judul kolom."
                        }
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-yellow-400" />
                        <span className="text-[10px] font-medium text-gray-600">Peringkat 1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-slate-400" />
                        <span className="text-[10px] font-medium text-gray-600">Peringkat 2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-amber-600" />
                        <span className="text-[10px] font-medium text-gray-600">Peringkat 3</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
