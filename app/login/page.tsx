'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveCurrentUser } from '@/lib/auth-client';
import { Loader2, Eye, EyeOff, School, Calendar, User, Lock } from 'lucide-react';
import type { Semester, Sekolah as SekolahType } from '@/lib/db';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [sekolahs, setSekolahs] = useState<SekolahType[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSekolah, setSelectedSekolah] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [fetchingData, setFetchingData] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resSekolah, resSemester] = await Promise.all([
          fetch('/api/sekolah'),
          fetch('/api/semester')
        ]);
        
        const dataSekolah = await resSekolah.json();
        const dataSemester = await resSemester.json();
        
        if (resSekolah.ok && dataSekolah.sekolah) {
          // Wrap in array if it's a single object
          const schools = Array.isArray(dataSekolah.sekolah) ? dataSekolah.sekolah : [dataSekolah.sekolah];
          setSekolahs(schools);
          if (schools.length > 0) setSelectedSekolah(schools[0].sekolah_id);
        }
        
        if (resSemester.ok && dataSemester.data) {
          setSemesters(dataSemester.data);
          const activeSms = dataSemester.data.find((s: Semester) => s.periode_aktif === '1');
          if (activeSms) setSelectedSemester(activeSms.semester_id);
          else if (dataSemester.data.length > 0) setSelectedSemester(dataSemester.data[0].semester_id);
        }
      } catch (err) {
        console.error('Fetch login data error:', err);
      } finally {
        setFetchingData(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSemester) {
      setError('Silakan pilih semester terlebih dahulu');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password,
          semester_id: selectedSemester 
        }),
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
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-[480px] shadow-2xl border-none overflow-hidden rounded-xl bg-white">
          <CardHeader className="space-y-4 pb-8 bg-gradient-to-r from-[#1e3a8a]/5 to-[#10b981]/5 border-b">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 mb-2">
                <img src="/erap-icon.png" alt="ERAP+" className="h-12 w-12 drop-shadow-md" />
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-3xl font-black text-[#1e3a8a] tracking-tighter">ERAP</span>
                    <span className="text-3xl font-black text-[#10b981] tracking-tighter">+</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 -mt-1">
                    Interface Modern e-Rapor
                  </span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f8fafc] px-4 py-1 rounded-full border border-slate-200 text-slate-500 font-semibold shadow-sm">
                  Silakan Masuk Untuk Memulai Aplikasi
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-10 pb-10 px-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <div className="flex border rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
                <div className="bg-slate-100 px-4 flex items-center justify-center border-r min-w-[110px] sm:min-w-[130px]">
                  <Label htmlFor="username" className="text-sm font-bold text-slate-600">Username</Label>
                </div>
                <div className="flex-1 bg-[#f0f7ff]">
                  <Input
                    id="username"
                    type="text"
                    placeholder="administrator"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    className="border-none bg-transparent focus-visible:ring-0 h-12 text-slate-700 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex border rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
                <div className="bg-slate-100 px-4 flex items-center justify-center border-r min-w-[110px] sm:min-w-[130px]">
                  <Label htmlFor="password" className="text-sm font-bold text-slate-600">Password</Label>
                </div>
                <div className="flex-1 bg-[#f0f7ff] flex items-center">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="border-none bg-transparent focus-visible:ring-0 h-12 text-slate-700 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-4 h-full bg-slate-400/20 text-slate-500 hover:text-[#1e3a8a] transition-colors border-l border-slate-200"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sekolah Select */}
              <div className="flex border rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
                <div className="bg-slate-100 px-4 flex items-center justify-center border-r min-w-[110px] sm:min-w-[130px]">
                  <Label className="text-sm font-bold text-slate-600">Sekolah :</Label>
                </div>
                <div className="flex-1 bg-white">
                  <Select 
                    value={selectedSekolah} 
                    onValueChange={setSelectedSekolah}
                    disabled={loading || fetchingData}
                  >
                    <SelectTrigger className="border-none bg-transparent focus:ring-0 h-12 text-slate-700 font-medium">
                      <SelectValue placeholder={fetchingData ? "Memuat..." : "Pilih Sekolah"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sekolahs.map((s) => (
                        <SelectItem key={s.sekolah_id} value={s.sekolah_id}>
                          {s.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Semester Select */}
              <div className="flex border rounded-lg overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
                <div className="bg-slate-100 px-4 flex items-center justify-center border-r min-w-[110px] sm:min-w-[130px]">
                  <Label className="text-sm font-bold text-slate-600">Semester</Label>
                </div>
                <div className="flex-1 bg-white">
                  <Select 
                    value={selectedSemester} 
                    onValueChange={setSelectedSemester}
                    disabled={loading || fetchingData}
                  >
                    <SelectTrigger className="border-none bg-transparent focus:ring-0 h-12 text-slate-700 font-medium">
                      <SelectValue placeholder={fetchingData ? "Memuat..." : "Pilih Semester"} />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((s) => (
                        <SelectItem key={s.semester_id} value={s.semester_id}>
                          {s.nama_semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-800 rounded-lg">
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold text-lg rounded-lg shadow-lg shadow-blue-900/10 transition-all active:scale-[0.98]" 
                disabled={loading || fetchingData}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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

      <footer className="w-full py-6 text-center bg-transparent border-t border-slate-200/50 shrink-0">
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 text-sm text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            <span>&copy; {new Date().getFullYear()} ERAP+</span>
          </div>
          <span className="hidden md:inline text-slate-300">|</span>
          <span>Interface Modern untuk e-Rapor Kemdikbud</span>
        </div>
      </footer>
    </div>
  );
}
