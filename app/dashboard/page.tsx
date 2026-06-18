'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth-client';
import type { User } from '@/lib/db';
import {
  GraduationCap,
  UserCheck,
  BookOpen,
  FileText,
  RefreshCw,
  School,
  Calendar,
  Printer,
  ArrowRight,
  Rocket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalSiswa: number;
  totalGuru: number;
  totalKelas: number;
}

interface SyncStatus {
  hasEverSynced: boolean;
  relativeTime: string | null;
  formattedTimestamp: string | null;
  status: 'success' | 'failed' | 'error' | null;
  tablesSynced: number | null;
  recordsProcessed: number | null;
  durationMs: number | null;
  user: string | null;
  message: string | null;
  loading: boolean;
  error: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    hasEverSynced: false,
    relativeTime: null,
    formattedTimestamp: null,
    status: null,
    tablesSynced: null,
    recordsProcessed: null,
    durationMs: null,
    user: null,
    message: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const [siswaRes, guruRes, kelasRes] = await Promise.all([
          fetch('/api/siswa'),
          fetch('/api/guru'),
          fetch('/api/kelas')
        ]);

        const siswaData = await siswaRes.json();
        const guruData = await guruRes.json();
        const kelasData = await kelasRes.json();

        setStats({
          totalSiswa: siswaData.siswa?.length || 0,
          totalGuru: guruData.guru?.length || 0,
          totalKelas: kelasData.kelas?.length || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Fetch last sync status from Neon
    const fetchSyncStatus = async () => {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' });
        if (!res.ok) {
          setSyncStatus(prev => ({ ...prev, loading: false, error: true }));
          return;
        }
        const data = await res.json();
        setSyncStatus({
          hasEverSynced: data.hasEverSynced ?? false,
          relativeTime: data.relativeTime ?? null,
          formattedTimestamp: data.formattedTimestamp ?? null,
          status: data.metadata?.last_sync_status ?? null,
          tablesSynced: data.metadata?.last_tables_synced ?? null,
          recordsProcessed: data.metadata?.last_records_processed ?? null,
          durationMs: data.metadata?.last_sync_duration_ms ?? null,
          user: data.metadata?.last_sync_by ?? null,
          message: data.metadata?.last_sync_message ?? null,
          loading: false,
          error: false,
        });
      } catch (err) {
        console.error('Error fetching sync status:', err);
        setSyncStatus(prev => ({ ...prev, loading: false, error: true }));
      }
    };

    fetchSyncStatus();
  }, []);

  const statisticsCards = [
    {
      title: 'Total Siswa',
      value: loading ? '...' : stats.totalSiswa.toLocaleString(),
      description: 'Siswa terdaftar',
      icon: GraduationCap,
      iconColor: 'text-[#1e3a8a]',
      bgColor: 'bg-blue-50',
      href: '/dashboard/siswa'
    },
    {
      title: 'Total Guru',
      value: loading ? '...' : stats.totalGuru.toLocaleString(),
      description: 'Guru aktif',
      icon: UserCheck,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      href: '/dashboard/guru'
    },
    {
      title: 'Total Kelas',
      value: loading ? '...' : stats.totalKelas.toLocaleString(),
      description: 'Rombongan belajar',
      icon: BookOpen,
      iconColor: 'text-blue-700',
      bgColor: 'bg-slate-100',
      href: '/dashboard/referensi/kelas'
    },
  ];

  const quickAccessAdmin = [
    {
      title: 'Data Sekolah',
      description: 'Kelola informasi sekolah',
      icon: School,
      href: '/dashboard/referensi/sekolah',
      color: 'text-blue-700'
    },
    {
      title: 'Sync Data',
      description: 'Sinkronisasi database',
      icon: RefreshCw,
      href: '/dashboard/sync',
      color: 'text-indigo-700'
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap raport siswa',
      icon: Printer,
      href: '/dashboard/admin-cetak-nilai/pelengkap-raport',
      color: 'text-blue-900'
    },
    {
      title: 'Tanggal Rapor',
      description: 'Atur tanggal rapor',
      icon: Calendar,
      href: '/dashboard/referensi/tanggalrapor',
      color: 'text-blue-800'
    },
  ];

  const quickAccessGuru = [
    {
      title: 'Input Nilai',
      description: 'Input nilai siswa',
      icon: FileText,
      href: '/dashboard/nilai',
      color: 'text-blue-700'
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap & nilai rapor siswa',
      icon: Printer,
      href: '/dashboard/cetak-nilai',
      color: 'text-indigo-700'
    },
    {
      title: 'Update Data Siswa',
      description: 'Lengkapi data siswa',
      icon: GraduationCap,
      href: '/dashboard/guru-input/update-data-siswa',
      color: 'text-blue-800'
    },
    {
      title: 'Raport',
      description: 'Lihat raport siswa',
      icon: FileText,
      href: '/dashboard/nilai/raport',
      color: 'text-blue-900'
    },
  ];

  const quickAccess = user?.level === 'Admin' ? quickAccessAdmin : quickAccessGuru;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-[#1e3a8a] rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-[#1e3a8a] uppercase">
            Selamat datang, {user?.nama || 'User'}!
          </h1>
        </div>
        <p className="text-slate-500 text-[11px] ml-3 italic">
          {user?.level === 'Admin'
            ? 'Dashboard Administrator - Kelola data sekolah dan sinkronisasi database'
            : 'Dashboard Guru - Kelola nilai dan data siswa Anda'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {statisticsCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer rounded-sm border-none shadow-sm bg-white overflow-hidden group">
              <div className="h-1 bg-[#1e3a8a] opacity-80 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2.5 px-3">
                <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.title}</CardTitle>
                <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-blue-50`}>
                  <stat.icon className={`h-4 w-4 text-[#1e3a8a]`} />
                </div>
              </CardHeader>
              <CardContent className="py-1 px-3 pb-3">
                <div className="text-xl font-black text-[#1e3a8a]">{stat.value}</div>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5 italic">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Access */}
      <Card className="rounded-sm shadow-sm border border-blue-100 overflow-hidden bg-white mt-2">
        <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#1e3a8a]" />
            <CardTitle className="text-sm font-bold text-[#1e3a8a]">Akses Cepat</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickAccess.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer border-blue-50 bg-slate-50/30 group">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-blue-50 shadow-sm group-hover:scale-110 transition-transform`}>
                        <item.icon className={`h-4 w-4 text-[#1e3a8a]`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[11px] text-[#1e3a8a] truncate uppercase tracking-tight">{item.title}</h3>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">{item.description}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-[#1e3a8a] transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden">
          <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
            <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Informasi Sistem</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Username</span>
              <span className="text-[11px] font-black text-[#1e3a8a]">{user?.userid || '-'}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Level</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#1e3a8a] text-white">
                {user?.level || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Semester</span>
              <span className="text-[11px] font-black text-indigo-600 italic">2025/2026 Genap</span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status Card */}
        <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-[#1e3a8a]" />
              <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
                Status Sinkronisasi Database
              </CardTitle>
            </div>
            {user?.level === 'Admin' && (
              <Link href="/dashboard/sync">
                <Button size="sm" variant="outline" className="h-6 text-[10px] font-bold">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  SINKRON SEKARANG
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {syncStatus.loading ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded border border-slate-100">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-[11px] text-slate-500 italic">Memuat status sinkronisasi...</span>
              </div>
            ) : syncStatus.error ? (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-100">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-[11px] text-red-700 italic">
                  Tidak dapat memuat status sinkronisasi
                </span>
              </div>
            ) : !syncStatus.hasEverSynced ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-[11px] text-amber-700 italic">
                  Belum pernah melakukan sinkronisasi.{' '}
                  {user?.level === 'Admin' && (
                    <Link href="/dashboard/sync" className="font-bold underline">
                      Sinkron sekarang
                    </Link>
                  )}
                </span>
              </div>
            ) : (
              <>
                {/* Last sync time - main info */}
                <div className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                  {syncStatus.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Sinkronisasi Terakhir</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          syncStatus.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {syncStatus.status === 'success' ? 'BERHASIL' : 'GAGAL'}
                      </span>
                    </div>
                    <div className="text-[12px] font-black text-[#1e3a8a] mt-0.5">
                      {syncStatus.relativeTime || syncStatus.formattedTimestamp}
                    </div>
                    {syncStatus.formattedTimestamp && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        {syncStatus.formattedTimestamp}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Tabel</div>
                    <div className="text-[12px] font-black text-[#1e3a8a]">
                      {syncStatus.tablesSynced ?? 0}
                    </div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Record</div>
                    <div className="text-[12px] font-black text-indigo-600">
                      {(syncStatus.recordsProcessed ?? 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Durasi</div>
                    <div className="text-[12px] font-black text-slate-700">
                      {syncStatus.durationMs != null
                        ? syncStatus.durationMs < 1000
                          ? `${syncStatus.durationMs} ms`
                          : `${(syncStatus.durationMs / 1000).toFixed(1)} dtk`
                        : '-'}
                    </div>
                  </div>
                </div>

                {syncStatus.user && (
                  <div className="text-[10px] text-slate-400 italic px-1">
                    Dilakukan oleh: <span className="font-bold text-slate-600">{syncStatus.user}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm border border-blue-100 shadow-sm overflow-hidden">
          <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b">
            <CardTitle className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Panduan Cepat</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 border-r border-slate-100 pr-2">
              <h4 className="text-[11px] font-black text-[#1e3a8a] flex items-center gap-1 uppercase">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> Admin
              </h4>
              <ul className="text-[10px] text-slate-500 space-y-1 ml-3 list-disc">
                <li>Kelola referensi & sinkronisasi database</li>
                <li>Cetak pelengkap raport semua kelas</li>
                <li>Monitoring progres penilaian guru</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black text-indigo-700 flex items-center gap-1 uppercase">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> Guru
              </h4>
              <ul className="text-[10px] text-slate-500 space-y-1 ml-3 list-disc">
                <li>Input nilai per mata pelajaran & ekstrakurikuler</li>
                <li>Lengkapi data siswa untuk wali kelas</li>
                <li>Cetak raport kelas dan lihat histori peringkat</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
