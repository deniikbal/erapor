'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { saveCurrentUser } from '@/lib/auth-client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }

      saveCurrentUser(data.user);
      router.push('/dashboard');
    } catch (err) {
      setError('Terjadi kesalahan yang tidak terduga');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Left Column - Image - Hidden on mobile/tablet, shown on large screens */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
            <div className="max-w-md space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <img src="/erap-icon.png" alt="ERAP+" className="h-16 w-16" />
                <div>
                  <h1 className="text-4xl font-bold leading-tight">
                    <span className="text-white">ERAP</span><span className="text-emerald-200">+</span>
                  </h1>
                  <p className="text-emerald-100 text-sm">Interface Modern untuk e-Rapor</p>
                </div>
              </div>
              <p className="text-lg text-emerald-50">
                Portal pintar untuk akses data e-Rapor sekolah. Memudahkan guru dan admin dalam pengelolaan rapor siswa.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">1500+</div>
                  <div className="text-sm text-emerald-100">Siswa Aktif</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">60+</div>
                  <div className="text-sm text-emerald-100">Guru</div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Right Column - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="space-y-1">
              <div className="flex flex-col items-center mb-4">
                <div className="flex items-center gap-2">
                  <img src="/erap-icon.png" alt="ERAP+" className="h-10 w-10" />
                  <div>
                    <span className="text-2xl font-bold text-[#1e3a8a]">ERAP</span>
                    <span className="text-2xl font-bold text-[#10b981]">+</span>
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Selamat Datang</CardTitle>
              <CardDescription className="text-center">
                Masukkan username dan password untuk mengakses sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>

      <footer className="w-full py-4 text-center bg-white dark:bg-gray-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex justify-center items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <span>&copy; {new Date().getFullYear()} ERAP+ &mdash; Interface Modern untuk e-Rapor</span>
          <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
          <span className="text-xs">Data bersumber dari aplikasi e-Rapor Kemdikbud</span>
        </div>
      </footer>
    </div>
  );
}
