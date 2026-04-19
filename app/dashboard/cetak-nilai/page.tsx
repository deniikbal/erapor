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
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Nilai Rapor',
            description: 'Generate PDF nilai rapor siswa per semester',
            icon: GraduationCap,
            href: '/dashboard/cetak-nilai/nilai-rapor',
            color: 'text-indigo-700',
            bgColor: 'bg-indigo-50',
        },
        {
            title: 'Leger Rapor',
            description: 'Generate file Excel ringkasan nilai satu kelas',
            icon: FileText,
            href: '/dashboard/cetak-nilai/leger-rapor',
            color: 'text-slate-700',
            bgColor: 'bg-slate-50',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pl-1">
                <h1 className="text-2xl font-black tracking-tight text-[#1e3a8a] uppercase">Cetak Dokumen Rapor</h1>
                <p className="text-[13px] text-slate-500 font-medium italic">
                    Pilih jenis dokumen atau laporan yang ingin Anda unduh dan cetak.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {submenuItems.map((item) => (
                    <Link key={item.title} href={item.href}>
                        <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-md bg-white hover:ring-2 hover:ring-[#1e3a8a]/20 h-full overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                        <item.icon className={`h-6 w-6 ${item.color}`} />
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </div>
                                <CardTitle className="mt-4 text-[16px] font-black text-[#1e3a8a] uppercase tracking-wide group-hover:translate-x-1 transition-transform">{item.title}</CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">
                                    {item.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 pb-6">
                                <div className="h-1 w-12 bg-blue-100 group-hover:w-full transition-all duration-500 rounded-full" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Information Card */}
            <Card className="rounded-sm shadow-sm border border-blue-50 bg-slate-50/30">
                <CardHeader className="py-4 px-6 border-b border-blue-50 bg-white">
                    <CardTitle className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest">Panduan Pencetakan</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-3 bg-white p-4 rounded-md shadow-sm border border-slate-100">
                            <h4 className="text-xs font-black flex items-center gap-2 text-blue-700 uppercase">
                                <FileText className="h-3.5 w-3.5" />
                                Pelengkap Rapor
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Digunakan untuk mencetak Cover, Data Sekolah, Identitas Siswa, dan Keterangan Pindah/Keluar.
                            </p>
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-md shadow-sm border border-slate-100">
                            <h4 className="text-xs font-black flex items-center gap-2 text-indigo-700 uppercase">
                                <GraduationCap className="h-3.5 w-3.5" />
                                Nilai Rapor
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Mencetak lembar nilai capaian kompetensi siswa per semester dengan format standar Kurikulum Merdeka.
                            </p>
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-md shadow-sm border border-slate-100">
                            <h4 className="text-xs font-black flex items-center gap-2 text-slate-700 uppercase">
                                <FileText className="h-3.5 w-3.5" />
                                Leger Rapor
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Ekspor seluruh nilai satu kelas ke dalam format Excel untuk mempermudah analisis dan rekapitulasi nilai.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
