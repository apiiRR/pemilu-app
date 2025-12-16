# Rencana Implementasi Pengaturan Jadwal Voting

## Informasi yang Dikumpulkan

Berdasarkan analisis kode yang ada, saya menemukan:

- Aplikasi voting saat ini tidak memiliki pengaturan waktu voting
- Database memiliki tabel: candidates, employees, votes
- AdminDashboard sudah ada untuk mengelola calon dan pegawai
- VotingPage adalah halaman utama untuk proses voting

## Rencana Implementasi

### 1. Database Schema Updates

**File yang akan diedit:**

- `supabase/migrations/` (file baru)

**Perubahan yang diperlukan:**

- Membuat tabel `voting_settings` untuk menyimpan pengaturan jadwal voting
- Menambahkan field `start_time`, `end_time`, `is_active` di database
- Membuat migration file baru

### 2. Admin Dashboard Enhancements

**File yang akan diedit:**

- `src/pages/AdminDashboard.tsx`

**Perubahan yang diperlukan:**

- Menambah tab baru "Pengaturan Voting" atau mengintegrasikan ke existing tabs
- Form untuk mengatur tanggal dan waktu mulai serta berakhir voting
- Toggle untuk mengaktifkan/menonaktifkan voting
- Menampilkan status voting saat ini (Aktif/Nonaktif/Belum Dimulai/Berakhir)

### 3. Voting Page Modifications

**File yang akan diedit:**

- `src/pages/VotingPage.tsx`

**Perubahan yang diperlukan:**

- Menambahkan checks untuk jadwal voting saat halaman dimuat
- Menampilkan pesan jika voting belum mulai atau sudah berakhir
- Menampilkan countdown timer jika voting aktif
- Memblokir akses voting jika di luar jadwal

### 4. Additional Components

**File baru yang akan dibuat:**

- `src/components/VotingStatus.tsx` - Komponen untuk menampilkan status voting
- `src/hooks/useVotingSchedule.ts` - Custom hook untuk mengelola jadwal voting

### 5. Database Functions

**File baru yang akan dibuat:**

- `supabase/functions/check-voting-status/` - Function untuk validasi jadwal voting

## Dependent Files yang Akan Diedit

1. **Database Migration**: File baru untuk voting_settings table
2. **AdminDashboard.tsx**: Menambah tab/form pengaturan voting
3. **VotingPage.tsx**: Menambah validasi jadwal voting
4. **lib/supabase.ts**: Update types untuk voting settings

## Langkah Implementasi

1. ✅ Analisis struktur aplikasi existing
2. 🔄 Buat database migration untuk voting_settings table
3. 🔄 Update TypeScript types di lib/supabase.ts
4. 🔄 Buat custom hook useVotingSchedule
5. 🔄 Buat komponen VotingStatus
6. 🔄 Update AdminDashboard dengan form pengaturan jadwal
7. 🔄 Update VotingPage dengan validasi jadwal voting
8. 🔄 Testing dan debugging

## Fitur yang Akan Ditambahkan

- ✅ Admin dapat mengatur tanggal dan waktu mulai voting
- ✅ Admin dapat mengatur tanggal dan waktu berakhir voting
- ✅ Admin dapat mengaktifkan/menonaktifkan voting secara manual
- ✅ Voting hanya dapat dilakukan dalam rentang waktu yang ditentukan
- ✅ Tampilan status voting yang jelas (Aktif/Nonaktif/Belum Dimulai/Berakhir)
- ✅ Countdown timer saat voting aktif
- ✅ Pesan informatif jika mencoba voting di luar jadwal

Apakah rencana ini sudah sesuai dengan kebutuhan Anda? Silakan beri konfirmasi agar saya dapat melanjutkan implementasi.
