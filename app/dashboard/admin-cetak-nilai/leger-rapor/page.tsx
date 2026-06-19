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
import { 
    FileSpreadsheet, 
    Download, 
    Check, 
    ChevronsUpDown, 
    Info, 
    BookOpen, 
    Users, 
    Rocket,
    LayoutDashboard,
    FileOutput,
    Loader2
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-client';
import { useSemester } from '@/components/providers/semester-context';
import type { User, Kelas } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import ExcelJS from 'exceljs';
import {
    fetchAllSemesters,
    fetchSekolahData,
    buildAllSemesterLegerWorkbook,
    triggerExcelDownload,
    safeFilename,
    type AllSemesterBlock,
} from '@/lib/leger-excel';

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
    const { activeSemester } = useSemester();
    const [user, setUser] = useState<User | null>(null);
    const [kelasData, setKelasData] = useState<{ kelas: Kelas[] }>({ kelas: [] });
    const [selectedKelas, setSelectedKelas] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentClass: '' });
    const [isGeneratingAllSemester, setIsGeneratingAllSemester] = useState(false);
    const [allSemesterProgress, setAllSemesterProgress] = useState({ current: 0, total: 0, currentSemester: '' });

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

            // Fetch sekolah data
            const sekolahRes = await fetch('/api/sekolah');
            const sekolahData = await sekolahRes.json();
            
            // Get active semester ID from context
            const semesterId = activeSemester?.semester_id;
            const semesterText = activeSemester?.nama_semester || '2025/2026';

            // Fetch BULK Leger Data (Single Request)
            const legerRes = await fetch(`/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}${semesterId ? `&semester_id=${semesterId}` : ''}`);

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
            // semesterText already defined from activeSemester

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

            // ROW 4: Semester
            worksheet.getCell('A4').value = 'SEMESTER';
            worksheet.getCell('A4').font = { bold: true };
            worksheet.getCell('C4').value = `: ${semesterText}`;

            // ROWS 5-8: Headers (merged)
            const headers = ['NO', 'NAMA SISWA', 'NISN', 'NIS'];

            // Merge rows 5-8 for each header column
            worksheet.mergeCells('A5:A8');
            worksheet.mergeCells('B5:B8');
            worksheet.mergeCells('C5:C8');
            worksheet.mergeCells('D5:D8');

            // Set header values and styling
            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index); // A, B, C, D
                const cell = worksheet.getCell(`${col}5`);
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

            // ROW 5: Add "MATA PELAJARAN" header (merged across all subject columns)
            if (allSubjects.length > 0) {
                const startCol = 'E';
                const endCol = getExcelCol(4 + allSubjects.length - 1); // E + count - 1
                worksheet.mergeCells(`${startCol}5:${endCol}5`);
                const mataPelajaranCell = worksheet.getCell('E5');
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

                // ROWS 6-8: Add subject names (each column merged vertically)
                allSubjects.forEach((subject: any, index: number) => {
                    const colIdx = 4 + index;
                    const col = getExcelCol(colIdx);

                    // Merge rows 6-8 for this subject column
                    worksheet.mergeCells(`${col}6:${col}8`);

                    const cell = worksheet.getCell(`${col}6`);
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

            // Row 5: Header Group "WALI KELAS"
            const startStatsCol = getExcelCol(statsStartIdx);
            const endStatsCol = getExcelCol(statsStartIdx + 2);
            worksheet.mergeCells(`${startStatsCol}5:${endStatsCol}5`);
            const statsGroupHeader = worksheet.getCell(`${startStatsCol}5`);
            statsGroupHeader.value = 'WALI KELAS';
            statsGroupHeader.font = { bold: true };
            statsGroupHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            statsGroupHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF99FFD6' }
            };
            statsGroupHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Row 6-8: Sub Headers
            statsHeaders.forEach((header, idx) => {
                const col = getExcelCol(statsStartIdx + idx);
                worksheet.mergeCells(`${col}6:${col}8`);
                const cell = worksheet.getCell(`${col}6`);
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

            // Merge "KETIDAKHADIRAN" Row 5-7
            worksheet.mergeCells(`${startAttCol}5:${endAttCol}7`);
            const attHeader = worksheet.getCell(`${startAttCol}5`);
            attHeader.value = 'KETIDAKHADIRAN';
            attHeader.font = { bold: true };
            attHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            attHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF99FFD6' }
            };
            attHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // Sub-headers Row 8: Sakit, Izin, Alpa
            ['Sakit', 'Izin', 'Alpa'].forEach((label, idx) => {
                const col = getExcelCol(attendanceStartIdx + idx);
                const cell = worksheet.getCell(`${col}8`);
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

                // Merge "EKSTRA KURIKULER" Row 5
                worksheet.mergeCells(`${startEkskulCol}5:${endEkskulCol}5`);
                const ekskulHeader = worksheet.getCell(`${startEkskulCol}5`);
                ekskulHeader.value = 'EKSTRA KURIKULER';
                ekskulHeader.font = { bold: true };
                ekskulHeader.alignment = { horizontal: 'center', vertical: 'middle' };
                ekskulHeader.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF99FFD6' }
                };
                ekskulHeader.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                // Sub-headers Row 6-8: Ekskul names
                ekskulList.forEach((ekskul: any, idx: number) => {
                    const col = getExcelCol(ekskulStartIdx + idx);
                    worksheet.mergeCells(`${col}6:${col}8`);
                    const cell = worksheet.getCell(`${col}6`);
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

            // Add student data starting from row 9
            console.log(`Adding ${students.length} students to Excel`);

            students.forEach((siswa: any, index: number) => {
                const rowNum = 9 + index;
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
            const keteranganStartRow = 9 + students.length + 2; // 2 rows gap after student data

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
            const safeSemester = semesterText.replace(/\s+/g, '_');
            a.download = `Leger_Nilai_${kelasInfo?.nm_kelas?.replace(/\s+/g, '_') || 'Rapor'}_Semester_${safeSemester}.xlsx`;
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

    const handleGenerateAllExcel = async () => {
        if (filteredKelas.length === 0) {
            toast.error('Tidak ada kelas untuk di-generate');
            return;
        }

        setIsGeneratingAll(true);
        setBulkProgress({ current: 0, total: filteredKelas.length, currentClass: '' });

        try {
            toast.info(`Mempersiapkan ${filteredKelas.length} file Excel...`);

            // Fetch sekolah data once (reused for all classes)
            const sekolahRes = await fetch('/api/sekolah');
            const sekolahData = await sekolahRes.json();

            // Get active semester ID from context
            const semesterId = activeSemester?.semester_id;
            const semesterText = activeSemester?.nama_semester || '2025/2026';

            // Process each class
            for (let i = 0; i < filteredKelas.length; i++) {
                const kelasInfo = filteredKelas[i];
                setBulkProgress({ current: i + 1, total: filteredKelas.length, currentClass: kelasInfo.nm_kelas });

                try {
                    // Fetch leger data for this class
                    const legerRes = await fetch(`/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}${semesterId ? `&semester_id=${semesterId}` : ''}`);

                    if (!legerRes.ok) {
                        toast.warning(`Gagal mengambil data untuk kelas ${kelasInfo.nm_kelas}`);
                        continue;
                    }

                    const legerData = await legerRes.json();
                    const students = legerData.students || [];
                    const allSubjects = legerData.subjects || [];
                    const gradeMap = legerData.grades || {};
                    const ekskulList = legerData.ekskul || [];
                    const ekskulValues = legerData.ekskulValues || {};

                    if (students.length === 0) {
                        toast.warning(`Kelas ${kelasInfo.nm_kelas} tidak memiliki siswa, dilewati`);
                        continue;
                    }

                    // Calculate stats for this class
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

                    // Calculate ranks
                    studentSums.sort((a, b) => b.sum - a.sum);
                    let currentRank = 0;
                    let previousSum: number | null = null;

                    studentSums.forEach((item) => {
                        if (item.sum !== previousSum) {
                            currentRank++;
                            previousSum = item.sum;
                        }
                        if (studentStats[item.id]) {
                            studentStats[item.id].rank = currentRank;
                        }
                    });

                    // Create workbook (same logic as single generation)
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Leger Nilai');

                    const columnConfig = [
                        { width: 5 }, { width: 30 }, { width: 12 }, { width: 12 },
                        ...allSubjects.map(() => ({ width: 7 })),
                        { width: 10 }, { width: 10 }, { width: 10 },
                        { width: 7 }, { width: 7 }, { width: 7 },
                        ...ekskulList.map(() => ({ width: 8 }))
                    ];
                    worksheet.columns = columnConfig;

                    // semesterText already defined from activeSemester

                    const totalCols = 4 + allSubjects.length + 3 + 3 + ekskulList.length;
                    const lastColChar = getExcelCol(totalCols - 1);

                    // Row 1: Title
                    worksheet.getCell('A1').value = `LEGER NILAI RAPOR SISWA TAHUN PELAJARAN ${semesterText.toUpperCase()}`;
                    worksheet.getCell('A1').font = { bold: true, size: 14 };
                    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
                    worksheet.mergeCells(`A1:${lastColChar}1`);

                    // Row 2-4: School, Class, Semester info
                    worksheet.getCell('A2').value = 'SEKOLAH';
                    worksheet.getCell('A2').font = { bold: true };
                    worksheet.getCell('C2').value = `: ${sekolahData.sekolah?.nama || '-'}`;
                    worksheet.getCell('A3').value = 'KELAS';
                    worksheet.getCell('A3').font = { bold: true };
                    worksheet.getCell('C3').value = `: ${kelasInfo.nm_kelas}`;
                    worksheet.getCell('A4').value = 'SEMESTER';
                    worksheet.getCell('A4').font = { bold: true };
                    worksheet.getCell('C4').value = `: ${semesterText}`;

                    // Headers (simplified - reuse same logic)
                    const headers = ['NO', 'NAMA SISWA', 'NISN', 'NIS'];
                    ['A5:A8', 'B5:B8', 'C5:C8', 'D5:D8'].forEach((range, idx) => {
                        worksheet.mergeCells(range);
                        const cell = worksheet.getCell(range.split(':')[0]);
                        cell.value = headers[idx];
                        cell.font = { bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });

                    // Mata Pelajaran headers
                    if (allSubjects.length > 0) {
                        const startCol = 'E';
                        const endCol = getExcelCol(4 + allSubjects.length - 1);
                        worksheet.mergeCells(`${startCol}5:${endCol}5`);
                        const cell = worksheet.getCell('E5');
                        cell.value = 'MATA PELAJARAN';
                        cell.font = { bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        allSubjects.forEach((subject: any, index: number) => {
                            const colIdx = 4 + index;
                            const col = getExcelCol(colIdx);
                            worksheet.mergeCells(`${col}6:${col}8`);
                            const subCell = worksheet.getCell(`${col}6`);
                            subCell.value = subject.nm_ringkas || subject.nm_mapel || 'Mapel';
                            subCell.font = { bold: true, size: 9 };
                            subCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                            subCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });
                    }

                    // Stats headers
                    const statsStartIdx = 4 + allSubjects.length;
                    const startStatsCol = getExcelCol(statsStartIdx);
                    const endStatsCol = getExcelCol(statsStartIdx + 2);
                    worksheet.mergeCells(`${startStatsCol}5:${endStatsCol}5`);
                    const statsCell = worksheet.getCell(`${startStatsCol}5`);
                    statsCell.value = 'WALI KELAS';
                    statsCell.font = { bold: true };
                    statsCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    statsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                    statsCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    ['JUMLAH', 'RATA-RATA', 'RANGKING'].forEach((header, idx) => {
                        const col = getExcelCol(statsStartIdx + idx);
                        worksheet.mergeCells(`${col}6:${col}8`);
                        const cell = worksheet.getCell(`${col}6`);
                        cell.value = header;
                        cell.font = { bold: true, size: 9 };
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });

                    // Attendance headers
                    const attendanceStartIdx = statsStartIdx + 3;
                    const startAttCol = getExcelCol(attendanceStartIdx);
                    const endAttCol = getExcelCol(attendanceStartIdx + 2);
                    worksheet.mergeCells(`${startAttCol}5:${endAttCol}7`);
                    const attCell = worksheet.getCell(`${startAttCol}5`);
                    attCell.value = 'KETIDAKHADIRAN';
                    attCell.font = { bold: true };
                    attCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    attCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                    attCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    ['Sakit', 'Izin', 'Alpa'].forEach((label, idx) => {
                        const col = getExcelCol(attendanceStartIdx + idx);
                        const cell = worksheet.getCell(`${col}8`);
                        cell.value = label;
                        cell.font = { bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });

                    // Ekskul headers
                    if (ekskulList.length > 0) {
                        const ekskulStartIdx = attendanceStartIdx + 3;
                        const startEkskulCol = getExcelCol(ekskulStartIdx);
                        const endEkskulCol = getExcelCol(ekskulStartIdx + ekskulList.length - 1);
                        worksheet.mergeCells(`${startEkskulCol}5:${endEkskulCol}5`);
                        const ekskulCell = worksheet.getCell(`${startEkskulCol}5`);
                        ekskulCell.value = 'EKSTRA KURIKULER';
                        ekskulCell.font = { bold: true };
                        ekskulCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        ekskulCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        ekskulCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        ekskulList.forEach((ekskul: any, idx: number) => {
                            const col = getExcelCol(ekskulStartIdx + idx);
                            worksheet.mergeCells(`${col}6:${col}8`);
                            const cell = worksheet.getCell(`${col}6`);
                            cell.value = ekskul.name;
                            cell.font = { bold: true, size: 9 };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });
                    }

                    // Student data
                    students.forEach((siswa: any, index: number) => {
                        const rowNum = 9 + index;
                        worksheet.getCell(`A${rowNum}`).value = index + 1;
                        worksheet.getCell(`B${rowNum}`).value = siswa.nm_siswa;
                        worksheet.getCell(`C${rowNum}`).value = siswa.nisn || '-';
                        worksheet.getCell(`D${rowNum}`).value = siswa.nis || '-';

                        ['A', 'B', 'C', 'D'].forEach(col => {
                            worksheet.getCell(`${col}${rowNum}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });

                        worksheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
                        worksheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
                        worksheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

                        allSubjects.forEach((subject: any, subjectIndex: number) => {
                            const col = getExcelCol(4 + subjectIndex);
                            const grade = gradeMap[siswa.peserta_didik_id]?.[subject.mata_pelajaran_id];
                            const gradeCell = worksheet.getCell(`${col}${rowNum}`);
                            gradeCell.value = grade !== undefined ? grade : '-';
                            gradeCell.alignment = { horizontal: 'center', vertical: 'middle' };
                            gradeCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });

                        const stats = studentStats[siswa.peserta_didik_id] || { sum: 0, avg: 0, rank: 0 };
                        const sumCol = getExcelCol(statsStartIdx);
                        const sumCell = worksheet.getCell(`${sumCol}${rowNum}`);
                        sumCell.value = stats.sum;
                        sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        sumCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        const avgCol = getExcelCol(statsStartIdx + 1);
                        const avgCell = worksheet.getCell(`${avgCol}${rowNum}`);
                        avgCell.value = stats.avg;
                        avgCell.numFmt = '0.00';
                        avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        avgCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        const rankCol = getExcelCol(statsStartIdx + 2);
                        const rankCell = worksheet.getCell(`${rankCol}${rowNum}`);
                        rankCell.value = stats.rank;
                        rankCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        rankCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        if (stats.rank >= 1 && stats.rank <= 10) {
                            rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
                        }

                        const attData = (legerData.attendance || {})[siswa.peserta_didik_id] || { s: 0, i: 0, a: 0 };
                        ['s', 'i', 'a'].forEach((key, idx) => {
                            const col = getExcelCol(attendanceStartIdx + idx);
                            const cell = worksheet.getCell(`${col}${rowNum}`);
                            cell.value = attData[key] || '-';
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });

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

                    // Keterangan Mapel
                    const keteranganStartRow = 9 + students.length + 2;
                    worksheet.getCell(`A${keteranganStartRow}`).value = 'Keterangan Mapel:';
                    worksheet.getCell(`A${keteranganStartRow}`).font = { bold: true, size: 11 };
                    allSubjects.forEach((subject: any, index: number) => {
                        const rowNum = keteranganStartRow + 1 + index;
                        const ringkas = subject.nm_ringkas || subject.nm_mapel || 'N/A';
                        const fullName = subject.nm_mapel || subject.nm_lokal || 'N/A';
                        worksheet.getCell(`A${rowNum}`).value = `${ringkas} : ${fullName}`;
                        worksheet.getCell(`A${rowNum}`).font = { size: 10 };
                    });

                    // Download file
                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeSemester = semesterText.replace(/\s+/g, '_');
                    a.download = `Leger_Nilai_${kelasInfo.nm_kelas.replace(/\s+/g, '_')}_Semester_${safeSemester}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);

                    toast.success(`✓ ${kelasInfo.nm_kelas}`);

                    // Small delay to prevent browser overwhelm
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`Error generating for ${kelasInfo.nm_kelas}:`, error);
                    toast.error(`Gagal generate ${kelasInfo.nm_kelas}`);
                }
            }

            toast.success(`Selesai! ${filteredKelas.length} file Excel berhasil dibuat`);
        } catch (error) {
            console.error('Error in bulk generation:', error);
            toast.error('Gagal generate file Excel massal');
        } finally {
            setIsGeneratingAll(false);
            setBulkProgress({ current: 0, total: 0, currentClass: '' });
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
            // 1. Fetch list of all semesters (DESC) and school data in parallel
            const [semesterList, sekolahData] = await Promise.all([
                fetchAllSemesters(),
                fetchSekolahData(),
            ]);

            if (semesterList.length === 0) {
                toast.error('Tidak ada data semester yang tersedia');
                return;
            }

            // Use ASC (oldest → newest) for the final layout
            const orderedSemesters = [...semesterList].sort((a, b) =>
                a.semester_id.localeCompare(b.semester_id)
            );

            setAllSemesterProgress({
                current: 0,
                total: orderedSemesters.length,
                currentSemester: '',
            });

            // 2. Fetch leger data for each semester sequentially
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

            // 3. Build the workbook
            const workbook = buildAllSemesterLegerWorkbook({
                sekolahNama: sekolahData.sekolah?.nama || '-',
                kelasNama: kelasInfo.nm_kelas,
                blocks,
            });

            // 4. Trigger download
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

    const totalStudents = filteredKelas.reduce((acc, k) => acc + Number(k.jumlah_siswa || 0), 0);
    const progressPercentage = bulkProgress.total > 0 
        ? Math.round((bulkProgress.current / bulkProgress.total) * 100) 
        : 0;

    return (
        <div className="container mx-auto p-4 space-y-4 max-w-5xl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                        <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
                            Leger Rapor
                        </h1>
                        <Badge variant="outline" className="border-blue-100 bg-blue-50 text-[#1e3a8a] font-bold text-[10px] py-0 h-5">
                             {activeSemester?.nama_semester || '...'}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-[11px] ml-3 italic">
                        Generate data kolektif nilai rapor siswa per kelas.
                    </p>
                </div>
                
                <div className="flex gap-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex flex-col items-center px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas</span>
                        <span className="text-sm font-black text-[#1e3a8a]">{filteredKelas.length}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-slate-200 self-center" />
                    <div className="flex flex-col items-center px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</span>
                        <span className="text-sm font-black text-[#1e3a8a]">{totalStudents}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="single" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-lg h-9">
                            <TabsTrigger value="single" className="rounded-md font-bold text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] data-[state=active]:shadow-sm py-1">
                                <LayoutDashboard className="w-3.5 h-3.5 mr-1" />
                                Per Kelas
                            </TabsTrigger>
                            <TabsTrigger value="bulk" className="rounded-md font-bold text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] data-[state=active]:shadow-sm py-1">
                                <Rocket className="w-3.5 h-3.5 mr-1" />
                                Massal
                            </TabsTrigger>
                            <TabsTrigger value="all-semester" className="rounded-md font-bold text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#1e3a8a] data-[state=active]:shadow-sm py-1">
                                <FileOutput className="w-3.5 h-3.5 mr-1" />
                                Semua Semester
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="single" className="mt-4">
                            <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
                                <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-[#1e3a8a]" />
                                        <CardTitle className="text-sm font-bold text-[#1e3a8a]">Ekspor Leger Tunggal</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 py-4 px-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Pilih Unit Kelas</label>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox}
                                                    className="w-full justify-between h-10 border-blue-50 bg-slate-50 text-xs font-bold text-[#1e3a8a] transition-all"
                                                >
                                                    <span className="truncate">
                                                        {selectedKelas
                                                            ? `${selectedKelas} (${filteredKelas.find(k => k.nm_kelas === selectedKelas)?.jumlah_siswa || 0} Siswa)`
                                                            : 'Cari dan pilih kelas...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#1e3a8a]" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-blue-100" side="bottom" align="start" sideOffset={4}>
                                                <Command className="rounded-lg">
                                                    <CommandInput placeholder="Ketik nama kelas..." className="h-11" />
                                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                                        <CommandEmpty>Kelas tidak ditemukan.</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredKelas
                                                                .sort((a, b) => a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' }))
                                                                .map((kelas) => (
                                                                    <CommandItem
                                                                        key={kelas.rombongan_belajar_id}
                                                                        value={kelas.nm_kelas}
                                                                        onSelect={() => {
                                                                            setSelectedKelas(kelas.nm_kelas);
                                                                            setOpenCombobox(false);
                                                                        }}
                                                                        className="py-3 px-4 flex items-center justify-between cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center">
                                                                            <Check
                                                                                className={`mr-3 h-3 w-3 text-[#1e3a8a] ${selectedKelas === kelas.nm_kelas ? 'opacity-100' : 'opacity-0'}`}
                                                                            />
                                                                            <span className="font-bold text-xs text-[#1e3a8a]">{kelas.nm_kelas}</span>
                                                                        </div>
                                                                        <Badge variant="secondary" className="bg-slate-100 text-[10px] text-slate-500 font-normal py-0">
                                                                            {kelas.jumlah_siswa || 0}
                                                                        </Badge>
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <Button
                                        onClick={handleGenerateExcel}
                                        disabled={!selectedKelas || isGenerating || isGeneratingAll}
                                        className="w-full h-10 bg-[#1e3a8a] hover:bg-indigo-950 text-white shadow-sm transition-all font-black text-xs rounded-lg uppercase tracking-tight"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                MEMPROSES...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                GENERARE & UNDUH LEGER
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bulk" className="mt-4">
                            <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
                                <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                                    <div className="flex items-center gap-2">
                                        <Rocket className="w-4 h-4 text-[#1e3a8a]" />
                                        <CardTitle className="text-sm font-bold text-[#1e3a8a]">Generate Massal</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 py-4 px-4">
                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2">
                                        <Info className="w-4 h-4 text-[#1e3a8a] mt-0.5 shrink-0" />
                                        <div className="text-[11px] text-[#1e3a8a] leading-relaxed font-medium">
                                            Proses ini akan mengunduh banyak file Excel secara berurutan. Pastikan koneksi internet stabil.
                                        </div>
                                    </div>

                                    {isGeneratingAll && (
                                        <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-bold text-slate-700">Progres Keseluruhan</span>
                                                <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{progressPercentage}%</span>
                                            </div>
                                            <Progress value={progressPercentage} className="h-3 bg-slate-200 text-indigo-600" />
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                                Memproses: <span className="text-indigo-700">{bulkProgress.currentClass}</span> ({bulkProgress.current}/{bulkProgress.total})
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleGenerateAllExcel}
                                        disabled={isGeneratingAll || isGenerating || filteredKelas.length === 0}
                                        className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all font-black text-xs rounded-lg uppercase tracking-tight"
                                    >
                                        {isGeneratingAll ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                STOP PROCESS
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                GENERATE ALL ({filteredKelas.length} KELAS)
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="all-semester" className="mt-4">
                            <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
                                <CardHeader className="py-3 px-4 bg-slate-50/50 border-b">
                                    <div className="flex items-center gap-2">
                                        <FileOutput className="w-4 h-4 text-[#1e3a8a]" />
                                        <CardTitle className="text-sm font-bold text-[#1e3a8a]">Leger Semua Semester</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 py-4 px-4">
                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2">
                                        <Info className="w-4 h-4 text-[#1e3a8a] mt-0.5 shrink-0" />
                                        <div className="text-[11px] text-[#1e3a8a] leading-relaxed font-medium">
                                            Menggabungkan nilai siswa dari <b>semua semester</b> ke dalam satu file Excel.
                                            Header dikelompokkan per <b>mata pelajaran</b> (nama lengkap, 1 baris) dengan sub-kolom <b>SMT 1 &ndash; SMT 6</b> (template konsisten walau semester belum ada datanya) dan kolom <b>RATA-RATA</b> di tiap mapel.
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Pilih Unit Kelas</label>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox}
                                                    className="w-full justify-between h-10 border-blue-50 bg-slate-50 text-xs font-bold text-[#1e3a8a] transition-all"
                                                >
                                                    <span className="truncate">
                                                        {selectedKelas
                                                            ? `${selectedKelas} (${filteredKelas.find(k => k.nm_kelas === selectedKelas)?.jumlah_siswa || 0} Siswa)`
                                                            : 'Cari dan pilih kelas...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#1e3a8a]" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-blue-100" side="bottom" align="start" sideOffset={4}>
                                                <Command className="rounded-lg">
                                                    <CommandInput placeholder="Ketik nama kelas..." className="h-11" />
                                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                                        <CommandEmpty>Kelas tidak ditemukan.</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredKelas
                                                                .sort((a, b) => a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' }))
                                                                .map((kelas) => (
                                                                    <CommandItem
                                                                        key={kelas.rombongan_belajar_id}
                                                                        value={kelas.nm_kelas}
                                                                        onSelect={() => {
                                                                            setSelectedKelas(kelas.nm_kelas);
                                                                            setOpenCombobox(false);
                                                                        }}
                                                                        className="py-3 px-4 flex items-center justify-between cursor-pointer"
                                                                    >
                                                                        <div className="flex items-center">
                                                                            <Check
                                                                                className={`mr-3 h-3 w-3 text-[#1e3a8a] ${selectedKelas === kelas.nm_kelas ? 'opacity-100' : 'opacity-0'}`}
                                                                            />
                                                                            <span className="font-bold text-xs text-[#1e3a8a]">{kelas.nm_kelas}</span>
                                                                        </div>
                                                                        <Badge variant="secondary" className="bg-slate-100 text-[10px] text-slate-500 font-normal py-0">
                                                                            {kelas.jumlah_siswa || 0}
                                                                        </Badge>
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {isGeneratingAllSemester && (
                                        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-bold text-slate-700">Mengambil Data per Semester</span>
                                                <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                    {allSemesterProgress.total > 0
                                                        ? Math.round((allSemesterProgress.current / allSemesterProgress.total) * 100)
                                                        : 0}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={allSemesterProgress.total > 0
                                                    ? (allSemesterProgress.current / allSemesterProgress.total) * 100
                                                    : 0}
                                                className="h-3 bg-slate-200 text-indigo-600"
                                            />
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                                Memproses: <span className="text-indigo-700">{allSemesterProgress.currentSemester || '...'}</span> ({allSemesterProgress.current}/{allSemesterProgress.total})
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleGenerateAllSemesterExcel}
                                        disabled={!selectedKelas || isGeneratingAllSemester || isGenerating || isGeneratingAll}
                                        className="w-full h-10 bg-[#1e3a8a] hover:bg-indigo-950 text-white shadow-sm transition-all font-black text-xs rounded-lg uppercase tracking-tight"
                                    >
                                        {isGeneratingAllSemester ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                MEMPROSES...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-4 w-4" />
                                                GENERATE LEGER SEMUA SEMESTER
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-4">
                    <Card className="rounded-sm shadow-sm border border-blue-100 bg-[#1e3a8a] text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <FileSpreadsheet className="w-16 h-16" />
                        </div>
                        <CardHeader className="py-3 px-4 bg-white/5 border-b border-white/10">
                            <CardTitle className="text-white text-xs font-black uppercase tracking-widest">Informasi Leger</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 py-4 px-4 relative z-10">
                            <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                                <p className="text-[10px] uppercase font-bold text-blue-200">Semester</p>
                                <p className="text-[10px] font-black">{activeSemester?.nama_semester || '-'}</p>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                                <p className="text-[10px] uppercase font-bold text-blue-200">Th Ajaran</p>
                                <p className="text-[10px] font-black">{activeSemester?.tahun_ajaran_id || '-'}</p>
                            </div>
                            <div className="flex items-start gap-2 mt-2 bg-blue-900/50 p-2 rounded border border-white/5">
                                <Info className="h-3 w-3 text-blue-300 mt-0.5" />
                                <p className="text-[10px] text-blue-100 leading-tight">
                                    Mencakup Nilai Akhir, Absensi, dan Ekstrakurikuler.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Alert className="bg-blue-50 border-blue-100 rounded-sm py-2">
                        <Info className="h-3.5 w-3.5 text-[#1e3a8a]" />
                        <AlertDescription className="text-[#1e3a8a] text-[10px] font-bold leading-tight">
                            Pastikan nilai sudah diposting oleh guru agar data muncul lengkap.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
