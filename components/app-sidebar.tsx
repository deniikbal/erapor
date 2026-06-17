'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home,
    Package,
    School,
    UserCheck,
    GraduationCap,
    BookOpen,
    Calendar,
    Image as ImageIcon,
    Printer,
    ClipboardEdit,
    RefreshCw,
    FileText,
    Table,
    LogOut,
    ChevronRight,
    TrendingUp,
    Medal,
    Activity,
    Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { getCurrentUser, removeCurrentUser } from '@/lib/auth-client';
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
        title: 'Input Kelengkapan',
        icon: ClipboardEdit,
        allowedLevels: ['Guru'],
        submenu: [
            { title: 'Update Data Siswa', href: '/dashboard/guru-input/update-data-siswa', icon: GraduationCap },
            { title: 'Kenaikan Kelas', href: '/dashboard/referensi/kenaikan-kelas', icon: GraduationCap },
            { title: 'Cek Catatan Wali', href: '/dashboard/guru/catatan-wali', icon: FileText },
        ],
    },
    {
        title: 'Perkembangan Nilai',
        icon: TrendingUp,
        allowedLevels: ['Guru'],
        submenu: [
            { title: 'Status Penilaian', href: '/dashboard/guru/status-penilaian', icon: Table },
            { title: 'Grafik Penilaian', href: '/dashboard/guru/grafik-perkembangan', icon: TrendingUp },
            { title: 'Peringkat Siswa', href: '/dashboard/guru/peringkat', icon: Medal },
        ],
    },
    {
        title: 'Cetak Nilai',
        icon: Printer,
        allowedLevels: ['Guru'],
        submenu: [
            { title: 'Pelengkap Raport', href: '/dashboard/cetak-nilai/pelengkap-raport', icon: FileText },
            { title: 'Nilai Rapor', href: '/dashboard/cetak-nilai/nilai-rapor', icon: GraduationCap },
            { title: 'Leger Rapor', href: '/dashboard/cetak-nilai/leger-rapor', icon: Table },
        ],
    },
    {
        title: 'Data Referensi',
        icon: Package,
        allowedLevels: ['Admin'],
        submenu: [
            { title: 'Setting Semester', href: '/dashboard/referensi/semester', icon: Calendar },
            { title: 'Data Sekolah', href: '/dashboard/referensi/sekolah', icon: School },
            { title: 'Data Guru', href: '/dashboard/guru', icon: UserCheck },
            { title: 'Data Siswa', href: '/dashboard/siswa', icon: GraduationCap },
            { title: 'Data Kelas', href: '/dashboard/referensi/kelas', icon: BookOpen },
            { title: 'Kenaikan Kelas', href: '/dashboard/referensi/kenaikan-kelas', icon: GraduationCap },
            { title: 'Data Mapel', href: '/dashboard/referensi/mapel', icon: BookOpen },
            { title: 'Data Logo', href: '/dashboard/referensi/logo', icon: ImageIcon },
            { title: 'Data Tanggal Rapor', href: '/dashboard/referensi/tanggalrapor', icon: Calendar },
        ],
    },
    {
        title: 'Data Kokurikuler',
        icon: ClipboardEdit,
        allowedLevels: ['Admin'],
        submenu: [
            { title: 'Daftar Tema', href: '/dashboard/admin/kokurikuler/tema', icon: FileText },
            { title: 'Kegiatan Kokurikuler', href: '/dashboard/admin/kokurikuler/kegiatan', icon: Activity },
            { title: 'Kelompok Kokurikuler', href: '/dashboard/admin/kokurikuler/kelompok', icon: Users },
        ],
    },
    {
        title: 'Perkembangan Nilai',
        icon: TrendingUp,
        allowedLevels: ['Admin'],
        submenu: [
            { title: 'Status Penilaian', href: '/dashboard/admin/perkembangan-nilai/status', icon: Table },
            { title: 'Grafik Perkembangan', href: '/dashboard/admin/perkembangan-nilai/grafik', icon: TrendingUp },
            { title: 'Peringkat Kelas', href: '/dashboard/admin/perkembangan-nilai/peringkat', icon: Medal },
            { title: 'Cek Catatan Wali', href: '/dashboard/admin/catatan-wali', icon: FileText },
        ],
    },
    {
        title: 'Cetak Nilai',
        icon: Printer,
        allowedLevels: ['Admin'],
        submenu: [
            { title: 'Pelengkap Raport', href: '/dashboard/admin-cetak-nilai/pelengkap-raport', icon: FileText },
            { title: 'Nilai Rapor', href: '/dashboard/admin-cetak-nilai/nilai-rapor', icon: GraduationCap },
            { title: 'Leger Rapor', href: '/dashboard/admin-cetak-nilai/leger-rapor', icon: Table },
        ],
    },
    {
        title: 'Sync Data',
        href: '/dashboard/sync',
        icon: RefreshCw,
        allowedLevels: ['Admin'],
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = React.useState<User | null>(null);
    const [filteredMenuItems, setFilteredMenuItems] = React.useState<MenuItem[]>([]);

    React.useEffect(() => {
        const loadUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (currentUser) {
                const filtered = menuItems.filter((item) => {
                    if (!item.allowedLevels) return true;
                    const userLevel = (currentUser.level || '').trim().toLowerCase();
                    return item.allowedLevels.some(level => 
                        level.toLowerCase() === userLevel
                    );
                });
                setFilteredMenuItems(filtered);
            }
        };
        loadUser();
    }, []);

    const handleLogout = () => {
        removeCurrentUser();
        router.push('/login');
    };

    return (
        <Sidebar variant="sidebar" {...props}>
            <SidebarHeader className="flex h-14 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                    <img src="/erap-icon.png" alt="ERAP+" className="h-8 w-8" />
                    <div className="flex items-center">
                        <span className="text-xl font-bold text-[#1e3a8a]">ERAP</span>
                        <span className="text-xl font-bold text-[#10b981]">+</span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="scrollbar-hide">
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {filteredMenuItems.map((item) =>
                                item.submenu ? (
                                    <Collapsible
                                        key={item.title}
                                        asChild
                                        defaultOpen={item.submenu.some((sub) => pathname === sub.href)}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={item.title} isActive={item.submenu.some((sub) => pathname === sub.href)}>
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.submenu.map((subItem) => (
                                                        <SidebarMenuSubItem key={subItem.href}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={pathname === subItem.href}
                                                                className={cn(
                                                                    "relative transition-all duration-200",
                                                                    pathname === subItem.href && "bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                                                                )}
                                                            >
                                                                <Link href={subItem.href}>
                                                                    {pathname === subItem.href && (
                                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600" />
                                                                    )}
                                                                    <subItem.icon className={cn("h-4 w-4", pathname === subItem.href && "text-blue-600")} />
                                                                    <span>{subItem.title}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                ) : (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            isActive={pathname === item.href}
                                            className={cn(
                                                "relative transition-all duration-200",
                                                pathname === item.href && "bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 hover:text-blue-800"
                                            )}
                                        >
                                            <Link href={item.href!}>
                                                {pathname === item.href && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-600" />
                                                )}
                                                <item.icon className={cn("h-4 w-4", pathname === item.href && "text-blue-600")} />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <Separator className="mb-2" />
                <div className="px-3 py-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
