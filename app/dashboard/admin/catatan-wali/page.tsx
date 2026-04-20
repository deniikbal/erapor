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
import { FileText, Search, User, ClipboardList, CheckCircle2, AlertCircle, LayoutDashboard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ClassInfo {
    rombongan_belajar_id: string;
    nm_kelas: string;
    tingkat_pendidikan_id: string;
}

interface StudentNote {
    peserta_didik_id: string;
    nm_siswa: string;
    nis: string;
    nisn: string;
    catatan: string | null;
    has_note: boolean;
}

export default function AdminCatatanWaliMonitoringPage() {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [students, setStudents] = useState<StudentNote[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadClasses = async () => {
            try {
                // Admin fetch without ptk_id to get all classes
                const response = await fetch(`/api/guru/catatan-wali`);
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

    const fetchNotesData = useCallback(async (classId: string) => {
        if (!classId) return;

        setLoadingData(true);
        try {
            const response = await fetch(
                `/api/guru/catatan-wali?rombongan_belajar_id=${classId}`
            );
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setStudents(data.students || []);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data catatan');
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchNotesData(selectedClassId);
        }
    }, [selectedClassId, fetchNotesData]);

    const filteredStudents = students.filter(s => 
        s.nm_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.includes(searchTerm)
    );

    const stats = {
        total: students.length,
        filled: students.filter(s => s.has_note).length,
        empty: students.filter(s => !s.has_note).length
    };

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
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-[#1e3a8a]" />
                    <h1 className="text-xl font-black tracking-tight text-[#1e3a8a] uppercase">
                        Monitoring Catatan Wali (Admin)
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] italic ml-7">
                    Pantau kelengkapan penginputan catatan wali murid seluruh kelas.
                </p>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-sm border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Total Siswa di Kelas</p>
                            <p className="text-2xl font-black text-slate-700">{stats.total}</p>
                        </div>
                        <User className="h-8 w-8 text-blue-100" />
                    </CardContent>
                </Card>
                <Card className="rounded-sm border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Sudah Terisi</p>
                            <p className="text-2xl font-black text-emerald-600">{stats.filled}</p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-100" />
                    </CardContent>
                </Card>
                <Card className="rounded-sm border-l-4 border-l-rose-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500">Belum Terisi</p>
                            <p className="text-2xl font-black text-rose-600">{stats.empty}</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-rose-100" />
                    </CardContent>
                </Card>
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
                        <div className="flex-1 md:ml-auto max-w-xs relative">
                            <Input
                                placeholder="Cari nama atau NIS..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-8 text-xs border-blue-100 focus-visible:ring-blue-400"
                            />
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 h-10 w-[200px]">Nama Siswa</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10 w-[100px]">NIS</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase border-r border-white/10 text-center h-10 w-[120px]">Status</TableHead>
                                <TableHead className="text-white font-bold text-[10px] uppercase h-10">Isi Catatan Wali Kelas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingData ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                                        {selectedClassId ? 'Data siswa tidak ditemukan' : 'Silakan pilih kelas terlebih dahulu'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <TableRow key={student.peserta_didik_id} className="hover:bg-blue-50/30 transition-colors border-b-slate-100 min-h-12">
                                        <TableCell className="text-center font-bold text-slate-400 text-[10px] border-r py-2">{index + 1}</TableCell>
                                        <TableCell className="font-bold text-[#1e3a8a] text-[11px] border-r py-2">{student.nm_siswa}</TableCell>
                                        <TableCell className="text-center border-r py-2 font-medium text-slate-600 text-[11px]">{student.nis}</TableCell>
                                        <TableCell className="text-center border-r py-2">
                                            {student.has_note ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 text-[10px] px-2 py-0 h-5 font-bold uppercase">
                                                    Terisi
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 text-[10px] px-2 py-0 h-5 font-bold uppercase">
                                                    Kosong
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 px-4">
                                            <div className="text-[11px] text-slate-600 leading-relaxed italic">
                                                {student.has_note ? (
                                                    <span className="not-italic font-medium text-slate-700">{student.catatan}</span>
                                                ) : (
                                                    <span className="text-slate-400 opacity-60">Belum ada catatan untuk siswa ini...</span>
                                                )}
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
