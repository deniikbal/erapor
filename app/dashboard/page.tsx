'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Zap,
  User as UserIcon,
  BadgeCheck,
  Database,
  ChevronRight,
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
    totalKelas: 0,
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
    const fetchStats = async () => {
      try {
        const [siswaRes, guruRes, kelasRes] = await Promise.all([
          fetch('/api/siswa'),
          fetch('/api/guru'),
          fetch('/api/kelas'),
        ]);
        const siswaData = await siswaRes.json();
        const guruData = await guruRes.json();
        const kelasData = await kelasRes.json();
        setStats({
          totalSiswa: siswaData.siswa?.length || 0,
          totalGuru: guruData.guru?.length || 0,
          totalKelas: kelasData.kelas?.length || 0,
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
      value: loading ? null : stats.totalSiswa,
      description: 'Siswa terdaftar',
      icon: GraduationCap,
      gradient: 'from-blue-600 to-blue-800',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700',
      href: '/dashboard/siswa',
    },
    {
      title: 'Total Guru',
      value: loading ? null : stats.totalGuru,
      description: 'Guru aktif',
      icon: UserCheck,
      gradient: 'from-indigo-500 to-indigo-700',
      lightBg: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      href: '/dashboard/guru',
    },
    {
      title: 'Total Kelas',
      value: loading ? null : stats.totalKelas,
      description: 'Rombongan belajar',
      icon: BookOpen,
      gradient: 'from-slate-600 to-slate-800',
      lightBg: 'bg-slate-100',
      textColor: 'text-slate-700',
      href: '/dashboard/referensi/kelas',
    },
  ];

  const quickAccessAdmin = [
    {
      title: 'Data Sekolah',
      description: 'Kelola informasi sekolah',
      icon: School,
      href: '/dashboard/referensi/sekolah',
      accent: 'bg-blue-500',
    },
    {
      title: 'Sync Data',
      description: 'Sinkronisasi database',
      icon: RefreshCw,
      href: '/dashboard/sync',
      accent: 'bg-indigo-500',
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap raport siswa',
      icon: Printer,
      href: '/dashboard/admin-cetak-nilai/pelengkap-raport',
      accent: 'bg-blue-700',
    },
    {
      title: 'Tanggal Rapor',
      description: 'Atur tanggal rapor',
      icon: Calendar,
      href: '/dashboard/referensi/tanggalrapor',
      accent: 'bg-blue-800',
    },
  ];

  const quickAccessGuru = [
    {
      title: 'Input Nilai',
      description: 'Input nilai siswa',
      icon: FileText,
      href: '/dashboard/nilai',
      accent: 'bg-blue-500',
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap & nilai rapor siswa',
      icon: Printer,
      href: '/dashboard/cetak-nilai',
      accent: 'bg-indigo-500',
    },
    {
      title: 'Update Data Siswa',
      description: 'Lengkapi data siswa',
      icon: GraduationCap,
      href: '/dashboard/guru-input/update-data-siswa',
      accent: 'bg-blue-700',
    },
    {
      title: 'Raport',
      description: 'Lihat raport siswa',
      icon: FileText,
      href: '/dashboard/nilai/raport',
      accent: 'bg-blue-800',
    },
  ];

  const quickAccess = user?.level === 'Admin' ? quickAccessAdmin : quickAccessGuru;
  const isAdmin = user?.level === 'Admin';

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b5fc0] p-6 shadow-lg">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-20 h-28 w-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 rounded-full bg-white/10" />

        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200/80">
              {isAdmin ? 'Dashboard Administrator' : 'Dashboard Guru'}
            </p>
            <h1 className="mt-1 text-2xl font-black text-white">
              Selamat datang, {user?.nama || 'User'}!
            </h1>
            <p className="mt-1 text-sm text-blue-200/70">
              {isAdmin
                ? 'Kelola data sekolah dan pantau sinkronisasi database'
                : 'Kelola nilai dan data siswa Anda dengan mudah'}
            </p>
          </div>

          {/* semester badge */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:mt-0">
            <TrendingUp className="h-4 w-4 text-blue-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/70">Semester Aktif</p>
              <p className="text-sm font-black text-white">2025/2026 Genap</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Statistics Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statisticsCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <div className="group relative overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:ring-blue-200">
              {/* top gradient bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient}`} />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {stat.title}
                  </p>
                  {stat.value === null ? (
                    <div className="mt-1 h-7 w-16 animate-pulse rounded-md bg-slate-100" />
                  ) : (
                    <p className={`mt-0.5 text-3xl font-black ${stat.textColor}`}>
                      {stat.value.toLocaleString('id-ID')}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-400">{stat.description}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.lightBg} transition-transform duration-200 group-hover:scale-110`}>
                  <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-50 px-4 py-2">
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                  Lihat detail
                </span>
                <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick Access ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#1e3a8a]" />
          <h2 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">Akses Cepat</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickAccess.map((item) => (
            <Link key={item.title} href={item.href}>
              <div className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-xl">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.accent} shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-bold text-slate-800">{item.title}</p>
                  <p className="truncate text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-200 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: Info Sistem + Sync Status + Panduan ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Informasi Sistem */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-50 bg-slate-50/50 px-4 py-3">
            <UserIcon className="h-3.5 w-3.5 text-[#1e3a8a]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Informasi Akun</h3>
          </div>
          <div className="space-y-0 divide-y divide-slate-50 p-0">
            {[
              { label: 'Nama', value: user?.nama || '-', mono: false },
              { label: 'Username', value: user?.userid || '-', mono: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{row.label}</span>
                <span className={`text-[12px] font-bold text-slate-700 ${row.mono ? 'font-mono' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Level</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                isAdmin ? 'bg-[#1e3a8a] text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                <BadgeCheck className="h-3 w-3" />
                {user?.level || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Semester</span>
              <span className="text-[11px] font-bold text-indigo-600">2025/2026 Genap</span>
            </div>
          </div>
        </div>

        {/* Status Sinkronisasi */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#1e3a8a]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Status Sinkronisasi Database</h3>
            </div>
            {isAdmin && (
              <Link href="/dashboard/sync">
                <Button size="sm" variant="outline" className="h-7 gap-1.5 border-blue-200 px-3 text-[10px] font-bold text-blue-700 hover:bg-blue-50">
                  <RefreshCw className="h-3 w-3" />
                  Sinkron Sekarang
                </Button>
              </Link>
            )}
          </div>

          <div className="p-4">
            {syncStatus.loading ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-[12px] text-slate-500">Memuat status sinkronisasi...</span>
              </div>
            ) : syncStatus.error ? (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="text-[12px] text-red-700">Tidak dapat memuat status sinkronisasi.</span>
              </div>
            ) : !syncStatus.hasEverSynced ? (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="text-[12px] text-amber-700">
                  Belum pernah melakukan sinkronisasi.{' '}
                  {isAdmin && (
                    <Link href="/dashboard/sync" className="font-bold underline hover:text-amber-900">
                      Sinkron sekarang
                    </Link>
                  )}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* status header */}
                <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  syncStatus.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {syncStatus.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
                        syncStatus.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {syncStatus.status === 'success' ? '✓ BERHASIL' : '✕ GAGAL'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {syncStatus.relativeTime || syncStatus.formattedTimestamp}
                      </span>
                    </div>
                    {syncStatus.formattedTimestamp && (
                      <p className="mt-0.5 text-[10px] text-slate-400">{syncStatus.formattedTimestamp}</p>
                    )}
                    {syncStatus.user && (
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Oleh: <span className="font-bold text-slate-600">{syncStatus.user}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* metric pills */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Tabel', value: syncStatus.tablesSynced ?? 0, color: 'text-[#1e3a8a]' },
                    {
                      label: 'Record',
                      value: (syncStatus.recordsProcessed ?? 0).toLocaleString('id-ID'),
                      color: 'text-indigo-600',
                    },
                    {
                      label: 'Durasi',
                      value:
                        syncStatus.durationMs != null
                          ? syncStatus.durationMs < 1000
                            ? `${syncStatus.durationMs} ms`
                            : `${(syncStatus.durationMs / 1000).toFixed(1)} dtk`
                          : '-',
                      color: 'text-slate-700',
                    },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                      <p className={`mt-0.5 text-[15px] font-black ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Panduan Cepat ── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-50 bg-slate-50/50 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Panduan Cepat</h3>
        </div>
        <div className="grid divide-y divide-slate-50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 p-0">
          <div className="p-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#1e3a8a]">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
              Admin
            </h4>
            <ul className="ml-3.5 space-y-1.5 text-[11px] text-slate-500 list-disc">
              <li>Kelola referensi &amp; sinkronisasi database</li>
              <li>Cetak pelengkap raport semua kelas</li>
              <li>Monitoring progres penilaian guru</li>
            </ul>
          </div>
          <div className="p-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase text-indigo-700">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              Guru
            </h4>
            <ul className="ml-3.5 space-y-1.5 text-[11px] text-slate-500 list-disc">
              <li>Input nilai per mata pelajaran &amp; ekstrakurikuler</li>
              <li>Lengkapi data siswa untuk wali kelas</li>
              <li>Cetak raport kelas dan lihat histori peringkat</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
