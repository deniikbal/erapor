'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Sekolah } from '@/lib/db';
import { Building2, MapPin, Phone, Mail, Globe, User, Pencil, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DataSekolahPage() {
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({ nm_kepsek: '', nip_kepsek: '' });

  useEffect(() => {
    const fetchSekolah = async () => {
      try {
        const response = await fetch('/api/sekolah');
        const data = await response.json();
        if (!response.ok || data.error) { setError(data.error || 'Gagal mengambil data sekolah'); return; }
        setSekolah(data.sekolah);
      } catch { setError('Terjadi kesalahan saat mengambil data'); }
      finally { setLoading(false); }
    };
    fetchSekolah();
  }, []);

  const handleEditClick = () => {
    if (sekolah) {
      setFormData({ nm_kepsek: sekolah.nm_kepsek || '', nip_kepsek: sekolah.nip_kepsek || '' });
      setModalError('');
      setIsModalOpen(true);
    }
  };

  const handleSaveKepsek = async () => {
    if (!sekolah) return;
    if (!formData.nm_kepsek.trim() || !formData.nip_kepsek.trim()) {
      setModalError('Nama dan NIP kepala sekolah harus diisi');
      toast.error('Nama dan NIP kepala sekolah harus diisi');
      return;
    }
    setIsSaving(true); setModalError('');
    try {
      const response = await fetch('/api/sekolah', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sekolah_id: sekolah.sekolah_id, nm_kepsek: formData.nm_kepsek.trim(), nip_kepsek: formData.nip_kepsek.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) { setModalError(data.error || 'Gagal mengupdate data'); toast.error(data.error || 'Gagal mengupdate data'); return; }
      setSekolah(data.sekolah);
      setIsModalOpen(false);
      toast.success('Data kepala sekolah berhasil diupdate', { description: `${formData.nm_kepsek} - ${formData.nip_kepsek}` });
    } catch { setModalError('Terjadi kesalahan saat menyimpan data'); toast.error('Terjadi kesalahan saat menyimpan data'); }
    finally { setIsSaving(false); }
  };

  const InfoItem = ({ label, value }: { label: string; value: string | null }) => (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-[12px] font-semibold text-[#1e3a8a]">{value || '-'}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <Skeleton className="h-4 w-24 bg-white/20 mb-2" />
          <Skeleton className="h-8 w-48 bg-white/20 mb-1" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
        <div className="rounded-xl border border-slate-100 bg-white shadow-md p-4 space-y-3 animate-pulse">
          <Skeleton className="h-4 w-32 bg-slate-100" />
          <Skeleton className="h-10 w-full bg-slate-50" />
          <Skeleton className="h-10 w-full bg-slate-50" />
        </div>
      </div>
    );
  }

  if (error || !sekolah) {
    return (
      <div className="space-y-6 pb-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
          <h1 className="text-2xl font-black text-white">Data Sekolah</h1>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 shadow-md">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-[12px] text-red-700">{error || 'Data sekolah tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-20 h-28 w-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/80">Referensi</p>
          <h1 className="mt-1 text-2xl font-black text-white">Data Sekolah</h1>
          <p className="mt-1 text-sm text-blue-200/70">Informasi lengkap profil dan identitas sekolah.</p>
          {sekolah.nama && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5 text-blue-200" />
              <span className="text-[12px] font-bold text-white">{sekolah.nama}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Informasi Umum ── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <Building2 className="h-3.5 w-3.5 text-[#1e3a8a]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Informasi Umum</h3>
        </div>
        <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Nama Sekolah" value={sekolah.nama} />
          <InfoItem label="NPSN" value={sekolah.npsn} />
          <InfoItem label="NSS" value={sekolah.nss ? sekolah.nss.trim() : null} />
          <InfoItem label="Jenjang" value={sekolah.jenjang} />
        </div>
      </div>

      {/* ── Alamat & Kontak ── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <MapPin className="h-3.5 w-3.5 text-[#1e3a8a]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Alamat &amp; Kontak</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Alamat */}
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <InfoItem label="Alamat Lengkap" value={sekolah.alamat} />
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Kelurahan" value={sekolah.kelurahan} />
            <InfoItem label="Kecamatan" value={sekolah.kecamatan} />
            <InfoItem label="Kota/Kabupaten" value={sekolah.kab_kota} />
            <InfoItem label="Provinsi" value={sekolah.propinsi} />
            <InfoItem label="Kode Pos" value={sekolah.kd_pos} />
          </div>

          {/* divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Informasi Kontak</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Phone, label: 'Telepon', value: sekolah.telepon },
              { icon: Phone, label: 'Fax', value: sekolah.fax },
              { icon: Mail, label: 'Email', value: sekolah.email },
              { icon: Globe, label: 'Website', value: sekolah.website },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-lg border border-blue-50 bg-slate-50/50 p-3">
                <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e3a8a]" />
                <InfoItem label={item.label} value={item.value} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kepala Sekolah ── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#1e3a8a]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Kepala Sekolah</h3>
          </div>
          <Button
            onClick={handleEditClick}
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 border-blue-200 px-3 text-[10px] font-bold text-[#1e3a8a] hover:bg-blue-50 uppercase"
          >
            <Pencil className="h-3 w-3" />
            Edit Data
          </Button>
        </div>
        <div className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Nama Kepala Sekolah" value={sekolah.nm_kepsek} />
          <InfoItem label="NIP" value={sekolah.nip_kepsek} />
          {sekolah.niy_kepsek && <InfoItem label="NIY" value={sekolah.niy_kepsek} />}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Data Kepala Sekolah</DialogTitle>
            <DialogDescription>Update informasi kepala sekolah. Klik simpan untuk menyimpan perubahan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nm_kepsek">Nama Kepala Sekolah</Label>
              <Input id="nm_kepsek" placeholder="Masukkan nama kepala sekolah" value={formData.nm_kepsek} onChange={(e) => setFormData({ ...formData, nm_kepsek: e.target.value })} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nip_kepsek">NIP Kepala Sekolah</Label>
              <Input id="nip_kepsek" placeholder="Masukkan NIP kepala sekolah" value={formData.nip_kepsek} onChange={(e) => setFormData({ ...formData, nip_kepsek: e.target.value })} disabled={isSaving} />
            </div>
            {modalError && <Alert variant="destructive"><AlertDescription>{modalError}</AlertDescription></Alert>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Batal</Button>
            <Button type="button" onClick={handleSaveKepsek} disabled={isSaving} className="bg-[#1e3a8a] hover:bg-black text-white">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
