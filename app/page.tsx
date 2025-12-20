'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
    </div>
  );
}
