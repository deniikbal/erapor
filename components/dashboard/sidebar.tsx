'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  BarChart,
  Package,
  ShoppingCart,
  LogOut,
  ChevronDown,
  ChevronRight,
  School,
  GraduationCap,
  BookOpen,
  Image as ImageIcon,
  UserCheck,
  Calendar,
  ClipboardEdit,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { removeCurrentUser, getCurrentUser } from '@/lib/auth-client';
import type { User } from '@/lib/db';

type SubMenuItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuItem = {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: SubMenuItem[];
  allowedLevels?: string[];
};

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    allowedLevels: ['Admin', 'Guru'],
  },
  {
    title: 'Data Referensi',
    icon: Package,
    allowedLevels: ['Admin'],
    submenu: [
      { title: 'Data Sekolah', href: '/dashboard/referensi/sekolah', icon: School },
      { title: 'Data Guru', href: '/dashboard/guru', icon: UserCheck },
      { title: 'Data Siswa', href: '/dashboard/siswa', icon: GraduationCap },
      { title: 'Data Kelas', href: '/dashboard/referensi/kelas', icon: BookOpen },
      { title: 'Data Logo', href: '/dashboard/referensi/logo', icon: ImageIcon },
      { title: 'Data Tanggal Rapor', href: '/dashboard/referensi/tanggalrapor', icon: Calendar },
    ],
  },

  {
    title: 'Cetak Nilai',
    icon: Printer,
    allowedLevels: ['Admin'],
    submenu: [
      { title: 'Pelengkap Raport', href: '/dashboard/admin-cetak-nilai/pelengkap-raport', icon: FileText },
      { title: 'Nilai Rapor', href: '/dashboard/admin-cetak-nilai/nilai-rapor', icon: GraduationCap },
    ],
  },
  {
    title: 'Input Kelengkapan',
    icon: ClipboardEdit,
    allowedLevels: ['Guru'],
    submenu: [
      { title: 'Update Data Siswa', href: '/dashboard/guru-input/update-data-siswa', icon: GraduationCap },
    ],
  },
  {
    title: 'Cetak Nilai',
    icon: Printer,
    allowedLevels: ['Guru'],
    submenu: [
      { title: 'Pelengkap Raport', href: '/dashboard/cetak-nilai/pelengkap-raport', icon: FileText },
      { title: 'Nilai Rapor', href: '/dashboard/cetak-nilai/nilai-rapor', icon: GraduationCap },
    ],
  },
  {
    title: 'Sync Data',
    href: '/dashboard/sync',
    icon: RefreshCw,
    allowedLevels: ['Admin'],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const filtered = menuItems.filter((item) =>
          !item.allowedLevels || item.allowedLevels.includes(currentUser.level)
        );
        setFilteredMenuItems(filtered);
      }
    };
    loadUser();
  }, []);

  const toggleMenu = (title: string) => {
    setExpandedMenus((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  const handleLogout = () => {
    removeCurrentUser();
    router.push('/login');
  };

  return (
    <div className="flex h-full flex-col gap-2 bg-background border-r">
      <div className="flex h-14 items-center border-b px-4 lg:h-16 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-lg">Dashboard</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-2">
          {filteredMenuItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                <div>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start',
                      expandedMenus.includes(item.title) && 'bg-accent'
                    )}
                    onClick={() => toggleMenu(item.title)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {expandedMenus.includes(item.title) ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </Button>
                  {expandedMenus.includes(item.title) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link key={subItem.href} href={subItem.href} onClick={onNavigate}>
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full justify-start pl-8',
                              pathname === subItem.href && 'bg-accent text-accent-foreground'
                            )}
                          >
                            <subItem.icon className="mr-2 h-4 w-4" />
                            {subItem.title}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link href={item.href!} onClick={onNavigate}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start',
                      pathname === item.href && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-auto p-4">
        <Separator className="mb-4" />
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
