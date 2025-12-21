import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function VoterVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Supabase already verified the email and saved session
        // We just need to check the session and update registration
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setStatus('error');
          setMessage('Gagal mendapatkan session: ' + sessionError.message);
          return;
        }

        if (session?.user) {
          console.log('Email verified successfully for user:', session.user.id);
          
          // Update voter_registrations with user_id (if column exists)
          const registrationId = session.user.user_metadata?.registration_id;
          if (registrationId) {
            try {
              // First try to update voter_registrations (if user_id column exists)
              const { error: updateError } = await supabase
                .from('voter_registrations')
                .update({ user_id: session.user.id })
                .eq('id', registrationId);

              if (updateError) {
                if (updateError.message.includes('user_id')) {
                  console.log('user_id column does not exist in voter_registrations, skipping update');
                  // This is expected if the column doesn't exist
                } else {
                  console.warn('Could not update voter_registrations with user_id:', updateError);
                }
                // Continue anyway, this is not critical
              } else {
                console.log('Registration updated with user_id');
              }
            } catch (err) {
              console.warn('Error updating voter_registrations user_id:', err);
              // Continue anyway
            }
          } else {
            console.warn('No registration_id found in user metadata');
          }

          // Sign out the user after successful verification
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            console.error('Error signing out:', signOutError);
            // Don't fail the process if sign out fails
          } else {
            console.log('User signed out after verification');
          }

          setStatus('success');
          setMessage('Email berhasil diverifikasi! Akun Anda sekarang menunggu persetujuan admin.');
          
          // Show success message and let user navigate manually
          // User needs admin approval before they can vote
        } else {
          // No session found
          setStatus('error');
          setMessage('Session tidak ditemukan. Silakan coba registrasi ulang.');
        }
      } catch (error: any) {
        console.error('Error in email verification:', error);
        setStatus('error');
        setMessage('Terjadi kesalahan saat memverifikasi email: ' + error.message);
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-green-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Memverifikasi Email...</h2>
              <p className="text-gray-600">
                Mohon tunggu sedang memverifikasi email Anda.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Terverifikasi!</h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                {/* <button
                  onClick={() => navigate('/vote')}
                  className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Lanjut ke Voting
                </button> */}
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifikasi Gagal</h2>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Registrasi Ulang
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

