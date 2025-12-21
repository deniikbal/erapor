# Dokumentasi Submenu Nilai Rapor

## 📋 Yang Sudah Dibuat

### 1. ✅ Struktur File Baru

```
app/dashboard/cetak-nilai/
├── page.tsx                    # Halaman indeks menu (BARU)
├── pelengkap-raport/
│   └── page.tsx               # Submenu pelengkap rapor (SUDAH ADA)
└── nilai-rapor/               # FOLDER BARU
    └── page.tsx               # Submenu nilai rapor (BARU)
```

### 2. ✅ Halaman yang Sudah Dibuat

#### A. `/dashboard/cetak-nilai/page.tsx` (Halaman Indeks)
**Fitur:**
- Menampilkan 2 card submenu:
  1. **Pelengkap Rapor** - Icon FileText (Purple)
  2. **Nilai Rapor** - Icon GraduationCap (Emerald)
- Informasi panduan untuk setiap submenu
- Hover effects dan animasi smooth
- Responsive design

#### B. `/dashboard/cetak-nilai/nilai-rapor/page.tsx` (Halaman Nilai Rapor)
**Fitur:**
- UI/UX mirip dengan halaman Pelengkap Rapor
- **Pengaturan Margin PDF:**
  - Margin Atas, Bawah, Kiri, Kanan
  - Input dalam satuan mm
  - Tombol simpan pengaturan
  
- **Daftar Siswa dalam Tabel:**
  - No
  - Nama Lengkap
  - NIS
  - NISN
  - Kelas
  - Tombol "Cetak PDF" per siswa (Hijau/Emerald)
  
- **Tombol Cetak Massal:**
  - "Cetak PDF Semua Siswa" (Biru)
  - Progress indicator saat generate
  - Shows current student being processed

- **Fitur yang Sudah Diimplementasikan:**
  - ✅ Authentication check (hanya Guru)
  - ✅ Fetch siswa by wali kelas
  - ✅ Margin settings management
  - ✅ Loading states
  - ✅ Error handling
  - ⏳ PDF Generation (placeholder, siap diimplementasikan)

### 3. ✅ Update Dashboard Menu

**Perubahan di `/dashboard/page.tsx`:**

```typescript
// SEBELUM:
{
  title: 'Cetak Nilai',
  description: 'Pelengkap raport siswa',
  href: '/dashboard/cetak-nilai/pelengkap-raport',
  ...
}

// SESUDAH:
{
  title: 'Cetak Nilai',
  description: 'Pelengkap & nilai rapor siswa',  // ✅ Updated
  href: '/dashboard/cetak-nilai',                 // ✅ Updated
  ...
}
```

Sekarang menu "Cetak Nilai" di dashboard akan mengarah ke halaman indeks yang menampilkan 2 submenu.

---

## 🎨 Desain UI

### Halaman Indeks Cetak Nilai
```
┌─────────────────────────────────────────────┐
│ Cetak Nilai                                 │
│ Pilih jenis dokumen yang ingin dicetak     │
│                                             │
│ ┌─────────────────┐  ┌──────────────────┐ │
│ │ 📄 Pelengkap    │  │ 🎓 Nilai Rapor  │ │
│ │    Rapor        │  │                  │ │
│ │                 │  │                  │ │
│ │ [Buka halaman→] │  │ [Buka halaman→] │ │
│ └─────────────────┘  └──────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ℹ️ Informasi                            ││
│ │ • Panduan penggunaan                    ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Halaman Nilai Rapor
```
┌─────────────────────────────────────────────┐
│ Nilai Rapor                                 │
│ Generate PDF nilai rapor siswa (X siswa)   │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ ⚙️ Pengaturan Margin PDF                ││
│ │ [Top] [Bottom] [Left] [Right]           ││
│ │ [Simpan Pengaturan]                     ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ 🎓 Daftar Siswa    [📥 Cetak PDF Semua]││
│ │                                         ││
│ │ No | Nama | NIS | NISN | Kelas | Aksi  ││
│ │ 1  | ...  | ... | ...  | ...   | [PDF] ││
│ │ 2  | ...  | ... | ...  | ...   | [PDF] ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 🚀 Cara Mengakses

1. Login sebagai **Guru**
2. Di Dashboard, klik card **"Cetak Nilai"**
3. Pilih submenu:
   - **Pelengkap Rapor** → Generate identitas siswa
   - **Nilai Rapor** → Generate nilai rapor (BARU)

---

## 📝 Next Steps (Implementasi PDF)

Untuk mengimplementasikan PDF generation nilai rapor:

1. Buat library PDF generator di `/lib/pdf/nilaiRaporGenerator.ts`
2. Implementasikan fungsi `generateNilaiRaporPDF()`
3. Fetch data nilai dari API
4. Format sesuai template rapor Kurikulum Merdeka
5. Replace placeholder di `handleGeneratePDF()` dan `handleGenerateBulkPDFs()`

---

## ✅ Status

- [x] Struktur folder dibuat
- [x] Halaman indeks cetak-nilai
- [x] Halaman nilai-rapor dengan UI lengkap
- [x] Update menu dashboard
- [x] Margin settings integration
- [x] Table siswa dengan aksi cetak
- [x] Bulk download button
- [ ] Implementasi PDF generation (Next Phase)

---

**Created:** 21 Desember 2025  
**Status:** Ready for testing & PDF implementation
