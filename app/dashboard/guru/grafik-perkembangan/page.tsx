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
import { TrendingUp, User, Users } from 'lucide-react';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
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
    const [chartData, setChartData] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [loadingChart, setLoadingChart] = useState(false);
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
                if (data.students?.length > 0) {
                    setSelectedStudentId(data.students[0].peserta_didik_id);
                } else {
                    setSelectedStudentId('');
                    setChartData([]);
                }
            } catch (err: any) {
                setError(err.message || 'Gagal memuat data siswa');
            } finally {
                setLoadingStudents(false);
            }
        };
        loadStudents();
    }, [selectedClassId]);

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
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    <h1 className="text-2xl font-bold tracking-tight text-[#1e3a8a] uppercase">
                        Grafik Perkembangan Rerata Nilai Rapor Siswa
                    </h1>
                </div>
                <p className="text-muted-foreground text-sm">
                    Visualisasi perolehan nilai siswa dari semester ke semester.
                </p>
            </div>

            <Card className="rounded-sm shadow-sm border-none bg-gradient-to-r from-blue-50/50 to-white">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="class-select" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Users className="h-3 w-3" /> Pilih Kelas
                            </Label>
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                            >
                                <SelectTrigger id="class-select" className="bg-white border-blue-200">
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

                        <div className="space-y-2">
                            <Label htmlFor="student-select" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <User className="h-3 w-3" /> Pilih Siswa
                            </Label>
                            <Select
                                value={selectedStudentId}
                                onValueChange={setSelectedStudentId}
                                disabled={loadingStudents}
                            >
                                <SelectTrigger id="student-select" className="bg-white border-blue-200">
                                    <SelectValue placeholder={loadingStudents ? "Memuat siswa..." : "Pilih siswa..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((student) => (
                                        <SelectItem key={student.peserta_didik_id} value={student.peserta_didik_id}>
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
                        Riwayat Nilai Rapor {activeStudentName}
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
                                    margin={{
                                        top: 20,
                                        right: 20,
                                        bottom: 20,
                                        left: 0,
                                    }}
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
                                    
                                    {/* Bars for each semester */}
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

                                    {/* Line for Average */}
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

            <Card className="rounded-sm shadow-md border-none overflow-hidden mt-6">
                <CardHeader className="bg-[#f8fafc] border-b pb-4">
                    <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        Tabel Statistik Nilai Rapor {activeStudentName}
                    </CardTitle>
                    <CardDescription>
                        Rincian nilai pengetahuan tiap mata pelajaran lintas semester
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#5c7c9c]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-white font-bold w-[60px] border-r border-blue-400/30 text-center" rowSpan={2}>No</TableHead>
                                    <TableHead className="text-white font-bold border-r border-blue-400/30" rowSpan={2}>Nama Mapel</TableHead>
                                    <TableHead className="text-white font-bold p-0 text-center border-b border-blue-400/30" colSpan={semesters.length + 1}>
                                        <div className="py-2">Statistik Nilai Rapor</div>
                                    </TableHead>
                                </TableRow>
                                <TableRow className="hover:bg-transparent border-none bg-[#5c7c9c]">
                                    {semesters.map((sem) => (
                                        <TableHead key={sem.id} className="text-white font-bold border-r border-blue-400/30 text-center text-xs">
                                            {sem.name.replace('Semester ', 'Smt. ')}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-white font-bold text-center text-xs">Rata-Rata</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingChart ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={semesters.length + 3}><Skeleton className="h-8 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : chartData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={semesters.length + 3} className="h-32 text-center text-muted-foreground">
                                            Tidak ada data untuk ditampilkan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    chartData.map((item, index) => (
                                        <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                            <TableCell className="text-center font-medium border-r border-gray-100">{index + 1}</TableCell>
                                            <TableCell className="font-medium text-gray-700 border-r border-gray-100">{item.fullName || item.subject}</TableCell>
                                            {semesters.map((sem) => (
                                                <TableCell key={sem.id} className="text-center border-r border-gray-100 text-sm">
                                                    {item[sem.id] !== undefined ? Number(item[sem.id]).toFixed(2) : '-'}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-bold text-blue-700 bg-blue-50/30">
                                                {item.average > 0 ? Number(item.average).toFixed(2) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
