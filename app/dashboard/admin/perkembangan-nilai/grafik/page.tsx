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
import { TrendingUp, User, Users, LineChart as LucideLineChart } from 'lucide-react';

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

export default function AdminGrafikPerkembanganPage() {
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

    // Load classes list for Admin
    useEffect(() => {
        const loadClasses = async () => {
            try {
                const res = await fetch('/api/admin/perkembangan-nilai');
                const data = await res.json();
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

    // Load students when class changes
    useEffect(() => {
        const loadStudents = async () => {
            if (!selectedClassId) return;
            setLoadingStudents(true);
            try {
                const res = await fetch(`/api/admin/perkembangan-nilai?rombongan_belajar_id=${selectedClassId}`);
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
                const res = await fetch(`/api/admin/perkembangan-nilai?peserta_didik_id=${selectedStudentId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                // Add average calculation
                const processedData = (data.chartData || []).map((item: any) => {
                    const values = (data.semesters || [])
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
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                    <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
                        Monitoring Grafik Nilai Rapor
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] ml-3 italic">
                    Pantau tren grafik nilai siswa lintas semester dari seluruh kelas.
                </p>
            </div>

            <Card className="rounded-sm shadow-sm border border-blue-100 bg-white">
                <CardContent className="py-3 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="class-select" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 pl-1">
                                <Layers className="h-3 w-3 text-[#1e3a8a]" /> Pilih Rombongan Belajar
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
                <CardHeader className="bg-slate-50 border-b py-3 px-4">
                    <CardTitle className="text-sm font-bold text-[#1e3a8a] flex items-center gap-2">
                        <LucideLineChart className="h-4 w-4" /> Riwayat Capaian: {activeStudentName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-2 px-2 md:px-4">
                    {loadingChart ? (
                        <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                            <Skeleton className="h-full w-full" />
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200">
                            <img src="/erap-icon.png" alt="No data" className="h-16 w-16 opacity-20 mb-4 grayscale" />
                            <p className="font-bold">Data nilai belum tersedia untuk siswa ini</p>
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
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                                        interval={0}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        ticks={[0, 20, 40, 60, 80, 100]}
                                        tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                                        label={{ value: 'Nilai Rapor', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 700, fill: '#1e3a8a' }}
                                        axisLine={{ stroke: '#cbd5e1' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '12px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                        cursor={{ fill: '#f1f5f9' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 700 }}
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
                                        stroke="#1e3a8a" 
                                        strokeWidth={4} 
                                        dot={{ fill: '#1e3a8a', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
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
                        Tabel Statistik Nilai Rapor
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 px-4 pb-4">
                    <div className="overflow-x-auto mt-4">
                        <Table className="border rounded-md">
                            <TableHeader className="bg-[#1e3a8a]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-white font-bold w-[40px] border-r border-white/10 text-center py-1 text-[10px] uppercase" rowSpan={2}>No</TableHead>
                                    <TableHead className="text-white font-bold border-r border-white/10 py-1 text-[10px] uppercase" rowSpan={2}>Mata Pelajaran</TableHead>
                                    <TableHead className="text-white font-bold p-0 text-center border-b border-white/10" colSpan={semesters.length + 1}>
                                        <div className="py-1 uppercase text-[9px] font-black">Statistik Nilai Per Semester</div>
                                    </TableHead>
                                </TableRow>
                                <TableRow className="hover:bg-transparent border-none bg-[#1e3a8a]">
                                    {semesters.map((sem) => (
                                        <TableHead key={sem.id} className="text-white font-bold border-r border-white/10 text-center text-[9px] uppercase py-1">
                                            {sem.name.replace('Semester ', 'Smt. ')}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-white font-bold text-center text-[9px] uppercase py-1">Rata-Rata</TableHead>
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
                                        <TableCell colSpan={semesters.length + 3} className="h-32 text-center text-muted-foreground font-medium">
                                            Belum ada data nilai yang diinputkan
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
                                            <TableCell className="text-center font-black text-[#1e3a8a] bg-blue-50/30 py-1.5 text-[11px]">
                                                {item.average > 0 ? Number(item.average).toFixed(1) : '-'}
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

// Custom icons missed in standard imports
function Layers(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m2.6 11.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9" />
      <path d="m2.6 15.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9" />
    </svg>
  )
}
