# Plan Implementasi Menu Registrasi Pemilih

## Informasi yang Dikumpulkan:

1. **Struktur Project**: React + TypeScript + Vite + Supabase
2. **Database Existing**:
   - Tabel `employees` dengan field `employee_id`, `has_voted`
   - Tabel `candidates` untuk calon ketua
   - Tabel `votes` untuk 记录投票
3. **Auth System**: Sudah ada AuthContext dengan Supabase auth
4. **Admin Dashboard**: Sudah ada untuk kelola data

## Fitur yang Diimplementasi:

1. **Registrasi Pemilih** dengan validasi NIP dari database employees
2. **Upload foto wajah** sebagai bagian dari registrasi
3. **Email authentication** melalui Supabase
4. **Status approval** - user harus diapprove admin untuk voting
5. **Admin approval system** untuk mengaktifkan akun voter

## Plan Detail:

### 1. Database Changes (Supabase)

- Buat tabel `voter_registrations` untuk menyimpan data registrasi yang belum approve
- Buat tabel `voter_profiles` untuk data voter yang sudah aktif
- Setup RLS policies untuk keamanan

### 2. Frontend Components

- Buat halaman `RegistrationPage.tsx` dengan form registrasi
- Update `AuthContext.tsx` untuk handle registrasi voter
- Buat komponen upload foto wajah
- Update `HomePage.tsx` untuk link ke registrasi

### 3. Admin Dashboard Updates

- Tambahkan section untuk approve voter registrations
- View daftar voter yang belum diapprove
- Action approve/reject voter

### 4. Authentication Flow

- Registrasi -> Email verification -> Pending approval -> Active voter
- Update voting system untuk hanya menerima voter yang aktif

### 5. Security & Validation

- Validasi NIP harus ada di tabel employees
- Validasi email belum terdaftar di system
- Upload foto dengan validasi format dan ukuran
- Secure storage untuk foto wajah

## File yang Akan Diedit/Dibuat:

1. **Database**: Migration SQL untuk tabel baru
2. **src/pages/RegistrationPage.tsx** (NEW)
3. **src/components/FaceCapture.tsx** (NEW)
4. **src/contexts/AuthContext.tsx** (UPDATE)
5. **src/pages/AdminDashboard.tsx** (UPDATE)
6. **src/App.tsx** (UPDATE - add registration route)
7. **src/pages/HomePage.tsx** (UPDATE - add registration link)

## Followup Steps:

1. Test registrasi flow
2. Test admin approval
3. Test voting dengan voter yang sudah diapprove
4. Validate foto upload functionality
5. Test email verification flow

## Estimated Complexity: Medium-High

- Requires database schema changes
- Multiple component creation
- Security considerations for photo upload
- Admin approval workflow integration
