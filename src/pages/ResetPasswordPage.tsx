import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword, updatePassword } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Step management
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Check if we have token from URL (meaning user clicked the reset link)
  useEffect(() => {
    // Try to get token from query parameters first
    let token = searchParams.get('token');
    let type = searchParams.get('type');
    
    // Check for error parameters first
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      console.log('URL Hash Analysis:', hash);
      
      if (error && errorCode === 'otp_expired') {
        console.log('❌ OTP expired error detected:', errorDescription);
        setError('Link reset password sudah expired atau sudah digunakan. Silakan request link baru.');
        // Clear the hash to prevent repeated error display
        window.history.replaceState({}, '', '/reset-password');
        return;
      }
      
      // Parse token from hash if no query params
      if (!token) {
        // Supabase uses 'access_token' for recovery tokens, not 'token'
        token = hashParams.get('access_token');
        if (!token) {
          token = hashParams.get('token'); // fallback
        }
        type = hashParams.get('type');
        console.log('Parsed from hash:', { token: token ? 'exists' : 'none', type, isAccessToken: !!hashParams.get('access_token') });
      }
    }
    
    console.log('URL Parameters Analysis:', {
      queryToken: searchParams.get('token') ? 'exists' : 'none',
      queryType: searchParams.get('type'),
      hashToken: token ? 'exists' : 'none', 
      hashType: type,
      fullUrl: window.location.href,
      fullHash: window.location.hash,
      allSearchParams: Object.fromEntries(searchParams.entries())
    });
    
    if (token && type === 'recovery') {
      console.log('✅ Valid recovery token found, switching to confirm step');
      setStep('confirm');
    } else {
      console.log('❌ No valid token found, staying on request step');
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email.trim().toLowerCase());
      
      if (error) {
        setError(`Gagal mengirim email reset: ${error.message}`);
        setLoading(false);
        return;
      }

      setSuccess('Email reset password telah dikirim! Silakan cek inbox dan folder spam Anda.');
      setEmail('');
      
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Terjadi kesalahan saat mengirim email reset');
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak sama');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        setError(`Gagal update password: ${error.message}`);
        setLoading(false);
        return;
      }

      setSuccess('Password berhasil diupdate! Anda akan diarahkan ke halaman voting.');
      
      // Redirect to voting page after successful password update
      setTimeout(() => {
        navigate('/vote');
      }, 2000);
      
    } catch (err) {
      console.error('Update password error:', err);
      setError('Terjadi kesalahan saat update password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/vote')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kembali ke Voting
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {step === 'request' ? 'Reset Password' : 'Set Password Baru'}
            </h1>
            
            <p className="text-gray-600 text-sm">
              {step === 'request' 
                ? 'Masukkan email Anda untuk menerima link reset password'
                : 'Masukkan password baru untuk akun Anda'
              }
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Request Reset Form */}
          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Masukkan email Anda"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim Email...
                  </>
                ) : (
                  'Kirim Link Reset'
                )}
              </button>
            </form>
          )}

          {/* Confirm New Password Form */}
          {step === 'confirm' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Masukkan password baru"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Konfirmasi password baru"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan Password...
                  </>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </form>
          )}

          {/* Additional Info */}
          <div className="mt-6 text-center text-xs text-gray-500">
            {step === 'request' ? (
              <p>
                Tidak menerima email? Cek folder spam atau{' '}
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  coba lagi
                </button>
              </p>
            ) : (
              <p>
                Password akan disimpan dan Anda akan diarahkan ke halaman voting
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
