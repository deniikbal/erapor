'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Semester } from '@/lib/db';

interface SemesterContextType {
  activeSemester: Semester | null;
  semesters: Semester[];
  loading: boolean;
  refreshActiveSemester: () => Promise<void>;
  updateActiveSemester: (semesterId: string) => Promise<boolean>;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

export function SemesterProvider({ children }: { children: React.ReactNode }) {
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSemesters = useCallback(async () => {
    try {
      const response = await fetch('/api/semester');
      const result = await response.json();
      if (response.ok) {
        setSemesters(result.data || []);
      }
    } catch (error) {
      console.error('Fetch semesters error:', error);
    }
  }, []);

  const fetchActiveSemester = useCallback(async () => {
    try {
      const response = await fetch('/api/semester/active');
      const result = await response.json();
      if (response.ok && result.data) {
        setActiveSemester(result.data);
      }
    } catch (error) {
      console.error('Fetch active semester error:', error);
    }
  }, []);

  const refreshActiveSemester = async () => {
    setLoading(true);
    await Promise.all([fetchSemesters(), fetchActiveSemester()]);
    setLoading(false);
  };

  const updateActiveSemester = async (semesterId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/semester/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semester_id: semesterId }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Semester aktif berhasil diperbarui');
        await refreshActiveSemester();
        return true;
      } else {
        toast.error(result.error || 'Gagal memperbarui semester aktif');
        return false;
      }
    } catch (error) {
      console.error('Update semester error:', error);
      toast.error('Terjadi kesalahan koneksi');
      return false;
    }
  };

  useEffect(() => {
    refreshActiveSemester();
  }, [fetchSemesters, fetchActiveSemester]);

  return (
    <SemesterContext.Provider
      value={{
        activeSemester,
        semesters,
        loading,
        refreshActiveSemester,
        updateActiveSemester,
      }}
    >
      {children}
    </SemesterContext.Provider>
  );
}

export function useSemester() {
  const context = useContext(SemesterContext);
  if (context === undefined) {
    throw new Error('useSemester must be used within a SemesterProvider');
  }
  return context;
}
