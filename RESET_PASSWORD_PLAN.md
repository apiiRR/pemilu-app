# Plan Implementasi Fitur Reset Password

## Informasi yang Dikumpulkan

- **Project Structure**: React + TypeScript + Vite + Supabase
- **Current Auth**: Menggunakan Supabase Auth dengan email/password
- **Voting Page**: Sudah ada form login di VotingPage.tsx di step 'email-login'
- **Existing Context**: AuthContext.tsx sudah ada untuk manajemen authentication
- **Routing**: App.tsx sudah setup dengan React Router

## Plan Implementasi

### 1. Modifikasi VotingPage.tsx

- Tambahkan link "Lupa Password?" di bawah form password
- Tambahkan state untuk mengelola step reset password
- Tambahkan form untuk input email reset password

### 2. Buat Halaman Reset Password Baru

- Buat file `src/pages/ResetPasswordPage.tsx`
- Implementasi form untuk input email reset
- Implementasi form untuk input password baru dengan token
- Tampilan success/error

### 3. Update Routing

- Tambahkan route `/reset-password` di App.tsx
- Tambahkan route `/reset-password/confirm` untuk konfirmasi dengan token

### 4. Update AuthContext

- Tambahkan fungsi `resetPassword` untuk mengirim email reset
- Tambahkan fungsi `updatePassword` untuk update password baru

### 5. Update Navigation

- Tambahkan navigasi dari VotingPage ke ResetPasswordPage
- Tambahkan navigasi kembali dari ResetPasswordPage

## File yang Akan Dimodifikasi/Dibuat

1. `src/pages/VotingPage.tsx` - Tambah link dan form reset password
2. `src/pages/ResetPasswordPage.tsx` - **BARU** - Halaman reset password lengkap
3. `src/contexts/AuthContext.tsx` - Tambah fungsi reset password
4. `src/App.tsx` - Tambah routes baru

## Follow-up Steps

1. Test reset password flow di browser
2. Pastikan email reset terkirim melalui Supabase
3. Test konfirmasi password baru dengan token
4. Test integrasi dengan sistem voting yang sudah ada
