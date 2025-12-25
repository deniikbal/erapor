'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileSpreadsheet, Download } from 'lucide-react';
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

    // Filter kelas based on user level
    const filteredKelas = kelasData.kelas.filter((kelas) => {
        if (user?.level === 'Admin') return true;
        return kelas.ptk_id === user?.ptk_id;
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
                        <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih kelas" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredKelas.map((kelas) => (
                                    <SelectItem key={kelas.rombongan_belajar_id} value={kelas.nm_kelas}>
                                        {kelas.nm_kelas} ({kelas.jumlah_siswa || 0} siswa)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={handleGenerateExcel}
                        disabled={!selectedKelas || isGenerating}
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
