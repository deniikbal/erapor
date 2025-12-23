import { neon } from '@neondatabase/serverless';

export type User = {
  id: string;
  userid: string;
  password: string;
  nama: string;
  level: string; // Admin, Guru, atau Siswa
  salt?: string;
  email?: string;
  ptk_id?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
};

export type Sekolah = {
  sekolah_id: string;
  nama: string;
  npsn: string | null;
  nss: string | null;
  alamat: string | null;
  kd_pos: string | null;
  telepon: string | null;
  fax: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kab_kota: string | null;
  propinsi: string | null;
  website: string | null;
  email: string | null;
  nm_kepsek: string | null;
  nip_kepsek: string | null;
  niy_kepsek: string | null;
  status_kepemilikan_id: string | null;
  kode_aktivasi: string | null;
  jenjang: string | null;
  bentuk_pendidikan_id: number | null;
};

export type PTK = {
  ptk_id: string;
  nama: string;
  nip: string | null;
  jenis_ptk_id: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  nuptk: string | null;
  alamat_jalan: string | null;
  status_keaktifan_id: string;
  soft_delete: string;
  // Fields from tabel_ptk_pelengkap (LEFT JOIN)
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  ptk_pelengkap_id?: string | null;
};

export type Siswa = {
  peserta_didik_id: string;
  nis: string;
  nisn: string | null;
  nm_siswa: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  agama: string | null;
  alamat_siswa: string | null;
  telepon_siswa: string | null;
  diterima_tanggal: string | null;
  nm_ayah: string | null;
  nm_ibu: string | null;
  pekerjaan_ayah: string | null;
  pekerjaan_ibu: string | null;
  nm_wali: string | null;
  pekerjaan_wali: string | null;
  // Fields from tabel_siswa_pelengkap (LEFT JOIN)
  pelengkap_siswa_id?: string | null;
  status_dalam_kel?: string | null;
  anak_ke?: string | null;
  sekolah_asal?: string | null;
  diterima_kelas?: string | null;
  alamat_ortu?: string | null;
  telepon_ortu?: string | null;
  // Fields from tabel_kelas (LEFT JOIN)
  nm_kelas?: string | null;
  tingkat_pendidikan_id?: string | null;
};

export type Kelas = {
  rombongan_belajar_id: string;
  nm_kelas: string;
  jenis_rombel: number;
  tingkat_pendidikan_id: string | null;
  ptk_id: string | null;
  semester_id: string | null;
  // Fields from tabel_ptk (LEFT JOIN)
  nama_wali_kelas?: string | null;
  // Calculated field
  jumlah_siswa?: number;
};

export type Logo = {
  sekolah_id: string;
  logo_pemda: string | null;
  logo_sek: string | null;
  ttd_kepsek: string | null;
  kop_sekolah: string | null;
};

export type TanggalRapor = {
  tanggal_id: string;
  semester_id: string | null;
  tanggal: string | null;
  semester: string | null;
  tempat_ttd: string | null;
  status_kepsek?: string | null;
  status_nip_kepsek?: string | null;
  status_nip_walas?: string | null;
  ttd_validasi?: number | null;
};

export type Semester = {
  semester_id: string;
  tahun_ajaran_id: string;
  nama_semester: string;
  semester: string;
  periode_aktif: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
};

export type MarginSettings = {
  margin_id: string;
  ptk_id: string;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  created_at?: string;
  updated_at?: string;
};

export type Kehadiran = {
  kehadiran_id?: string;
  peserta_didik_id: string;
  semester_id?: string;
  sakit: number;
  izin: number;
  alpha: number;
};

export function getDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in environment variables');
  }

  // Configure Neon with longer timeout and fetch options
  return neon(process.env.DATABASE_URL, {
    fetchOptions: {
      // Increase timeout to 30 seconds (default is 15s)
      cache: 'no-store',
      // Add headers for better connection handling
    },
    // Enable connection pooling for better performance
    fullResults: false,
    arrayMode: false,
  });
}
