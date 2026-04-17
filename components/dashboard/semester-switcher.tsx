'use client';

import * as React from 'react';
import { Calendar, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSemester } from '@/components/providers/semester-context';
import { getCurrentUser } from '@/lib/auth-client';
import type { User } from '@/lib/db';

export function SemesterSwitcher() {
  const { activeSemester, semesters, updateActiveSemester, loading } = useSemester();
  const [user, setUser] = React.useState<User | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const isAdmin = user?.level === 'Admin';

  const handleSelect = async (semesterId: string) => {
    if (!isAdmin || isUpdating) return;
    setIsUpdating(true);
    await updateActiveSemester(semesterId);
    setIsUpdating(false);
    window.location.reload();
  };

  if (loading && !activeSemester) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 animate-pulse">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 px-3 font-medium border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm bg-white",
              activeSemester?.periode_aktif === '1' && "border-emerald-200"
            )}
            disabled={!isAdmin || isUpdating}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white shrink-0">
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
              </div>
              <div className="flex flex-col items-start leading-none text-left hidden md:flex min-w-[100px]">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Semester Aktif</span>
                <span className="truncate text-xs font-bold text-[#1e3a8a]">
                  {activeSemester?.nama_semester || 'Pilih Semester'}
                </span>
              </div>
              {/* Only show name on mobile */}
              <span className="md:hidden text-xs font-bold">
                {activeSemester?.nama_semester.split(' ')[0] || 'Sms'}
              </span>
            </div>
            {isAdmin && <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50 shrink-0" />}
          </Button>
        </DropdownMenuTrigger>
        
        {isAdmin && (
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <DropdownMenuLabel>Pilih Semester Global</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {semesters.map((s) => (
                <DropdownMenuItem
                  key={s.semester_id}
                  className="flex items-center justify-between cursor-pointer py-2 px-3"
                  onClick={() => handleSelect(s.semester_id)}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#1e3a8a]">{s.nama_semester}</span>
                    <span className="text-[10px] text-slate-500">{s.tahun_ajaran_id}</span>
                  </div>
                  {activeSemester?.semester_id === s.semester_id && (
                    <Check className="h-4 w-4 text-emerald-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}
