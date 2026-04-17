'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Building2, MapPin, Phone, Mail, Globe, User, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DataSekolahPage() {
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nm_kepsek: '',
    nip_kepsek: '',
  });

  useEffect(() => {
    const fetchSekolah = async () => {
      try {
        const response = await fetch('/api/sekolah');
        const data = await response.json();

        if (!response.ok || data.error) {
          setError(data.error || 'Gagal mengambil data sekolah');
          return;
        }

        setSekolah(data.sekolah);
      } catch (err) {
        setError('Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchSekolah();
  }, []);

  const handleEditClick = () => {
    if (sekolah) {
      setFormData({
        nm_kepsek: sekolah.nm_kepsek || '',
        nip_kepsek: sekolah.nip_kepsek || '',
      });
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

    setIsSaving(true);
    setModalError('');

    try {
      const response = await fetch('/api/sekolah', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sekolah_id: sekolah.sekolah_id,
          nm_kepsek: formData.nm_kepsek.trim(),
          nip_kepsek: formData.nip_kepsek.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data.error || 'Gagal mengupdate data';
        setModalError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Update local state
      setSekolah(data.sekolah);
      setIsModalOpen(false);

      // Show success toast
      toast.success('Data kepala sekolah berhasil diupdate', {
        description: `${formData.nm_kepsek} - ${formData.nip_kepsek}`,
      });
    } catch (err) {
      const errorMessage = 'Terjadi kesalahan saat menyimpan data';
      setModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
            <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">Data Sekolah</h1>
          </div>
          <p className="text-slate-500 text-[11px] ml-3 italic">Memuat informasi profil sekolah...</p>
        </div>
        <Card className="rounded-sm border border-blue-100 shadow-sm animate-pulse">
          <CardHeader className="py-3">
            <Skeleton className="h-4 w-48 bg-slate-100" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full bg-slate-50" />
            <Skeleton className="h-10 w-full bg-slate-50" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sekolah</h1>
          <p className="text-muted-foreground">Informasi lengkap tentang sekolah</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!sekolah) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sekolah</h1>
          <p className="text-muted-foreground">Informasi lengkap tentang sekolah</p>
        </div>
        <Alert>
          <AlertDescription>Data sekolah tidak ditemukan</AlertDescription>
        </Alert>
      </div>
    );
  }

  const InfoItem = ({ label, value }: { label: string; value: string | null }) => (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className="text-xs font-semibold text-[#1e3a8a]">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Data Sekolah
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          Informasi lengkap profil dan identitas sekolah.
        </p>
      </div>

      {/* Informasi Umum */}
      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Informasi Umum</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Nama Sekolah" value={sekolah.nama} />
            <InfoItem label="NPSN" value={sekolah.npsn} />
            <InfoItem label="NSS" value={sekolah.nss ? sekolah.nss.trim() : null} />
            <InfoItem label="Jenjang" value={sekolah.jenjang} />
          </div>
        </CardContent>
      </Card>

      {/* Alamat & Kontak */}
      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Alamat & Kontak</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2 lg:col-span-3 pb-2 border-b border-slate-50">
              <InfoItem label="Alamat" value={sekolah.alamat} />
            </div>
            <InfoItem label="Kelurahan" value={sekolah.kelurahan} />
            <InfoItem label="Kecamatan" value={sekolah.kecamatan} />
            <InfoItem label="Kota/Kab" value={sekolah.kab_kota} />
            <InfoItem label="Provinsi" value={sekolah.propinsi} />
            <InfoItem label="Kode Pos" value={sekolah.kd_pos} />
            <div />

            <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2 pt-2">
               <div className="h-[1px] flex-1 bg-slate-100" />
               <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Informasi Kontak</span>
               <div className="h-[1px] flex-1 bg-slate-100" />
            </div>

            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded border border-blue-50">
              <Phone className="h-3.5 w-3.5 text-[#1e3a8a] shrink-0" />
              <InfoItem label="Telepon" value={sekolah.telepon} />
            </div>
            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded border border-blue-50">
              <Phone className="h-3.5 w-3.5 text-[#1e3a8a] shrink-0" />
              <InfoItem label="Fax" value={sekolah.fax} />
            </div>
            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded border border-blue-50">
              <Mail className="h-3.5 w-3.5 text-[#1e3a8a] shrink-0" />
              <InfoItem label="Email" value={sekolah.email} />
            </div>
            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded border border-blue-50 lg:col-span-3">
              <Globe className="h-3.5 w-3.5 text-[#1e3a8a] shrink-0" />
              <InfoItem label="Website" value={sekolah.website} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kepala Sekolah */}
      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Kepala Sekolah</CardTitle>
          </div>
          <Button 
            onClick={handleEditClick} 
            size="sm" 
            variant="outline" 
            className="h-7 text-[10px] font-black border-blue-100 text-[#1e3a8a] bg-white transition-all uppercase"
          >
            <Pencil className="h-3 w-3 mr-1.5" />
            EDIT DATA
          </Button>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Nama Kepsek" value={sekolah.nm_kepsek} />
            <InfoItem label="NIP" value={sekolah.nip_kepsek} />
            {sekolah.niy_kepsek && <InfoItem label="NIY" value={sekolah.niy_kepsek} />}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Data Kepala Sekolah</DialogTitle>
            <DialogDescription>
              Update informasi kepala sekolah. Klik simpan untuk menyimpan perubahan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nm_kepsek">Nama Kepala Sekolah</Label>
              <Input
                id="nm_kepsek"
                placeholder="Masukkan nama kepala sekolah"
                value={formData.nm_kepsek}
                onChange={(e) => setFormData({ ...formData, nm_kepsek: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nip_kepsek">NIP Kepala Sekolah</Label>
              <Input
                id="nip_kepsek"
                placeholder="Masukkan NIP kepala sekolah"
                value={formData.nip_kepsek}
                onChange={(e) => setFormData({ ...formData, nip_kepsek: e.target.value })}
                disabled={isSaving}
              />
            </div>

            {modalError && (
              <Alert variant="destructive">
                <AlertDescription>{modalError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveKepsek}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
