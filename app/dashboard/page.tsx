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
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalSiswa: number;
  totalGuru: number;
  totalKelas: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0
  });
  const [loading, setLoading] = useState(true);

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

  const statisticsCards = [
    {
      title: 'Total Siswa',
      value: loading ? '...' : stats.totalSiswa.toLocaleString(),
      description: 'Siswa terdaftar',
      icon: GraduationCap,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/dashboard/siswa'
    },
    {
      title: 'Total Guru',
      value: loading ? '...' : stats.totalGuru.toLocaleString(),
      description: 'Guru aktif',
      icon: UserCheck,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      href: '/dashboard/guru'
    },
    {
      title: 'Total Kelas',
      value: loading ? '...' : stats.totalKelas.toLocaleString(),
      description: 'Rombongan belajar',
      icon: BookOpen,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/dashboard/referensi/kelas'
    },
  ];

  const quickAccessAdmin = [
    {
      title: 'Data Sekolah',
      description: 'Kelola informasi sekolah',
      icon: School,
      href: '/dashboard/referensi/sekolah',
      color: 'text-blue-600'
    },
    {
      title: 'Sync Data',
      description: 'Sinkronisasi database',
      icon: RefreshCw,
      href: '/dashboard/sync',
      color: 'text-emerald-600'
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap raport siswa',
      icon: Printer,
      href: '/dashboard/admin-cetak-nilai/pelengkap-raport',
      color: 'text-purple-600'
    },
    {
      title: 'Tanggal Rapor',
      description: 'Atur tanggal rapor',
      icon: Calendar,
      href: '/dashboard/referensi/tanggalrapor',
      color: 'text-orange-600'
    },
  ];

  const quickAccessGuru = [
    {
      title: 'Input Nilai',
      description: 'Input nilai siswa',
      icon: FileText,
      href: '/dashboard/nilai',
      color: 'text-blue-600'
    },
    {
      title: 'Cetak Nilai',
      description: 'Pelengkap & nilai rapor siswa',
      icon: Printer,
      href: '/dashboard/cetak-nilai',
      color: 'text-purple-600'
    },
    {
      title: 'Update Data Siswa',
      description: 'Lengkapi data siswa',
      icon: GraduationCap,
      href: '/dashboard/guru-input/update-data-siswa',
      color: 'text-emerald-600'
    },
    {
      title: 'Raport',
      description: 'Lihat raport siswa',
      icon: FileText,
      href: '/dashboard/nilai/raport',
      color: 'text-orange-600'
    },
  ];

  const quickAccess = user?.level === 'Admin' ? quickAccessAdmin : quickAccessGuru;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Selamat datang, {user?.nama || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          {user?.level === 'Admin'
            ? 'Dashboard Administrator - Kelola data sekolah dan sinkronisasi database'
            : 'Dashboard Guru - Kelola nilai dan data siswa Anda'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statisticsCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Akses Cepat</CardTitle>
          <CardDescription>
            Fitur yang sering digunakan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickAccess.map((item) => (
              <Link key={item.title} href={item.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted`}>
                        <item.icon className={`h-6 w-6 ${item.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Sistem</CardTitle>
            <CardDescription>Detail pengguna dan hak akses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Username</span>
              <span className="text-sm text-muted-foreground">{user?.userid || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nama</span>
              <span className="text-sm text-muted-foreground">{user?.nama || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Level Akses</span>
              <span className={`text-sm font-semibold px-2 py-1 rounded ${user?.level === 'Admin'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
                }`}>
                {user?.level || '-'}
              </span>
            </div>
            {user?.level === 'Guru' && user?.ptk_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">PTK ID</span>
                <span className="text-sm text-muted-foreground">{user.ptk_id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bantuan</CardTitle>
            <CardDescription>Panduan penggunaan sistem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Admin</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Kelola data referensi melalui menu Data Referensi</li>
                <li>Sync database lokal ke cloud melalui menu Sync Data</li>
                <li>Cetak pelengkap raport semua kelas</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Guru</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Input nilai siswa per mata pelajaran</li>
                <li>Lengkapi data siswa wali kelas</li>
                <li>Cetak pelengkap raport kelas yang diampu</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
