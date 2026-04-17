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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden relative font-sans">
      {/* Kolom Kiri - Gambar Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:flex-[2.5] relative bg-[#f8fafc] border-r border-slate-100 items-center justify-center p-8">
        <div className="relative w-full h-full max-h-[85vh] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(30,58,138,0.15)] border-4 border-white group">
          <img 
            src="/img/login.jpeg" 
            alt="Login Branding" 
            className="w-full h-full object-cover transition-transform duration-[10000ms] ease-in-out group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/40 to-transparent" />
          
          {/* Social Media Bar (Inside Card) */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#1e3a8a]/70 backdrop-blur-md py-2.5 px-6 flex items-center justify-between text-white border-t border-white/10">
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-tight uppercase">
              <span className="opacity-80">Ikuti Media Sosial:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group/item">
                  <School className="h-3 w-3 opacity-60 group-hover/item:opacity-100 transition-opacity" />
                  <span>Direktorat SMA</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group/item">
                  <School className="h-3 w-3 opacity-60 group-hover/item:opacity-100 transition-opacity" />
                  <span>@direktoratsma</span>
                </div>
              </div>
            </div>
            <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">e-Rapor SMA</span>
          </div>
        </div>
      </div>

      {/* Kolom Kanan - Form Login */}
      <div className="flex-1 lg:flex-[1] flex flex-col justify-center items-center p-6 sm:p-12 bg-white relative">
        <div className="w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-right duration-700">
          {/* Header MASUK */}
          <div className="text-center space-y-4">
            <div className="inline-flex flex-col items-center">
              <div className="flex items-center gap-2 text-[#1e3a8a]">
                <Lock className="h-6 w-6" />
                <h2 className="text-2xl font-black uppercase tracking-tight">MASUK</h2>
              </div>
              <div className="w-32 h-1 bg-[#1e3a8a] mt-1 rounded-full" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold text-slate-400">
                <span className="bg-white px-4 italic">Silakan Masuk Untuk Memulai Aplikasi</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="flex border border-slate-200 rounded-md overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all bg-[#f0f7ff]/30">
              <div className="bg-slate-100/80 px-4 flex items-center justify-center border-r border-slate-200 min-w-[110px]">
                <Label htmlFor="username" className="text-[12px] font-black text-slate-600 uppercase tracking-tight">Username</Label>
              </div>
              <Input
                id="username"
                type="text"
                placeholder="administrator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="border-none bg-transparent focus-visible:ring-0 h-11 text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:italic"
              />
            </div>

            {/* Password */}
            <div className="flex border border-slate-200 rounded-md overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all bg-[#f0f7ff]/30">
              <div className="bg-slate-100/80 px-4 flex items-center justify-center border-r border-slate-200 min-w-[110px]">
                <Label htmlFor="password" className="text-[12px] font-black text-slate-600 uppercase tracking-tight">Password</Label>
              </div>
              <div className="flex-1 flex items-center pr-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-none bg-transparent focus-visible:ring-0 h-11 text-sm font-bold text-slate-700 placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 px-2 h-7 bg-slate-400/30 text-slate-500 hover:text-[#1e3a8a] transition-colors border border-slate-200 rounded text-[10px] font-bold uppercase flex items-center gap-1"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="sr-only">Toggle Password</span>
                </button>
              </div>
            </div>

            {/* Sekolah Select */}
            <div className="flex border border-slate-200 rounded-md overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
              <div className="bg-slate-100/80 px-4 flex items-center justify-center border-r border-slate-200 min-w-[110px]">
                <Label className="text-[12px] font-black text-slate-600 uppercase tracking-tight">Sekolah :</Label>
              </div>
              <Select 
                value={selectedSekolah} 
                onValueChange={setSelectedSekolah}
                disabled={loading || fetchingData}
              >
                <SelectTrigger className="border-none bg-white focus:ring-0 h-11 text-sm font-bold text-slate-700 rounded-none">
                  <SelectValue placeholder={fetchingData ? "Memuat..." : "Pilih Sekolah"} />
                </SelectTrigger>
                <SelectContent className="font-sans font-bold text-sm">
                  {sekolahs.map((s) => (
                    <SelectItem key={s.sekolah_id} value={s.sekolah_id} className="text-xs">
                      {s.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester Select */}
            <div className="flex border border-slate-200 rounded-md overflow-hidden group focus-within:ring-2 focus-within:ring-[#1e3a8a]/20 focus-within:border-[#1e3a8a] transition-all">
              <div className="bg-slate-100/80 px-4 flex items-center justify-center border-r border-slate-200 min-w-[110px]">
                <Label className="text-[12px] font-black text-slate-600 uppercase tracking-tight">Semester</Label>
              </div>
              <Select 
                value={selectedSemester} 
                onValueChange={setSelectedSemester}
                disabled={loading || fetchingData}
              >
                <SelectTrigger className="border-none bg-white focus:ring-0 h-11 text-sm font-bold text-slate-700 rounded-none">
                  <SelectValue placeholder={fetchingData ? "Memuat..." : "Pilih Semester"} />
                </SelectTrigger>
                <SelectContent className="font-sans font-bold text-sm">
                  {semesters.map((s) => (
                    <SelectItem key={s.semester_id} value={s.semester_id} className="text-xs">
                      {s.nama_semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-1">
              <button type="button" className="text-[11px] font-bold text-[#1e3a8a] hover:underline uppercase tracking-tight">
                Lupa Password ?
              </button>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2 bg-red-50 border-red-100 text-red-800 rounded text-xs font-bold animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#1e3a8a] hover:bg-black text-white font-black text-base uppercase tracking-widest rounded shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group" 
              disabled={loading || fetchingData}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>MEMPROSES...</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 group-hover:animate-bounce" />
                  <span>MASUK</span>
                </>
              )}
            </Button>

            <div className="pt-4 relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em]">
                <span className="bg-white px-2">Isi User & Password dengan benar</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
