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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sekolah</h1>
          <p className="text-muted-foreground">Informasi lengkap tentang sekolah</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Sekolah</h1>
        <p className="text-muted-foreground">Informasi lengkap tentang sekolah</p>
      </div>

      {/* Informasi Umum */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Informasi Umum</CardTitle>
          </div>
          <CardDescription>Data identitas dan informasi dasar sekolah</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Nama Sekolah" value={sekolah.nama} />
            <InfoItem label="NPSN" value={sekolah.npsn} />
            <InfoItem label="NSS" value={sekolah.nss?.trim()} />
            <InfoItem label="Jenjang" value={sekolah.jenjang} />
          </div>
        </CardContent>
      </Card>

      {/* Alamat & Kontak */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Alamat & Kontak</CardTitle>
          </div>
          <CardDescription>Informasi lokasi dan kontak sekolah</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <InfoItem label="Alamat" value={sekolah.alamat} />
            </div>
            <InfoItem label="Kelurahan" value={sekolah.kelurahan} />
            <InfoItem label="Kecamatan" value={sekolah.kecamatan} />
            <InfoItem label="Kabupaten/Kota" value={sekolah.kab_kota} />
            <InfoItem label="Provinsi" value={sekolah.propinsi} />
            <InfoItem label="Kode Pos" value={sekolah.kd_pos} />
            <div />
            
            <Separator className="md:col-span-2" />
            
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <InfoItem label="Telepon" value={sekolah.telepon} />
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <InfoItem label="Fax" value={sekolah.fax} />
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <InfoItem label="Email" value={sekolah.email} />
            </div>
            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
              <InfoItem label="Website" value={sekolah.website} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kepala Sekolah */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Kepala Sekolah</CardTitle>
                <CardDescription>Informasi kepala sekolah</CardDescription>
              </div>
            </div>
            <Button onClick={handleEditClick} size="sm" variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Nama" value={sekolah.nm_kepsek} />
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
