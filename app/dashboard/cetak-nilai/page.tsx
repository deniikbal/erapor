'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CetakNilaiPage() {
    const submenuItems = [
        {
            title: 'Pelengkap Rapor',
            description: 'Generate PDF identitas dan data pelengkap siswa',
            icon: FileText,
            href: '/dashboard/cetak-nilai/pelengkap-raport',
            color: 'text-purple-600',
            bgColor: 'bg-purple-500/10',
        },
        {
            title: 'Nilai Rapor',
            description: 'Generate PDF nilai rapor siswa per semester',
            icon: GraduationCap,
            href: '/dashboard/cetak-nilai/nilai-rapor',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cetak Nilai</h1>
                <p className="text-muted-foreground">
                    Pilih jenis dokumen yang ingin dicetak
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {submenuItems.map((item) => (
                    <Link key={item.title} href={item.href}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50 h-full">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.bgColor}`}>
                                        <item.icon className={`h-6 w-6 ${item.color}`} />
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <CardTitle className="mt-4">{item.title}</CardTitle>
                                <CardDescription className="text-sm">
                                    {item.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-primary">
                                    Buka halaman
                                    <ArrowRight className="ml-1 h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi</CardTitle>
                    <CardDescription>Panduan penggunaan menu cetak nilai</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            Pelengkap Rapor
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-6">
                            <li>Generate dokumen identitas siswa</li>
                            <li>Mencakup: Cover, Data Sekolah, Identitas Siswa, Keterangan Pindah & Masuk</li>
                            <li>Dapat dicetak per siswa atau semua siswa sekaligus</li>
                            <li>Pengaturan margin dapat disesuaikan</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-emerald-600" />
                            Nilai Rapor
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-6">
                            <li>Generate dokumen nilai rapor siswa</li>
                            <li>Mencakup nilai per mata pelajaran dan semester</li>
                            <li>Menampilkan nilai pengetahuan, keterampilan, dan sikap</li>
                            <li>Format sesuai dengan standar rapor Kurikulum Merdeka</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
