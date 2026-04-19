'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCurrentUser } from '@/lib/auth-client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    Line,
    ComposedChart,
    Cell
} from 'recharts';
import { 
    TrendingUp, 
    User, 
    Users, 
    ArrowUpRight, 
    ArrowDownRight, 
    Minus,
    BookOpen,
    BarChart3,
    Info,
    LineChart as LucideLineChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
}

interface SubjectInfo {
    mata_pelajaran_id: string;
    nm_mapel: string;
}

interface StudentInfo {
    peserta_didik_id: string;
    nm_siswa: string;
    nisn: string;
}

interface SemesterInfo {
    id: string;
    name: string;
}

const COLORS = [
    '#3b82f6', // Smt 1 (Blue)
    '#ef4444', // Smt 2 (Red)
    '#10b981', // Smt 3 (Green)
    '#60a5fa', // Smt 4 (Light Blue)
    '#f59e0b', // Smt 5 (Yellow)
    '#8b5cf6', // Smt 6 (Purple)
];

export default function GrafikPerkembanganPage() {
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<StudentInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [chartData, setChartData] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [analysisMapel, setAnalysisMapel] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
    const [analysisSemesters, setAnalysisSemesters] = useState<any>(null);
    const [analysisTeacher, setAnalysisTeacher] = useState<string>('');
    const [mapelFilter, setMapelFilter] = useState<'all' | 'down' | 'up' | 'stable'>('all');
    const [activeTab, setActiveTab] = useState<string>('per-siswa');
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingChart, setLoadingChart] = useState(false);
    const [loadingMapel, setLoadingMapel] = useState(false);
    const [error, setError] = useState('');

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser?.ptk_id) {
                    const res = await fetch(`/api/guru/perkembangan-nilai?ptk_id=${currentUser.ptk_id}`);
                    const data = await res.json();
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
        loadInitialData();
    }, []);

    // Load students when class changes
    useEffect(() => {
        const loadStudents = async () => {
            if (!selectedClassId) return;
            setLoadingStudents(true);
            try {
                const res = await fetch(`/api/guru/perkembangan-nilai?rombongan_belajar_id=${selectedClassId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                setStudents(data.students || []);
                setSubjects(data.subjects || []);
                
                if (data.students?.length > 0) {
                    setSelectedStudentId(data.students[0].peserta_didik_id);
                } else {
                    setSelectedStudentId('');
                    setChartData([]);
                }

                if (data.subjects?.length > 0) {
                    setSelectedSubjectId(data.subjects[0].mata_pelajaran_id);
                } else {
                    setSelectedSubjectId('');
                    setAnalysisMapel([]);
                }
            } catch (err: any) {
                setError(err.message || 'Gagal memuat data siswa');
            } finally {
                setLoadingStudents(false);
            }
        };
        loadStudents();
    }, [selectedClassId]);

    // Load analysis per mapel
    const fetchAnalysisMapel = useCallback(async (mapelId: string) => {
        if (!selectedClassId || !mapelId) return;
        setLoadingMapel(true);
        try {
            const res = await fetch(`/api/guru/perkembangan-nilai?rombongan_belajar_id=${selectedClassId}&mata_pelajaran_id=${mapelId}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAnalysisMapel(data.analysisMapel || []);
            setAnalysisSemesters(data.semesters || null);
            setAnalysisTeacher(data.teacherName || '');
        } catch (err: any) {
            setError(err.message || 'Gagal memuat analisis mapel');
        } finally {
            setLoadingMapel(false);
        }
    }, [selectedClassId]);

    useEffect(() => {
        if (activeTab === 'per-mapel' && selectedSubjectId) {
            fetchAnalysisMapel(selectedSubjectId);
        }
    }, [activeTab, selectedSubjectId, fetchAnalysisMapel]);

    // Load chart data when student changes
    useEffect(() => {
        const loadChartData = async () => {
            if (!selectedStudentId) return;
            setLoadingChart(true);
            try {
                const res = await fetch(`/api/guru/perkembangan-nilai?peserta_didik_id=${selectedStudentId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                // Add average calculation for the line chart
                const processedData = data.chartData.map((item: any) => {
                    const values = data.semesters
                        .map((s: any) => item[s.id])
                        .filter((v: any) => v !== undefined && v !== null);
                    
                    const avg = values.length > 0 
                        ? Number((values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1))
                        : 0;
                    
                    return { ...item, average: avg };
                });

                setChartData(processedData);
                setSemesters(data.semesters || []);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat grafik nilai');
            } finally {
                setLoadingChart(false);
            }
        };
        loadChartData();
    }, [selectedStudentId]);

    const activeStudentName = useMemo(() => {
        return students.find(s => s.peserta_didik_id === selectedStudentId)?.nm_siswa || '';
    }, [students, selectedStudentId]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="per-siswa" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-black tracking-tight text-[#1e3a8a]">Monitoring Grafik Nilai Rapor</h1>
                        <p className="text-[13px] text-slate-500 font-medium max-w-2xl">
                            Pantau tren grafik nilai siswa lintas semester dari seluruh kelas melalui dua mode analisis.
                        </p>
                    </div>

                    <TabsList className="flex w-fit bg-slate-100/50 p-1 border border-slate-200 rounded-lg shrink-0">
                        <TabsTrigger 
                            value="per-siswa" 
                            className="data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white data-[state=inactive]:text-slate-500 font-bold uppercase text-[11px] h-8 px-4 rounded-md transition-all flex items-center gap-2"
                        >
                            <User className="h-3.5 w-3.5" /> Per Siswa
                        </TabsTrigger>
                        <TabsTrigger 
                            value="per-mapel" 
                            className="data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white data-[state=inactive]:text-slate-500 font-bold uppercase text-[11px] h-8 px-4 rounded-md transition-all flex items-center gap-2"
                        >
                            <Users className="h-3.5 w-3.5" /> Per Mata Pelajaran
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="per-siswa" className="space-y-6 mt-6">
                    <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                        <CardContent className="py-3 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="class-select" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                                        <Users className="h-3 w-3 text-[#1e3a8a]" /> Pilih Rombongan Belajar
                                    </Label>
                                    <Select
                                        value={selectedClassId}
                                        onValueChange={setSelectedClassId}
                                    >
                                        <SelectTrigger id="class-select" className="h-8 bg-slate-50 border-blue-100 font-bold text-sm text-[#1e3a8a]">
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

                                <div className="space-y-1.5">
                                    <Label htmlFor="student-select" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                                        <User className="h-3 w-3 text-[#1e3a8a]" /> Pilih Peserta Didik
                                    </Label>
                                    <Select
                                        value={selectedStudentId}
                                        onValueChange={setSelectedStudentId}
                                        disabled={loadingStudents}
                                    >
                                        <SelectTrigger id="student-select" className="h-8 bg-slate-50 border-blue-100 font-bold text-sm text-[#1e3a8a]">
                                            <SelectValue placeholder={loadingStudents ? "Memuat siswa..." : "Pilih siswa..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map((student) => (
                                                <SelectItem key={student.peserta_didik_id} value={student.peserta_didik_id} className="text-xs font-medium">
                                                    {student.nm_siswa} {student.nisn ? `(${student.nisn})` : ''}
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
                        <CardHeader className="bg-[#f8fafc] border-b pb-4">
                            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <LucideLineChart className="h-4 w-4 text-blue-600" /> Riwayat Nilai Rapor {activeStudentName}
                            </CardTitle>
                            <CardDescription>
                                Perbandingan nilai pengetahuan tiap mata pelajaran lintas semester
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-4 px-2 md:px-6">
                            {loadingChart ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                                    <Skeleton className="h-full w-full" />
                                </div>
                            ) : chartData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200">
                                    <p>Tidak ada data nilai untuk siswa ini</p>
                                </div>
                            ) : (
                                <div className="h-[450px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={chartData}
                                            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis 
                                                dataKey="subject" 
                                                tick={{ fontSize: 10, fontWeight: 600 }} 
                                                interval={0}
                                                axisLine={{ stroke: '#cbd5e1' }}
                                            />
                                            <YAxis 
                                                domain={[0, 100]} 
                                                ticks={[0, 20, 40, 60, 80, 100]}
                                                tick={{ fontSize: 12 }}
                                                label={{ value: 'Capaian Nilai', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 600 }}
                                                axisLine={{ stroke: '#cbd5e1' }}
                                            />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    borderRadius: '8px', 
                                                    border: 'none', 
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    fontSize: '12px'
                                                }}
                                                cursor={{ fill: '#f1f5f9' }}
                                            />
                                            <Legend 
                                                verticalAlign="bottom" 
                                                height={36} 
                                                iconType="circle"
                                                wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600 }}
                                            />
                                            
                                            {semesters.map((sem, index) => (
                                                <Bar 
                                                    key={sem.id}
                                                    dataKey={sem.id} 
                                                    name={sem.name.replace('Semester ', 'Smt ')} 
                                                    fill={COLORS[index % COLORS.length]} 
                                                    radius={[4, 4, 0, 0]}
                                                    barSize={20}
                                                />
                                            ))}

                                            <Line 
                                                type="monotone" 
                                                dataKey="average" 
                                                name="Rata-Rata"
                                                stroke="#7f1d1d" 
                                                strokeWidth={3} 
                                                dot={{ fill: '#7f1d1d', r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-sm shadow-md border-none overflow-hidden mt-4">
                        <CardHeader className="bg-slate-50 border-b py-3 px-4">
                            <CardTitle className="text-sm font-bold text-[#1e3a8a] flex items-center gap-2">
                                <LucideLineChart className="h-4 w-4" /> Tabel Statistik Nilai Rapor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto p-4">
                                <Table className="border rounded-md">
                                    <TableHeader className="bg-[#1e3a8a]">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="text-white font-bold w-[40px] border-r border-white/10 text-center py-1 text-[10px] uppercase font-black" rowSpan={2}>No</TableHead>
                                            <TableHead className="text-white font-bold border-r border-white/10 py-1 text-[10px] uppercase font-black" rowSpan={2}>Mata Pelajaran</TableHead>
                                            <TableHead className="text-white font-bold p-0 text-center border-b border-white/10 h-10" colSpan={semesters.length + 2}>
                                                <div className="py-1 uppercase text-[9px] font-black">Statistik Nilai Per Semester</div>
                                            </TableHead>
                                        </TableRow>
                                        <TableRow className="hover:bg-transparent border-none bg-[#1e3a8a]">
                                            {semesters.map((sem) => (
                                                <TableHead key={sem.id} className="text-white font-bold border-r border-white/10 text-center text-[9px] uppercase py-1">
                                                    {sem.name.replace('Semester ', 'Smt. ')}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-white font-bold border-r border-white/10 text-center text-[9px] uppercase py-1">Rata-Rata</TableHead>
                                            <TableHead className="text-white font-bold text-center text-[9px] uppercase py-1">Tren</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingChart ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={semesters.length + 4}><Skeleton className="h-8 w-full" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : chartData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={semesters.length + 4} className="h-32 text-center text-muted-foreground">
                                                    Tidak ada data untuk ditampilkan
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            chartData.map((item, index) => (
                                                <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                    <TableCell className="text-center font-bold text-[#1e3a8a] border-r border-gray-100 py-1.5 text-xs">{index + 1}</TableCell>
                                                    <TableCell className="font-bold text-[#1e3a8a] border-r border-gray-100 py-1.5 text-xs leading-tight">{item.fullName || item.subject}</TableCell>
                                                    {semesters.map((sem) => (
                                                        <TableCell key={sem.id} className="text-center border-r border-gray-100 py-1.5 text-[11px] font-medium">
                                                            {item[sem.id] !== undefined ? (
                                                                <span className={item[sem.id] < 75 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                                                                    {Number(item[sem.id]).toFixed(1)}
                                                                </span>
                                                            ) : '-'}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-center font-black text-[#1e3a8a] bg-blue-50/30 py-1.5 text-[11px] border-r">
                                                        {item.average > 0 ? Number(item.average).toFixed(1) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center py-1.5 text-[11px]">
                                                        {(() => {
                                                            if (semesters.length < 2) return <span className="text-slate-300">-</span>;
                                                            
                                                            const lastSemId = semesters[semesters.length - 1].id;
                                                            const prevSemId = semesters[semesters.length - 2].id;
                                                            
                                                            const lastVal = item[lastSemId];
                                                            const prevVal = item[prevSemId];
                                                            
                                                            if (lastVal === undefined || prevVal === undefined) return <span className="text-slate-300">-</span>;
                                                            
                                                            const diff = lastVal - prevVal;
                                                            
                                                            if (diff > 0) return (
                                                                <div className="flex items-center justify-center gap-0.5 text-emerald-600 font-bold">
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                    <span>+{diff.toFixed(1)}</span>
                                                                </div>
                                                            );
                                                            if (diff < 0) return (
                                                                <div className="flex items-center justify-center gap-0.5 text-red-600 font-bold">
                                                                    <ArrowDownRight className="h-3 w-3" />
                                                                    <span>{diff.toFixed(1)}</span>
                                                                </div>
                                                            );
                                                            return <Minus className="h-3 w-3 mx-auto text-slate-300" />;
                                                        })()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="per-mapel" className="space-y-6 mt-6">
                    <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                        <CardContent className="py-3 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="class-select-mapel" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                                        <Users className="h-3 w-3 text-[#1e3a8a]" /> Pilih Rombongan Belajar
                                    </Label>
                                    <Select
                                        value={selectedClassId}
                                        onValueChange={setSelectedClassId}
                                    >
                                        <SelectTrigger id="class-select-mapel" className="h-8 bg-slate-50 border-blue-100 font-bold text-sm text-[#1e3a8a]">
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

                                <div className="space-y-1.5">
                                    <Label htmlFor="subject-select" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                                        <BookOpen className="h-3.5 w-3.5 text-[#1e3a8a]" /> Pilih Mata Pelajaran
                                    </Label>
                                    <Select
                                        value={selectedSubjectId}
                                        onValueChange={setSelectedSubjectId}
                                        disabled={loadingStudents}
                                    >
                                        <SelectTrigger id="subject-select" className="h-8 bg-slate-50 border-blue-100 font-bold text-sm text-[#1e3a8a]">
                                            <SelectValue placeholder={loadingStudents ? "Memuat mapel..." : "Pilih mapel..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((sub) => (
                                                <SelectItem key={sub.mata_pelajaran_id} value={sub.mata_pelajaran_id} className="text-xs font-medium">
                                                    {sub.nm_mapel}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card 
                            className={cn(
                                "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                                mapelFilter === 'all' ? "bg-slate-800 text-white ring-2 ring-slate-800 ring-offset-2" : "bg-slate-50 border-l-4 border-l-slate-400"
                            )}
                            onClick={() => setMapelFilter('all')}
                        >
                            <CardContent className="pt-4 px-4 pb-4">
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", mapelFilter === 'all' ? "text-slate-300" : "text-slate-500")}>Total Siswa</p>
                                <p className="text-2xl font-black">{analysisMapel.length}</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={cn(
                                "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                                mapelFilter === 'down' ? "bg-red-600 text-white ring-2 ring-red-600 ring-offset-2" : "bg-red-50 border-l-4 border-l-red-500"
                            )}
                            onClick={() => setMapelFilter('down')}
                        >
                            <CardContent className="pt-4 px-4 pb-4">
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", mapelFilter === 'down' ? "text-red-100" : "text-red-600")}>Siswa Menurun</p>
                                <p className="text-2xl font-black">{analysisMapel.filter(s => s.delta !== null && s.delta < 0).length}</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={cn(
                                "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                                mapelFilter === 'up' ? "bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2" : "bg-emerald-50 border-l-4 border-l-emerald-500"
                            )}
                            onClick={() => setMapelFilter('up')}
                        >
                            <CardContent className="pt-4 px-4 pb-4">
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", mapelFilter === 'up' ? "text-emerald-100" : "text-emerald-600")}>Siswa Meningkat</p>
                                <p className="text-2xl font-black">{analysisMapel.filter(s => s.delta !== null && s.delta > 0).length}</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={cn(
                                "border-none shadow-sm transition-all cursor-pointer hover:shadow-md",
                                mapelFilter === 'stable' ? "bg-[#1e3a8a] text-white ring-2 ring-[#1e3a8a] ring-offset-2" : "bg-blue-50 border-l-4 border-l-blue-500"
                            )}
                            onClick={() => setMapelFilter('stable')}
                        >
                            <CardContent className="pt-4 px-4 pb-4">
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", mapelFilter === 'stable' ? "text-blue-100" : "text-blue-600")}>Siswa Stabil</p>
                                <p className="text-2xl font-black">{analysisMapel.filter(s => s.delta === 0).length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-sm shadow-md border-none overflow-hidden bg-white">
                        <CardHeader className="bg-[#1e3a8a] text-white py-4">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 font-black">
                                <BarChart3 className="h-4 w-4" />
                                <div className="flex flex-col">
                                    <span>Detil Perkembangan Per Siswa: {subjects.find(s => s.mata_pelajaran_id === selectedSubjectId)?.nm_mapel || ''}</span>
                                    {analysisTeacher && (
                                        <span className="text-[10px] font-medium opacity-80 mt-0.5 capitalize">Guru: {analysisTeacher.toLowerCase()}</span>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto p-4">
                                <Table className="border rounded-md">
                                    <TableHeader className="bg-[#1e3a8a]">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="w-[50px] text-center font-bold text-white text-[10px] uppercase py-1.5 h-10 border-r border-white/10 font-black">No</TableHead>
                                            <TableHead className="font-bold text-white text-[10px] uppercase py-1.5 h-10 border-r border-white/10 font-black">Nama Siswa</TableHead>
                                            <TableHead className="text-center font-bold text-white text-[10px] uppercase py-1.5 h-10 border-r border-white/10 font-black">
                                                {analysisSemesters?.previous?.name || 'Semester Lalu'}
                                            </TableHead>
                                            <TableHead className="text-center font-bold text-white text-[10px] uppercase py-1.5 h-10 border-r border-white/10 font-black">
                                                {analysisSemesters?.current?.name || 'Semester Sekarang'}
                                            </TableHead>
                                            <TableHead className="text-center font-bold text-white text-[10px] uppercase py-1.5 h-10 border-r border-white/10 font-black">Selisih</TableHead>
                                            <TableHead className="text-center font-bold text-white text-[10px] uppercase py-1.5 h-10 font-black w-[120px]">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingMapel ? (
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
                                        ) : (
                                            (() => {
                                                const filteredData = analysisMapel.filter(item => {
                                                    if (mapelFilter === 'all') return true;
                                                    if (mapelFilter === 'down') return item.delta !== null && item.delta < 0;
                                                    if (mapelFilter === 'up') return item.delta !== null && item.delta > 0;
                                                    if (mapelFilter === 'stable') return item.delta === 0;
                                                    return true;
                                                });

                                                if (filteredData.length === 0) {
                                                    return (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="h-40 text-center text-slate-400 italic font-medium">
                                                                Pilih mata pelajaran atau sesuaikan filter untuk melihat analisis.
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }

                                                return filteredData.map((item, index) => (
                                                    <TableRow key={item.peserta_didik_id} className="hover:bg-slate-50 transition-colors border-b-slate-100">
                                                        <TableCell className="text-center font-bold text-slate-400 py-1.5 text-[10px]">{index + 1}</TableCell>
                                                        <TableCell className="font-bold text-[#1e3a8a] py-1.5 text-[11px]">{item.nm_siswa}</TableCell>
                                                        <TableCell className="text-center font-medium text-slate-500 py-1.5 text-[11px]">{item.nilai_prev ?? '-'}</TableCell>
                                                        <TableCell className="text-center font-bold text-slate-700 py-1.5 text-[11px]">{item.nilai_cur ?? '-'}</TableCell>
                                                        <TableCell className={cn(
                                                            "text-center font-black py-1.5 text-[11px]",
                                                            item.delta === null ? "text-slate-300" :
                                                            item.delta < 0 ? "text-red-600" : 
                                                            item.delta > 0 ? "text-emerald-600" : "text-slate-400"
                                                        )}>
                                                            {item.delta !== null ? (item.delta > 0 ? `+${item.delta}` : item.delta) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center py-1.5">
                                                            {item.delta === null ? (
                                                                <Badge variant="outline" className="text-slate-400 opacity-50 text-[9px] h-5 px-1.5">N/A</Badge>
                                                            ) : item.delta < 0 ? (
                                                                <Badge className="bg-red-100 text-red-700 border-red-200 shadow-none gap-1 font-bold text-[9px] h-5 px-1.5">
                                                                    <ArrowDownRight className="h-2.5 w-2.5" /> Turun
                                                                </Badge>
                                                            ) : item.delta > 0 ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none gap-1 font-bold text-[9px] h-5 px-1.5">
                                                                    <ArrowUpRight className="h-2.5 w-2.5" /> Naik
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-blue-500 font-bold border-blue-200 text-[9px] h-5 px-1.5">Stabil</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ));
                                            })()
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center gap-2 text-xs text-slate-500 italic p-4 bg-slate-50 rounded-md border border-slate-100 mt-4">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span>
                            Gunakan mode Analisis Per Mata Pelajaran untuk memantau performa mengajar dan mengidentifikasi siswa yang butuh bimbingan khusus.
                        </span>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
