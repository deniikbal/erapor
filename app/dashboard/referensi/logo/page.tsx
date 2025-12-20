'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Logo } from '@/lib/db';
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Sekolah {
  sekolah_id: string;
  nama: string;
  npsn: string | null;
}

export default function DataLogoPage() {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [selectedSekolahId, setSelectedSekolahId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Preview states
  const [previewPemda, setPreviewPemda] = useState<string | null>(null);
  const [previewSek, setPreviewSek] = useState<string | null>(null);
  const [previewTtd, setPreviewTtd] = useState<string | null>(null);
  const [previewKop, setPreviewKop] = useState<string | null>(null);

  // File states
  const [filePemda, setFilePemda] = useState<File | null>(null);
  const [fileSek, setFileSek] = useState<File | null>(null);
  const [fileTtd, setFileTtd] = useState<File | null>(null);
  const [fileKop, setFileKop] = useState<File | null>(null);

  // Image error states
  const [imageErrors, setImageErrors] = useState({
    pemda: false,
    sek: false,
    ttd: false,
    kop: false,
  });

  useEffect(() => {
    fetchSekolah();
    fetchLogo();
  }, []);

  const fetchSekolah = async () => {
    try {
      const response = await fetch('/api/sekolah/list');
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('Error fetching sekolah:', data);
        return;
      }

      setSekolahList(data.sekolah || []);
      
      // Set default selected sekolah if only one
      if (data.sekolah && data.sekolah.length === 1) {
        setSelectedSekolahId(data.sekolah[0].sekolah_id);
      }
    } catch (err) {
      console.error('Fetch sekolah error:', err);
    }
  };

  const fetchLogo = async () => {
    try {
      const response = await fetch('/api/logo');
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Gagal mengambil data logo');
        return;
      }

      setLogo(data.logo);
      
      // Set selected sekolah_id from logo data
      if (data.logo && data.logo.sekolah_id) {
        setSelectedSekolahId(data.logo.sekolah_id);
      }
    } catch (err) {
      console.error('Fetch logo error:', err);
      setError('Gagal mengambil data logo');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'pemda' | 'sek' | 'ttd' | 'kop'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      switch (type) {
        case 'pemda':
          setPreviewPemda(result);
          setFilePemda(file);
          break;
        case 'sek':
          setPreviewSek(result);
          setFileSek(file);
          break;
        case 'ttd':
          setPreviewTtd(result);
          setFileTtd(file);
          break;
        case 'kop':
          setPreviewKop(result);
          setFileKop(file);
          break;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSekolahId) {
      toast.error('Pilih sekolah terlebih dahulu');
      return;
    }

    if (!filePemda && !fileSek && !fileTtd && !fileKop) {
      toast.error('Pilih minimal satu file untuk diupload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Add sekolah_id to form data
      formData.append('sekolah_id', selectedSekolahId);
      
      if (filePemda) formData.append('logo_pemda', filePemda);
      if (fileSek) formData.append('logo_sek', fileSek);
      if (fileTtd) formData.append('ttd_kepsek', fileTtd);
      if (fileKop) formData.append('kop_sekolah', fileKop);

      console.log('Uploading with sekolah_id:', selectedSekolahId);

      const response = await fetch('/api/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        toast.error(data.error || 'Gagal upload logo');
        return;
      }

      toast.success('Logo berhasil diupload');
      
      // Reset file inputs and previews
      setFilePemda(null);
      setFileSek(null);
      setFileTtd(null);
      setFileKop(null);
      setPreviewPemda(null);
      setPreviewSek(null);
      setPreviewTtd(null);
      setPreviewKop(null);
      
      // Reset error states
      setImageErrors({ pemda: false, sek: false, ttd: false, kop: false });
      
      // Refresh data
      fetchLogo();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  const renderImagePreview = (
    currentPath: string | null,
    previewData: string | null,
    label: string,
    errorKey: 'pemda' | 'sek' | 'ttd' | 'kop'
  ) => {
    // Use preview if available, otherwise use current path
    const imageSrc = previewData || (currentPath ? `/${currentPath}` : null);
    const hasError = imageErrors[errorKey];

    return (
      <div className="space-y-2">
        {imageSrc && !hasError ? (
          <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
            <Image
              src={imageSrc}
              alt={label}
              fill
              className="object-contain p-2"
              unoptimized
              onError={() => {
                console.log('Image load error:', imageSrc);
                setImageErrors(prev => ({ ...prev, [errorKey]: true }));
              }}
            />
          </div>
        ) : (
          <div className="w-full h-48 border rounded-lg flex items-center justify-center bg-gray-50">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {currentPath && hasError ? (
                  <>File tidak ditemukan<br/><span className="text-xs">Silakan upload ulang</span></>
                ) : (
                  `Belum ada ${label}`
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Logo</h1>
          <p className="text-muted-foreground">Kelola logo sekolah dan pemda</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Logo</h1>
          <p className="text-muted-foreground">Kelola logo sekolah dan pemda</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Logo</h1>
        <p className="text-muted-foreground">Kelola logo sekolah dan pemda</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <CardTitle>Upload Logo</CardTitle>
            </div>
            <CardDescription>
              Upload logo pemda, logo sekolah, tanda tangan kepala sekolah, dan kop sekolah
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sekolah Selector */}
            <div className="space-y-2">
              <Label htmlFor="sekolah_id">Pilih Sekolah *</Label>
              <Select value={selectedSekolahId} onValueChange={setSelectedSekolahId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sekolah" />
                </SelectTrigger>
                <SelectContent>
                  {sekolahList.map((sekolah) => (
                    <SelectItem key={sekolah.sekolah_id} value={sekolah.sekolah_id}>
                      {sekolah.nama} {sekolah.npsn ? `(${sekolah.npsn})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Pemda */}
              <div className="space-y-3">
                <Label htmlFor="logo_pemda">Logo Pemda</Label>
                {renderImagePreview(logo?.logo_pemda || null, previewPemda, 'Logo Pemda', 'pemda')}
                <Input
                  id="logo_pemda"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'pemda')}
                  disabled={uploading}
                />
              </div>

              {/* Logo Sekolah */}
              <div className="space-y-3">
                <Label htmlFor="logo_sek">Logo Sekolah</Label>
                {renderImagePreview(logo?.logo_sek || null, previewSek, 'Logo Sekolah', 'sek')}
                <Input
                  id="logo_sek"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'sek')}
                  disabled={uploading}
                />
              </div>

              {/* TTD Kepala Sekolah */}
              <div className="space-y-3">
                <Label htmlFor="ttd_kepsek">Tanda Tangan Kepala Sekolah</Label>
                {renderImagePreview(logo?.ttd_kepsek || null, previewTtd, 'TTD Kepala Sekolah', 'ttd')}
                <Input
                  id="ttd_kepsek"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'ttd')}
                  disabled={uploading}
                />
              </div>

              {/* Kop Sekolah */}
              <div className="space-y-3">
                <Label htmlFor="kop_sekolah">Kop Sekolah</Label>
                {renderImagePreview(logo?.kop_sekolah || null, previewKop, 'Kop Sekolah', 'kop')}
                <Input
                  id="kop_sekolah"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'kop')}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
