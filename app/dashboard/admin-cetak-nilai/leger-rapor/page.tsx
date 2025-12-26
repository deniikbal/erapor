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
import { FileSpreadsheet, Download, Check, ChevronsUpDown } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-client';
import type { User, Kelas } from '@/lib/db';
import ExcelJS from 'exceljs';

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
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentClass: '' });

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

    const handleGenerateAllExcel = async () => {
        if (filteredKelas.length === 0) {
            toast.error('Tidak ada kelas untuk di-generate');
            return;
        }

        setIsGeneratingAll(true);
        setBulkProgress({ current: 0, total: filteredKelas.length, currentClass: '' });

        try {
            toast.info(`Mempersiapkan ${filteredKelas.length} file Excel...`);

            // Fetch semester & sekolah data once (reused for all classes)
            const [semesterRes, sekolahRes] = await Promise.all([
                fetch('/api/semester'),
                fetch('/api/sekolah')
            ]);

            const semesterData = await semesterRes.json();
            const sekolahData = await sekolahRes.json();

            // Process each class
            for (let i = 0; i < filteredKelas.length; i++) {
                const kelasInfo = filteredKelas[i];
                setBulkProgress({ current: i + 1, total: filteredKelas.length, currentClass: kelasInfo.nm_kelas });

                try {
                    // Fetch leger data for this class
                    const legerRes = await fetch(`/api/leger?rombongan_belajar_id=${kelasInfo.rombongan_belajar_id}`);

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

                    const semesterText = semesterData.data?.[0]?.nama_semester || semesterData.semester?.nama_semester || '2025/2026';
                    const totalCols = 4 + allSubjects.length + 3 + 3 + ekskulList.length;
                    const lastColChar = getExcelCol(totalCols - 1);

                    // Row 1: Title
                    worksheet.getCell('A1').value = `LEGER NILAI RAPOR SISWA TAHUN PELAJARAN ${semesterText.toUpperCase()}`;
                    worksheet.getCell('A1').font = { bold: true, size: 14 };
                    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
                    worksheet.mergeCells(`A1:${lastColChar}1`);

                    // Row 2-3: School & Class info
                    worksheet.getCell('A2').value = 'SEKOLAH';
                    worksheet.getCell('A2').font = { bold: true };
                    worksheet.getCell('C2').value = `: ${sekolahData.sekolah?.nama || '-'}`;
                    worksheet.getCell('A3').value = 'KELAS';
                    worksheet.getCell('A3').font = { bold: true };
                    worksheet.getCell('C3').value = `: ${kelasInfo.nm_kelas}`;

                    // Headers (simplified - reuse same logic)
                    const headers = ['NO', 'NAMA SISWA', 'NISN', 'NIS'];
                    ['A4:A7', 'B4:B7', 'C4:C7', 'D4:D7'].forEach((range, idx) => {
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
                        worksheet.mergeCells(`${startCol}4:${endCol}4`);
                        const cell = worksheet.getCell('E4');
                        cell.value = 'MATA PELAJARAN';
                        cell.font = { bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        allSubjects.forEach((subject: any, index: number) => {
                            const colIdx = 4 + index;
                            const col = getExcelCol(colIdx);
                            worksheet.mergeCells(`${col}5:${col}7`);
                            const subCell = worksheet.getCell(`${col}5`);
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
                    worksheet.mergeCells(`${startStatsCol}4:${endStatsCol}4`);
                    const statsCell = worksheet.getCell(`${startStatsCol}4`);
                    statsCell.value = 'WALI KELAS';
                    statsCell.font = { bold: true };
                    statsCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    statsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                    statsCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    ['JUMLAH', 'RATA-RATA', 'RANGKING'].forEach((header, idx) => {
                        const col = getExcelCol(statsStartIdx + idx);
                        worksheet.mergeCells(`${col}5:${col}7`);
                        const cell = worksheet.getCell(`${col}5`);
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
                    worksheet.mergeCells(`${startAttCol}4:${endAttCol}6`);
                    const attCell = worksheet.getCell(`${startAttCol}4`);
                    attCell.value = 'KETIDAKHADIRAN';
                    attCell.font = { bold: true };
                    attCell.alignment = { horizontal: 'center', vertical: 'middle' };
                    attCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                    attCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    ['Sakit', 'Izin', 'Alpa'].forEach((label, idx) => {
                        const col = getExcelCol(attendanceStartIdx + idx);
                        const cell = worksheet.getCell(`${col}7`);
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
                        worksheet.mergeCells(`${startEkskulCol}4:${endEkskulCol}4`);
                        const ekskulCell = worksheet.getCell(`${startEkskulCol}4`);
                        ekskulCell.value = 'EKSTRA KURIKULER';
                        ekskulCell.font = { bold: true };
                        ekskulCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        ekskulCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                        ekskulCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        ekskulList.forEach((ekskul: any, idx: number) => {
                            const col = getExcelCol(ekskulStartIdx + idx);
                            worksheet.mergeCells(`${col}5:${col}7`);
                            const cell = worksheet.getCell(`${col}5`);
                            cell.value = ekskul.name;
                            cell.font = { bold: true, size: 9 };
                            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99FFD6' } };
                            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });
                    }

                    // Student data
                    students.forEach((siswa: any, index: number) => {
                        const rowNum = 8 + index;
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
                    const keteranganStartRow = 8 + students.length + 2;
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
                    a.download = `Leger_Nilai_${kelasInfo.nm_kelas.replace(/\s+/g, '_')}.xlsx`;
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

    // Filter kelas based on user level
    const filteredKelas = kelasData.kelas.filter((kelas) => {
        // Filter by jenis_rombel (only regular classes: 1 and 9)
        const jenis = Number(kelas.jenis_rombel);
        const isRegularClass = jenis === 1 || jenis === 9;

        if (user?.level === 'Admin') return isRegularClass;
        return kelas.ptk_id === user?.ptk_id && isRegularClass;
    });

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leger Rapor</h1>
                    <p className="text-muted-foreground mt-1">
                        Generate file Excel Leger Nilai Rapor siswa
                    </p>
                </div>
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pilih Kelas</CardTitle>
                    <CardDescription>
                        Pilih kelas untuk generate Leger Nilai Rapor
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Kelas</label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between"
                                >
                                    {selectedKelas
                                        ? `${selectedKelas} (${filteredKelas.find(k => k.nm_kelas === selectedKelas)?.jumlah_siswa || 0} siswa)`
                                        : 'Pilih kelas'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start" avoidCollisions={false} sideOffset={4}>
                                <Command>
                                    <CommandInput placeholder="Cari kelas..." />
                                    <CommandList>
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
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${selectedKelas === kelas.nm_kelas ? 'opacity-100' : 'opacity-0'}`}
                                                        />
                                                        {kelas.nm_kelas} ({kelas.jumlah_siswa || 0} siswa)
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        onClick={handleGenerateAllExcel}
                        disabled={isGeneratingAll || isGenerating || filteredKelas.length === 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        size="lg"
                    >
                        {isGeneratingAll ? (
                            <>
                                <Download className="mr-2 h-4 w-4 animate-spin" />
                                Generating ({bulkProgress.current}/{bulkProgress.total})...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Generate Semua Kelas ({filteredKelas.length} kelas)
                            </>
                        )}
                    </Button>

                    {isGeneratingAll && bulkProgress.currentClass && (
                        <div className="text-sm text-center text-muted-foreground">
                            Sedang memproses: {bulkProgress.currentClass}
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                atau per kelas
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={handleGenerateExcel}
                        disabled={!selectedKelas || isGenerating || isGeneratingAll}
                        className="w-full"
                        size="lg"
                    >
                        {isGenerating ? (
                            <>
                                <Download className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Generate Excel
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
