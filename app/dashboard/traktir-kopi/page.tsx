'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Download, Copy, Check, Heart, Sparkles, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function TraktirKopiPage() {
    const [copied, setCopied] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Nomor referensi QRIS statis (bisa diubah sesuai kebutuhan)
    const qrisNote = 'Dukungan untuk pengembangan ERAP+';

    const handleDownload = async () => {
        try {
            const response = await fetch('/img/qris.png');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'qris-traktir-kopi.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('QRIS berhasil diunduh');
        } catch (error) {
            toast.error('Gagal mengunduh gambar QRIS');
            console.error('Download error:', error);
        }
    };

    const handleCopyNote = async () => {
        try {
            await navigator.clipboard.writeText(qrisNote);
            setCopied(true);
            toast.success('Catatan disalin');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Gagal menyalin catatan');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
                    <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase flex items-center gap-2">
                        <Coffee className="h-5 w-5 text-[#1e3a8a]" />
                        Traktir Kopi
                    </h1>
                </div>
                <p className="text-slate-500 text-[11px] ml-3 italic">
                    Dukung pengembangan ERAP+ dengan traktir kopi untuk developer ☕
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Main QRIS Card */}
                <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white md:col-span-2">
                    <CardHeader className="py-3 px-5 bg-blue-50/50 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                                <QrCode className="h-4 w-4 text-[#1e3a8a]" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">
                                    Scan QRIS untuk Traktir Kopi
                                </CardTitle>
                                <CardDescription className="text-[10px] text-slate-500 italic">
                                    Buka aplikasi e-wallet Anda, lalu pindai kode QR di bawah
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        {/* QRIS Image Container */}
                        <div className="relative bg-white p-4 rounded-lg border-2 border-blue-200 shadow-inner">
                            <div className="absolute -top-3 -left-3 bg-[#1e3a8a] text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                                <Sparkles className="h-2.5 w-2.5" />
                                QRIS
                            </div>
                            {imgError ? (
                                <div className="w-[320px] h-[320px] flex flex-col items-center justify-center bg-slate-50 rounded border border-dashed border-slate-300 text-slate-400 gap-2">
                                    <Coffee className="h-12 w-12" />
                                    <p className="text-[11px] font-medium">Gambar QRIS tidak ditemukan</p>
                                    <p className="text-[10px] italic">Letakkan file di public/img/qris.png</p>
                                </div>
                            ) : (
                                <div className="relative w-[320px] h-[320px]">
                                    <Image
                                        src="/img/qris.png"
                                        alt="QRIS untuk Traktir Kopi"
                                        fill
                                        priority
                                        className="object-contain"
                                        onError={() => setImgError(true)}
                                        sizes="(max-width: 768px) 100vw, 320px"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-6 justify-center">
                            <Button
                                onClick={handleDownload}
                                size="sm"
                                className="h-9 text-[11px] font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white"
                            >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                UNDUH QRIS
                            </Button>
                            <Button
                                onClick={handleCopyNote}
                                size="sm"
                                variant="outline"
                                className="h-9 text-[11px] font-bold border-blue-300 text-[#1e3a8a] hover:bg-blue-50"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5 mr-1.5" />
                                        TERSALIN
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                        SALIN CATATAN
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Note */}
                        <div className="mt-4 w-full max-w-md">
                            <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Catatan (opsional)
                                </div>
                                <p className="text-[11px] text-slate-700 italic">
                                    "{qrisNote}"
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Side Info Card */}
                <div className="space-y-4">
                    {/* Why Support Card */}
                    <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
                            <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-[#1e3a8a]" />
                                <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
                                    Mengapa Traktir Kopi?
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2.5">
                            <div className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#1e3a8a] mt-1.5 shrink-0" />
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    ERAP+ dikembangkan secara independen untuk membantu sekolah.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#1e3a8a] mt-1.5 shrink-0" />
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Dukungan Anda membantu pengembangan fitur baru & perbaikan bug.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#1e3a8a] mt-1.5 shrink-0" />
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Setiap kopi yang Anda traktirkan sangat berarti bagi kami. ☕
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supported E-Wallet Card */}
                    <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-[#1e3a8a]" />
                                <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
                                    E-Wallet yang Didukung
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                                {['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'QRIS'].map((wallet) => (
                                    <div
                                        key={wallet}
                                        className="flex items-center justify-center py-2 px-2 bg-blue-50/50 rounded border border-blue-100 text-[10px] font-bold text-[#1e3a8a] uppercase tracking-wide"
                                    >
                                        {wallet}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400 italic mt-3 text-center">
                                *Semua aplikasi yang mendukung QRIS dapat digunakan
                            </p>
                        </CardContent>
                    </Card>

                    {/* Thank You Card */}
                    <Card className="rounded-sm border-none shadow-sm overflow-hidden bg-[#1e3a8a] text-white">
                        <CardContent className="p-4 text-center">
                            <Coffee className="h-8 w-8 mx-auto mb-2" />
                            <h3 className="text-sm font-black uppercase tracking-wider">Terima Kasih!</h3>
                            <p className="text-[10px] mt-1 italic opacity-90">
                                Setiap dukungan Anda sangat berarti bagi pengembangan ERAP+
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
