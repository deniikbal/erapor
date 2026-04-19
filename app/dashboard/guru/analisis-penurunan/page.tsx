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
import { 
    TrendingDown, 
    TrendingUp, 
    Minus, 
    Layers, 
    Info, 
    AlertTriangle,
    BarChart3,
    ArrowDownRight,
    ArrowUpRight
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
}

interface AnalysisItem {
    mata_pelajaran_id: string;
    nm_mapel: string;
    avg_prev: number | null;
    avg_cur: number;
    delta: number | null;
}

interface SemesterInfo {
    current: string;
    previous: string;
}

export default function GuruAnalisisPenurunanPage() {
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [analysisData, setAnalysisData] = useState<AnalysisItem[]>([]);
    const [semesters, setSemesters] = useState<SemesterInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser?.ptk_id) {
                    const response = await fetch(`/api/guru/analisis-penurunan?ptk_id=${currentUser.ptk_id}`);
                    const data = await response.json();

                    if (data.error) throw new Error(data.error);

                    setClasses(data.classes || []);
                    setSemesters(data.semesters || null);
                    
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

        loadInitialData();
    }, []);

    const fetchAnalysisData = useCallback(async (classId: string) => {
        if (!user?.ptk_id || !classId) return;

        setLoadingData(true);
        setError('');
        try {
            const response = await fetch(`/api/guru/analisis-penurunan?ptk_id=${user.ptk_id}&rombongan_belajar_id=${classId}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setAnalysisData(data.analysis || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data analisis');
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedClassId) {
            fetchAnalysisData(selectedClassId);
        }
    }, [selectedClassId, fetchAnalysisData]);

    const subjectsWithDecrease = analysisData.filter(item => item.delta !== null && item.delta < 0);
    const subjectsWithIncrease = analysisData.filter(item => item.delta !== null && item.delta > 0);
    const avgDelta = analysisData.length > 0 
        ? analysisData.reduce((acc, curr) => acc + (curr.delta || 0), 0) / analysisData.length 
        : 0;

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card>
                    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-slate-900">
            <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-blue-600 rounded-full" />
                <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a] uppercase">
                    Analisis Penurunan Nilai Kelas
                </h1>
            </div>

            <Card className="rounded-sm shadow-sm border-none bg-gradient-to-r from-blue-50 to-white py-4">
                <CardContent className="py-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex items-center gap-3 min-w-[150px]">
                            <Layers className="h-5 w-5 text-blue-600" />
                            <Label htmlFor="class-select" className="text-sm font-bold text-slate-600 uppercase">
                                Rombel Saya :
                            </Label>
                        </div>
                        <div className="flex-1 max-w-sm">
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={loadingData}
                            >
                                <SelectTrigger id="class-select" className="bg-white border-blue-100 focus:ring-blue-500 font-bold text-blue-700">
                                    <SelectValue placeholder="Pilih kelas..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.rombongan_belajar_id} value={cls.rombongan_belajar_id} className="font-medium">
                                            {cls.nm_kelas}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {semesters && (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 rounded-full text-white shadow-sm ml-auto">
                                <BarChart3 className="h-4 w-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    {semesters.previous} vs {semesters.current}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-slate-50 border-l-4 border-l-slate-400">
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mapel Dianalisis</p>
                        <p className="text-2xl font-black text-slate-800">{analysisData.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-red-50 border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Mapel Menurun</p>
                        <p className="text-2xl font-black text-red-700">{subjectsWithDecrease.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50 border-l-4 border-l-emerald-500">
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Mapel Meningkat</p>
                        <p className="text-2xl font-black text-emerald-700">{subjectsWithIncrease.length}</p>
                    </CardContent>
                </Card>
                <Card className={cn(
                    "border-none shadow-sm border-l-4",
                    avgDelta < 0 ? "bg-amber-50 border-l-amber-500" : "bg-blue-50 border-l-blue-500"
                )}>
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Trend Kelas (Delta)</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-black">{avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(2)}</p>
                            {avgDelta < 0 ? <TrendingDown className="h-5 w-5 text-red-500" /> : <TrendingUp className="h-5 w-5 text-emerald-500" />}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Alert variant="destructive" className="rounded-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="rounded-sm shadow-md border-none overflow-hidden bg-white">
                <CardHeader className="bg-blue-600 text-white py-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Detail Perkembangan Rata-rata Nilai
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 px-4 pb-4">
                    <Table className="mt-4 border rounded-md">
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[60px] text-center font-bold text-slate-700 text-xs py-3">No</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs py-3">Mata Pelajaran</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 text-xs py-3">Avg Semester Lalu</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 text-xs py-3">Avg Semester Ini</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 text-xs py-3">Selisih</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 text-xs py-3 w-[150px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingData ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : analysisData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic">
                                        Data perbandingan tidak tersedia. Siswa mungkin baru terdaftar di semester ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                analysisData.map((item, index) => (
                                    <TableRow key={item.mata_pelajaran_id} className="hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="text-center font-bold text-slate-400 py-3">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-700 py-3">{item.nm_mapel}</TableCell>
                                        <TableCell className="text-center font-medium text-slate-500 py-3">{item.avg_prev ?? '-'}</TableCell>
                                        <TableCell className="text-center font-bold text-blue-700 py-3">{item.avg_cur}</TableCell>
                                        <TableCell className={cn(
                                            "text-center font-black py-3",
                                            item.delta === null ? "text-slate-300" :
                                            item.delta < 0 ? "text-red-600" : 
                                            item.delta > 0 ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                            {item.delta !== null ? (item.delta > 0 ? `+${item.delta}` : item.delta) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-center py-3">
                                            {item.delta === null ? (
                                                <Badge variant="outline" className="text-slate-400 opacity-50">No Data</Badge>
                                            ) : item.delta < 0 ? (
                                                <Badge className="bg-red-50 text-red-700 border-red-200 shadow-none gap-1">
                                                    <ArrowDownRight className="h-3 w-3" /> Turun
                                                </Badge>
                                            ) : item.delta > 0 ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none gap-1">
                                                    <ArrowUpRight className="h-3 w-3" /> Naik
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-blue-500">Stabil</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-4 bg-slate-50 rounded-md border border-slate-100">
                <Info className="h-4 w-4 text-blue-500" />
                <span>
                    Sebagai Wali Kelas, Anda dapat memantau mata pelajaran mana yang mengalami penurunan prestasi secara kolektif di kelas Anda dibandingkan semester lalu.
                </span>
            </div>
        </div>
    );
}
