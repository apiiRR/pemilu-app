# Plan Perbaikan: Voting Authentication Issue

## Masalah

User mengalami error "Akun Anda belum diaktivasi atau belum diapprove oleh admin. Silakan hubungi admin." padahal admin sudah approve akun tersebut.

## Informasi yang Dikumpulkan

### 1. Arsitektur Sistem

- **Database**: Supabase dengan tabel `voter_registrations` dan `voter_profiles`
- **Authentication**: Supabase Auth dengan email verification
- **Approval Flow**: Admin approve melalui RPC function `approve_voter_registration`

### 2. Error Location

Error muncul di `checkVoterEligibility` function di `src/lib/supabase.ts` ketika voter profile tidak ditemukan untuk user_id yang sudah login.

### 3. Current Flow

1. User registrasi → entry di `voter_registrations` dengan status `is_approved = false`
2. User verifikasi email → Supabase Auth membuat user, kolom `user_id` terisi di registration
3. Admin approve → RPC function `approve_voter_registration` dijalankan
4. Function seharusnya membuat entry di `voter_profiles`
5. User voting → `checkVoterEligibility` mencari voter profile

## Plan Perbaikan

### Langkah 1: Diagnosis Database

- Periksa RLS policies untuk `voter_profiles`
- Test function `approve_voter_registration`
- Verifikasi data consistency
- Check apakah voter_profiles benar-benar dibuat saat approval

### Langkah 2: Fix Function Logic

- Perbaiki function `approve_voter_registration` jika ada bug
- Pastikan function membuat voter_profiles dengan user_id yang benar
- Tambahkan error handling dan logging

### Langkah 3: Frontend Improvements

- Tambahkan debugging information di VotingPage
- Improve error messages untuk membantu troubleshooting
- Tambahkan manual voter profile creation option

### Langkah 4: Data Migration (jika diperlukan)

- Script untuk sync voter_registrations dengan voter_profiles
- Fix orphaned records

### Langkah 5: Testing

- Test approval flow end-to-end
- Test voting eligibility check
- Test error scenarios

## Files yang Akan Diedit

### 1. Database Migrations

- `supabase/migrations/20251215000001_create_voter_registration_system.sql` - Fix RLS policies dan function

### 2. Frontend Files

- `src/lib/supabase.ts` - Improve `checkVoterEligibility` dan debugging
- `src/pages/VotingPage.tsx` - Add debugging info dan better error handling
- `src/pages/AdminDashboard.tsx` - Add manual voter profile creation

### 3. New Utilities

- `src/utils/voterProfileFix.ts` - Script untuk fix voter profiles

## Expected Outcomes

1. Approved users dapat voting tanpa error
2. Better error messages untuk troubleshooting
3. Admin dapat manually fix voter profiles jika diperlukan
4. Improved logging untuk debugging

## Timeline

- Step 1: 30 menit (diagnosis)
- Step 2: 45 menit (fix function)
- Step 3: 30 menit (frontend improvements)
- Step 4: 30 menit (data migration)
- Step 5: 15 menit (testing)
- Total: ~2.5 jam
