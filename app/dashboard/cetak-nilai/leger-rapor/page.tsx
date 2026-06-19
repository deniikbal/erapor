'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { FileSpreadsheet, Download, Check, ChevronsUpDown, Users, BookOpen, Trophy, BarChart3, Loader2, FileOutput, Info, Rocket, LayoutDashboard } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-client';
import type { User, Kelas } from '@/lib/db';
import ExcelJS from 'exceljs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    fetchAllSemesters,
    fetchSekolahData,
    buildAllSemesterLegerWorkbook,
    triggerExcelDownload,
    safeFilename,
    type AllSemesterBlock,
} from '@/lib/leger-excel';

interface LegerSummary {
    totalStudents: number;
    totalSubjects: number;
    topStudents: { name: string; sum: number; rank: number; avg: string }[];
    classAvg: string;
    isLoading: boolean;
    hasData: boolean;
}

// Helper to get Excel column letter from index (0 = A, 1 = B, etc.)
function getExcelCol(index: number): string {
    let col = '';
    let n = index;
    while (n >= 0) {
        col = String.fromCharCode(65 + (n % 26)) + col;
        n = Math.floor(n / 26) - 1;
    }
    return col;
}

export default function LegerRaporPage() {
    const [user, setUser] = useState<User | null>(null);
    const [kelasData, setKelasData] = useState<{ kelas: Kelas[] }>({ kelas: [] });
    const [selectedKelas, setSelectedKelas] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isGeneratingAllSemester, setIsGeneratingAllSemester] = useState(false);
    const [allSemesterProgress, setAllSemesterProgress] = useState({ current: 0, total: 0, currentSemester: '' });
    const [summary, setSummary] = useState<LegerSummary>({
        totalStudents: 0,
        totalSubjects: 0,
        topStudents: [],
        classAvg: '0',
        isLoading: false,
        hasData: false
    });

    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        };
        loadUser();
    }, []);

    useEffect(() => {
        const fetchKelas = async () => {
            try {
                const res = await fetch('/api/kelas');
                const data = await res.json();
                setKelasData(data);
            } catch (error) {
                console.error('Error fetching kelas:', error);
                toast.error('Gagal mengambil data kelas');
            }
        };

        if (user) {
            fetchKelas();
        }
    }, [user]);

    // Handle Summary Preview
    useEffect(() => {
        const fetchSummary = async () => {
            const kelasInfo = kelasData.kelas.find(k => k.nm_kelas === selectedKelas);
            if (!kelasInfo) {
                setSummary(prev => ({ ...prev, hasData: false }));
                return;
            }

            setSummary(prev => ({ ...prev, isLoading: true, hasData: false }));
            try {
                const res = await fetch(`/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}`);
                if (!res.ok) throw new Error('Gagal memuat pratinjau');
                
                const data = await res.json();
                const students = data.students || [];
                const subjects = data.subjects || [];
                const gradeMap = data.grades || {};

                // Calculate Stats
                let totalSum = 0;
                let totalGradesCount = 0;
                const studentSums: { name: string; sum: number; avg: number }[] = [];

                students.forEach((s: any) => {
                    let sSum = 0;
                    let sCount = 0;
                    subjects.forEach((sub: any) => {
                        const g = gradeMap[s.peserta_didik_id]?.[sub.mata_pelajaran_id];
                        if (g !== undefined) {
                            sSum += Number(g);
                            sCount++;
                        }
                    });
                    const sAvg = sCount > 0 ? sSum / sCount : 0;
                    studentSums.push({ name: s.nm_siswa, sum: sSum, avg: sAvg });
                    totalSum += sSum;
                    totalGradesCount += 1;
                });

                // Top 3
                const top3 = [...studentSums]
                    .sort((a, b) => b.sum - a.sum)
                    .slice(0, 3)
                    .map((s, i) => ({ 
                        name: s.name, 
                        sum: s.sum, 
                        rank: i + 1, 
                        avg: s.avg.toFixed(2) 
                    }));

                setSummary({
                    totalStudents: students.length,
                    totalSubjects: subjects.length,
                    topStudents: top3,
                    classAvg: totalGradesCount > 0 ? (totalSum / (totalGradesCount * (subjects.length || 1))).toFixed(2) : '0',
                    isLoading: false,
                    hasData: true
                });
            } catch (error) {
                console.error('Preview error:', error);
                setSummary(prev => ({ ...prev, isLoading: false, hasData: false }));
            }
        };

        if (selectedKelas) {
            fetchSummary();
        }
    }, [selectedKelas, kelasData.kelas]);

    const handleGenerateExcel = async () => {
        if (!selectedKelas) {
            toast.error('Pilih kelas terlebih dahulu');
            return;
        }

        setIsGenerating(true);

        try {
            // Find selected class info first to get rombongan_belajar_id
            const kelasInfo = kelasData.kelas.find(k => k.nm_kelas === selectedKelas);

            if (!kelasInfo) {
                toast.error('Data kelas tidak ditemukan');
                setIsGenerating(false);
                return;
            }

            // Fetch semester & sekolah data in parallel
            const [semesterRes, sekolahRes] = await Promise.all([
                fetch('/api/semester'),
                fetch('/api/sekolah')
            ]);

            const semesterData = await semesterRes.json();
            const sekolahData = await sekolahRes.json();

            // Fetch BULK Leger Data (Single Request)
            console.log('Fetching bulk leger data for rombel:', kelasInfo.rombongan_belajar_id);
            const legerRes = await fetch(`/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}`);

            if (!legerRes.ok) {
                throw new Error('Gagal mengambil data leger');
            }

            const legerData = await legerRes.json();

            const students = legerData.students || [];
            const allSubjects = legerData.subjects || [];
            const gradeMap = legerData.grades || {};
            const ekskulList = legerData.ekskul || [];
            const ekskulValues = legerData.ekskulValues || {};

            console.log(`Loaded ${students.length} students, ${allSubjects.length} subjects, ${ekskulList.length} ekskul`);

            if (students.length === 0) {
                toast.warning(`Tidak ada data siswa untuk kelas ${selectedKelas}`);
            } else if (allSubjects.length === 0) {
                toast.warning('Tidak ada data mata pelajaran yang memiliki nilai untuk kelas ini');
            }

            // Calculate Statistics (Sum, Avg, Rank)
            const studentStats: Record<string, { sum: number, avg: number, rank: number }> = {};
            const studentSums: { id: string, sum: number }[] = [];

            students.forEach((siswa: any) => {
                let sum = 0;
                let count = 0;

                allSubjects.forEach((subject: any) => {
                    const grade = gradeMap[siswa.peserta_didik_id]?.[subject.mata_pelajaran_id];
                    if (grade !== undefined) {
                        sum += Number(grade);
                        count++;
                    }
                });

                const avg = count > 0 ? sum / count : 0;
                studentStats[siswa.peserta_didik_id] = { sum, avg, rank: 0 };
                studentSums.push({ id: siswa.peserta_didik_id, sum });
            });

            // Calculate Rank (Sort by Sum Descending, handle ties)
            studentSums.sort((a, b) => b.sum - a.sum);

            let currentRank = 0;
            let previousSum: number | null = null;

            studentSums.forEach((item, index) => {
                // If score is different from previous, increment rank
                if (item.sum !== previousSum) {
                    currentRank++;
                    previousSum = item.sum;
                }
                // Otherwise keep the same rank (tied)

                if (studentStats[item.id]) {
                    studentStats[item.id].rank = currentRank;
                }
            });

            // Create workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Leger Nilai');

            // Set column widths - dynamic based on subjects and ekskul
            const columnConfig = [
                { width: 5 },   // NO
                { width: 30 },  // NAMA SISWA
                { width: 12 },  // NISN
                { width: 12 },  // NIS
                ...allSubjects.map(() => ({ width: 7 })), // Subject columns (approx 80px)
                { width: 10 }, // JUMLAH
                { width: 10 }, // RATA-RATA
                { width: 10 }, // RANGKING
                { width: 7 }, // Sakit
                { width: 7 }, // Izin
                { width: 7 },  // Alpa
                ...ekskulList.map(() => ({ width: 8 })) // Ekskul columns
            ];
            worksheet.columns = columnConfig;

            // ROW 1: Title
            const semesterText = semesterData.data?.[0]?.nama_semester || semesterData.semester?.nama_semester || '2025/2026';

            // Calculate last column letter (A=0, D=3, + subjects + 3 (stats) + 3 (attendance) + ekskul)
            const totalCols = 4 + allSubjects.length + 3 + 3 + ekskulList.length;
            const lastColChar = getExcelCol(totalCols - 1);

            worksheet.getCell('A1').value = `LEGER NILAI RAPOR SISWA TAHUN PELAJARAN ${semesterText.toUpperCase()}`;
            worksheet.getCell('A1').font = { bold: true, size: 14 };
            worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.mergeCells(`A1:${lastColChar}1`);

            // ROW 2: School
            worksheet.getCell('A2').value = 'SEKOLAH';
            worksheet.getCell('A2').font = { bold: true };
            worksheet.getCell('C2').value = `: ${sekolahData.sekolah?.nama || '-'}`;

            // ROW 3: Class
            worksheet.getCell('A3').value = 'KELAS';
            worksheet.getCell('A3').font = { bold: true };
            worksheet.getCell('C3').value = `: ${kelasInfo?.nm_kelas || selectedKelas}`;

            // ROWS 4-7: Headers (merged)
            const headers = ['NO', 'NAMA SISWA', 'NISN', 'NIS'];

            // Merge rows 4-7 for each header column
            worksheet.mergeCells('A4:A7');
            worksheet.mergeCells('B4:B7');
            worksheet.mergeCells('C4:C7');
            worksheet.mergeCells('D4:D7');

            // Set header values and styling
            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index); // A, B, C, D
                const cell = worksheet.getCell(`${col}4`);
                cell.value = header;
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // ROW 4: Add "MATA PELAJARAN" header (merged across all subject columns)
            if (allSubjects.length > 0) {
                const startCol = 'E';
                const endCol = getExcelCol(4 + allSubjects.length - 1); // E + count - 1
                worksheet.mergeCells(`${startCol}4:${endCol}4`);
                const mataPelajaranCell = worksheet.getCell('E4');
                mataPelajaranCell.value = 'MATA PELAJARAN';
                mataPelajaranCell.font = { bold: true };
                mataPelajaranCell.alignment = { horizontal: 'center', vertical: 'middle' };
                mataPelajaranCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                mataPelajaranCell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // ROWS 5-7: Add subject names (each column merged vertically)
                allSubjects.forEach((subject: any, index: number) => {
                    const colIdx = 4 + index;
                    const col = getExcelCol(colIdx);

                    // Merge rows 5-7 for this subject column
                    worksheet.mergeCells(`${col}5:${col}7`);

                    const cell = worksheet.getCell(`${col}5`);
                    cell.value = subject.nm_ringkas || subject.nm_mapel || subject.nm_lokal || 'Mapel';
                    cell.font = { bold: true, size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF99FFD6' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }

            // ADD SUMMARY COLUMNS (Sum, Avg, Rank)
            const statsStartIdx = 4 + allSubjects.length;
            const statsHeaders = ['JUMLAH', 'RATA-RATA', 'RANGKING'];

            // Row 4: Header Group "WALI KELAS"
            const startStatsCol = getExcelCol(statsStartIdx);
            const endStatsCol = getExcelCol(statsStartIdx + 2);
            worksheet.mergeCells(`${startStatsCol}4:${endStatsCol}4`);
            const statsGroupHeader = worksheet.getCell(`${startStatsCol}4`);
            statsGroupHeader.value = 'WALI KELAS';
            statsGroupHeader.font = { bold: true };
            statsGroupHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            statsGroupHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF99FFD6' }
            };
            statsGroupHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Row 5-7: Sub Headers
            statsHeaders.forEach((header, idx) => {
                const col = getExcelCol(statsStartIdx + idx);
                worksheet.mergeCells(`${col}5:${col}7`);
                const cell = worksheet.getCell(`${col}5`);
                cell.value = header;
                cell.font = { bold: true, size: 9 };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // ADD ATTENDANCE COLUMNS
            const attendanceStartIdx = 4 + allSubjects.length + 3; // +3 for stats
            const startAttCol = getExcelCol(attendanceStartIdx);
            const endAttCol = getExcelCol(attendanceStartIdx + 2); // 3 columns total

            // Merge "KETIDAKHADIRAN" Row 4-6
            worksheet.mergeCells(`${startAttCol}4:${endAttCol}6`);
            const attHeader = worksheet.getCell(`${startAttCol}4`);
            attHeader.value = 'KETIDAKHADIRAN';
            attHeader.font = { bold: true };
            attHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            attHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF99FFD6' }
            };
            attHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Sub-headers Row 7: Sakit, Izin, Alpa
            ['Sakit', 'Izin', 'Alpa'].forEach((label, idx) => {
                const col = getExcelCol(attendanceStartIdx + idx);
                const cell = worksheet.getCell(`${col}7`);
                cell.value = label;
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // ADD EXTRACURRICULAR COLUMNS
            if (ekskulList.length > 0) {
                const ekskulStartIdx = attendanceStartIdx + 3; // After attendance
                const startEkskulCol = getExcelCol(ekskulStartIdx);
                const endEkskulCol = getExcelCol(ekskulStartIdx + ekskulList.length - 1);

                // Merge "EKSTRA KURIKULER" Row 4
                worksheet.mergeCells(`${startEkskulCol}4:${endEkskulCol}4`);
                const ekskulHeader = worksheet.getCell(`${startEkskulCol}4`);
                ekskulHeader.value = 'EKSTRA KURIKULER';
                ekskulHeader.font = { bold: true };
                ekskulHeader.alignment = { horizontal: 'center', vertical: 'middle' };
                ekskulHeader.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                ekskulHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Sub-headers Row 5-7: Ekskul names
                ekskulList.forEach((ekskul: any, idx: number) => {
                    const col = getExcelCol(ekskulStartIdx + idx);
                    worksheet.mergeCells(`${col}5:${col}7`);
                    const cell = worksheet.getCell(`${col}5`);
                    cell.value = ekskul.name;
                    cell.font = { bold: true, size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF99FFD6' }
                    };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            }

            // Add student data starting from row 8
            console.log(`Adding ${students.length} students to Excel`);

            students.forEach((siswa: any, index: number) => {
                const rowNum = 8 + index;
                worksheet.getCell(`A${rowNum}`).value = index + 1;
                worksheet.getCell(`B${rowNum}`).value = siswa.nm_siswa;
                worksheet.getCell(`C${rowNum}`).value = siswa.nisn || '-';
                worksheet.getCell(`D${rowNum}`).value = siswa.nis || '-';

                // Add borders for A-D
                ['A', 'B', 'C', 'D'].forEach(col => {
                    worksheet.getCell(`${col}${rowNum}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });

                // Center align NO, NISN, and NIS columns
                worksheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
                worksheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
                worksheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

                // Add grades for each subject
                allSubjects.forEach((subject: any, subjectIndex: number) => {
                    const col = getExcelCol(4 + subjectIndex);

                    // Use gradeMap for O(1) lookup
                    // Access using student ID and subject ID
                    const grade = gradeMap[siswa.peserta_didik_id]?.[subject.mata_pelajaran_id];

                    const gradeCell = worksheet.getCell(`${col}${rowNum}`);
                    gradeCell.value = grade !== undefined ? grade : '-';
                    gradeCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    gradeCell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });

                // Add Stats Data (Sum, Avg, Rank)
                const stats = studentStats[siswa.peserta_didik_id] || { sum: 0, avg: 0, rank: 0 };

                // Sum
                const sumCol = getExcelCol(statsStartIdx);
                const sumCell = worksheet.getCell(`${sumCol}${rowNum}`);
                sumCell.value = stats.sum;
                sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
                sumCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Avg
                const avgCol = getExcelCol(statsStartIdx + 1);
                const avgCell = worksheet.getCell(`${avgCol}${rowNum}`);
                avgCell.value = stats.avg; // Pass raw number
                avgCell.numFmt = '0.00';   // Set Excel Number Format
                avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
                avgCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Rank
                const rankCol = getExcelCol(statsStartIdx + 2);
                const rankCell = worksheet.getCell(`${rankCol}${rowNum}`);
                rankCell.value = stats.rank;
                rankCell.alignment = { horizontal: 'center', vertical: 'middle' };
                rankCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Add green fill for top 10 ranks
                if (stats.rank >= 1 && stats.rank <= 10) {
                    rankCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF90EE90' } // Light green
                    };
                }

                // Add Attendance Data
                const attData = (legerData.attendance || {})[siswa.peserta_didik_id] || { s: 0, i: 0, a: 0 };
                ['s', 'i', 'a'].forEach((key, idx) => {
                    const col = getExcelCol(attendanceStartIdx + idx);
                    const cell = worksheet.getCell(`${col}${rowNum}`);
                    cell.value = attData[key] || '-';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                // Add Extracurricular Data
                if (ekskulList.length > 0) {
                    const ekskulStartIdx = attendanceStartIdx + 3;
                    const studentEkskul = ekskulValues[siswa.peserta_didik_id] || {};

                    ekskulList.forEach((ekskul: any, idx: number) => {
                        const col = getExcelCol(ekskulStartIdx + idx);
                        const cell = worksheet.getCell(`${col}${rowNum}`);
                        cell.value = studentEkskul[ekskul.id] || '';
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });
                }
            });

            // Add Keterangan Mapel Section
            const keteranganStartRow = 8 + students.length + 2; // 2 rows gap after student data

            // Title: "Keterangan Mapel"
            worksheet.getCell(`A${keteranganStartRow}`).value = 'Keterangan Mapel:';
            worksheet.getCell(`A${keteranganStartRow}`).font = { bold: true, size: 11 };

            // List each subject with format: nm_ringkas : nm_mapel
            allSubjects.forEach((subject: any, index: number) => {
                const rowNum = keteranganStartRow + 1 + index;
                const ringkas = subject.nm_ringkas || subject.nm_mapel || 'N/A';
                const fullName = subject.nm_mapel || subject.nm_lokal || 'N/A';

                worksheet.getCell(`A${rowNum}`).value = `${ringkas} : ${fullName}`;
                worksheet.getCell(`A${rowNum}`).font = { size: 10 };
            });

            // Generate and download file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Leger_Nilai_${kelasInfo?.nm_kelas?.replace(/\\s+/g, '_') || 'Rapor'}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success('File Excel berhasil dibuat!');
        } catch (error) {
            console.error('Error generating Excel:', error);
            toast.error('Gagal membuat file Excel: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAllSemesterExcel = async () => {
        if (!selectedKelas) {
            toast.error('Pilih kelas terlebih dahulu');
            return;
        }

        const kelasInfo = kelasData.kelas.find(k => k.nm_kelas === selectedKelas);
        if (!kelasInfo) {
            toast.error('Data kelas tidak ditemukan');
            return;
        }

        setIsGeneratingAllSemester(true);
        setAllSemesterProgress({ current: 0, total: 0, currentSemester: '' });

        try {
            const [semesterList, sekolahData] = await Promise.all([
                fetchAllSemesters(),
                fetchSekolahData(),
            ]);

            if (semesterList.length === 0) {
                toast.error('Tidak ada data semester yang tersedia');
                return;
            }

            const orderedSemesters = [...semesterList].sort((a, b) =>
                a.semester_id.localeCompare(b.semester_id)
            );

            setAllSemesterProgress({
                current: 0,
                total: orderedSemesters.length,
                currentSemester: '',
            });

            const blocks: AllSemesterBlock[] = [];
            for (let i = 0; i < orderedSemesters.length; i++) {
                const sem = orderedSemesters[i];
                setAllSemesterProgress({
                    current: i + 1,
                    total: orderedSemesters.length,
                    currentSemester: sem.nama_semester || sem.semester_id,
                });

                const res = await fetch(
                    `/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}&semester_id=${sem.semester_id}`
                );
                if (!res.ok) {
                    console.warn(`Skip semester ${sem.semester_id} (no data)`);
                    continue;
                }
                const data = await res.json();
                if (!data.students || data.students.length === 0) {
                    continue;
                }
                blocks.push({ semester: sem, data });
            }

            if (blocks.length === 0) {
                toast.error('Tidak ada data nilai untuk kelas ini di semester manapun');
                return;
            }

            const workbook = buildAllSemesterLegerWorkbook({
                sekolahNama: sekolahData.sekolah?.nama || '-',
                kelasNama: kelasInfo.nm_kelas,
                blocks,
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const filename = `Leger_Semua_Semester_${safeFilename(kelasInfo.nm_kelas)}.xlsx`;
            triggerExcelDownload(buffer, filename);

            toast.success(
                `File Excel berhasil dibuat (${blocks.length} semester, ${blocks.reduce((acc, b) => acc + (b.data.subjects?.length || 0), 0)} mata pelajaran)`
            );
        } catch (error) {
            console.error('Error generating all-semester leger:', error);
            toast.error('Gagal membuat leger semua semester: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsGeneratingAllSemester(false);
            setAllSemesterProgress({ current: 0, total: 0, currentSemester: '' });
        }
    };

    // Filter kelas based on user level
    const filteredKelas = kelasData.kelas.filter((kelas) => {
        // Filter by jenis_rombel (only regular classes: 1 and 9)
        const jenis = Number(kelas.jenis_rombel);
        const isRegularClass = jenis === 1 || jenis === 9;

        if (user?.level === 'Admin') return isRegularClass;
        return kelas.ptk_id === user?.ptk_id && isRegularClass;
    });

    return (
        <div className="container mx-auto p-4 space-y-6 w-full max-w-full min-w-0 overflow-x-hidden text-slate-900">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pl-1">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#1e3a8a] text-white p-1.5 rounded-md">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-[#1e3a8a] uppercase">
                            Leger Rapor Premium
                        </h1>
                    </div>
                    <p className="text-[13px] text-slate-500 font-medium italic">
                        Analisis nilai per kelas dan ekspor data ke format Excel (XLSX).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-50 text-[#1e3a8a] border-blue-100 font-bold px-3 py-1 text-[10px] uppercase">
                        {filteredKelas.length} Rombel Tersedia
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Selection Card - Left */}
                <Card className="lg:col-span-4 rounded-sm shadow-md border-none overflow-hidden bg-white h-fit">
                    <CardHeader className="py-4 px-6 border-b border-blue-50 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-[#1e3a8a]" />
                            <CardTitle className="text-[13px] font-black text-[#1e3a8a] uppercase tracking-wide">
                                Pilih Rombongan Belajar
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="py-6 px-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Nama Kelas / Rombel</label>
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-full justify-between h-11 text-[13px] font-bold text-[#1e3a8a] border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:text-blue-800 transition-all rounded-md"
                                    >
                                        <div className="flex items-center truncate">
                                            {selectedKelas ? (
                                                <>
                                                    <Users className="mr-2 h-4 w-4 opacity-70" />
                                                    {selectedKelas}
                                                </>
                                            ) : (
                                                'CARI KELAS...'
                                            )}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-blue-100" side="bottom" align="start" avoidCollisions={false} sideOffset={4}>
                                    <Command className="rounded-md">
                                        <CommandInput placeholder="Ketik nama kelas..." className="h-10 text-xs" />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty className="py-4 text-xs italic text-slate-400 text-center">Kelas tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {filteredKelas
                                                    .sort((a, b) => a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' }))
                                                    .map((kelas) => (
                                                        <CommandItem
                                                            key={kelas.rombongan_belajar_id}
                                                            value={kelas.nm_kelas}
                                                            className="text-xs font-medium py-2 px-3 data-[selected=true]:bg-blue-50 data-[selected=true]:text-[#1e3a8a] cursor-pointer"
                                                            onSelect={() => {
                                                                setSelectedKelas(kelas.nm_kelas);
                                                                setOpenCombobox(false);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="font-bold">{kelas.nm_kelas}</span>
                                                                <Badge variant="secondary" className="bg-slate-100 text-[9px] h-5">{kelas.jumlah_siswa || 0} Siswa</Badge>
                                                            </div>
                                                            {selectedKelas === kelas.nm_kelas && <Check className="ml-auto h-4 w-4" />}
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Tabs defaultValue="single" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-lg h-9">
                                <TabsTrigger value="single" className="rounded-md font-bold text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] data-[state=active]:shadow-sm py-1">
                                    <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                                    Per Semester
                                </TabsTrigger>
                                <TabsTrigger value="all-semester" className="rounded-md font-bold text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] data-[state=active]:shadow-sm py-1">
                                    <FileOutput className="w-3.5 h-3.5 mr-1" />
                                    Semua Semester
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="single" className="mt-4 space-y-3">
                                <Button
                                    onClick={handleGenerateExcel}
                                    disabled={!selectedKelas || isGenerating || isGeneratingAllSemester}
                                    className="w-full bg-[#1e3a8a] hover:bg-blue-800 h-10 text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-900/10 rounded-md group"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            GENERATING...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                                            EKSPOR KE EXCEL (XLSX)
                                        </>
                                    )}
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 font-medium px-2">
                                    File Excel akan mencakup nilai seluruh siswa, statistik rata-rata, peringkat, dan kehadiran.
                                </p>
                            </TabsContent>

                            <TabsContent value="all-semester" className="mt-4 space-y-3">
                                <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 text-[#1e3a8a] mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-[#1e3a8a] leading-relaxed font-medium">
                                        Menggabungkan nilai siswa dari <b>semua semester</b> ke dalam satu file.
                                        Header dikelompokkan per <b>mata pelajaran</b> dengan sub-kolom <b>SMT 1 &ndash; SMT 6</b> (template konsisten walau belum ada datanya) dan kolom <b>RATA-RATA</b> di tiap mapel.
                                    </p>
                                </div>

                                {isGeneratingAllSemester && (
                                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-slate-700">Progres Semester</span>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                {allSemesterProgress.total > 0
                                                    ? Math.round((allSemesterProgress.current / allSemesterProgress.total) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <Progress
                                            value={allSemesterProgress.total > 0
                                                ? (allSemesterProgress.current / allSemesterProgress.total) * 100
                                                : 0}
                                            className="h-2 bg-slate-200 text-indigo-600"
                                        />
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-white p-2 rounded-md border border-slate-100">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                            <span className="text-indigo-700 truncate">{allSemesterProgress.currentSemester || '...'}</span>
                                            <span className="ml-auto text-slate-400">{allSemesterProgress.current}/{allSemesterProgress.total}</span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleGenerateAllSemesterExcel}
                                    disabled={!selectedKelas || isGeneratingAllSemester || isGenerating}
                                    className="w-full bg-[#1e3a8a] hover:bg-indigo-950 h-10 text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-900/10 rounded-md group"
                                >
                                    {isGeneratingAllSemester ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            MEMPROSES...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                                            GENERATE LEGER SEMUA SEMESTER
                                        </>
                                    )}
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 font-medium px-2">
                                        Format: NO | NAMA | NISN | NIS | Nilai per semester (SMT 1&ndash;SMT 6) & mata pelajaran + RATA-RATA.
                                    </p>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Preview/Summary Column - Right */}
                <div className="lg:col-span-8 space-y-6">
                    {summary.isLoading ? (
                        <Card className="rounded-sm border-none shadow-sm h-[320px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm grayscale opacity-70">
                            <div className="relative h-16 w-16 mb-4">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-[#1e3a8a] animate-spin"></div>
                                <BarChart3 className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-[#1e3a8a]" />
                            </div>
                            <p className="text-xs font-black text-[#1e3a8a] animate-pulse uppercase tracking-widest">Menganalisis Data Leger...</p>
                        </Card>
                    ) : summary.hasData ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Stats */}
                            <Card className="rounded-sm shadow-md border-none bg-white p-5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Users className="h-5 w-5 text-[#1e3a8a]" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Populasi</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-[#1e3a8a] tracking-tight">{summary.totalStudents}</div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Siswa Terdaftar</p>
                                </div>
                            </Card>

                            <Card className="rounded-sm shadow-md border-none bg-white p-5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <BookOpen className="h-5 w-5 text-indigo-700" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Akademik</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-indigo-700 tracking-tight">{summary.totalSubjects}</div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase">Mata Pelajaran</p>
                                </div>
                            </Card>

                            <Card className="rounded-sm shadow-md border-none bg-white p-5 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <Trophy className="h-5 w-5 text-emerald-700" />
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-700 text-[9px] uppercase border-none hover:bg-emerald-500/10">Rerata Kelas</Badge>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-emerald-700 tracking-tight">{summary.classAvg}</div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Nilai Rata-rata</p>
                                </div>
                            </Card>

                            {/* Top Students Rank */}
                            <Card className="md:col-span-2 lg:col-span-3 rounded-sm shadow-md border-none bg-white overflow-hidden">
                                <CardHeader className="py-3 px-5 border-b border-blue-50 flex flex-row items-center justify-between bg-slate-50/30">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-[#1e3a8a]" />
                                        <CardTitle className="text-[11px] font-black text-[#1e3a8a] uppercase tracking-widest">
                                            Ringkasan Peringkat (Top 3)
                                        </CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="bg-white text-[9px] text-[#1e3a8a] font-black border-blue-100">PREVIEW ONLY</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {summary.topStudents.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs ${
                                                        i === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/20' : 
                                                        i === 1 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-400/20' : 
                                                        'bg-orange-100 text-orange-700 ring-2 ring-orange-500/20'
                                                    }`}>
                                                        {s.rank}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{s.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Skor: {s.sum}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[14px] font-black text-[#1e3a8a]">{s.avg}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Rata-rata</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="rounded-sm border-2 border-dashed border-slate-200 shadow-none h-full flex flex-col items-center justify-center p-12 bg-slate-50/50 text-slate-400">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <BarChart3 className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Menunggu Pemilihan Kelas</h3>
                            <p className="text-xs font-medium mt-1">Pilih kelas di sebelah kiri untuk melihat ringkasan statistik.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
