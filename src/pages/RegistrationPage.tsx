import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Function to clear all Supabase related local storage
const clearSupabaseSession = () => {
  try {
    // Get the Supabase project URL to identify the correct localStorage keys
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const urlParts = new URL(supabaseUrl);
      const projectRef = urlParts.hostname.split('.')[0];
      
      // Clear Supabase auth related localStorage
      localStorage.removeItem(`sb-${projectRef}-auth-token`);
      localStorage.removeItem(`sb-${projectRef}-refresh-token`);
    }
    
    // Clear generic Supabase keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Supabase session cleared from localStorage');
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }
};

interface RegistrationData {
  employeeId: string;
  email: string;
  password: string;
  facePhoto: File | null;
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationData>({
    employeeId: '',
    email: '',
    password: '',
    facePhoto: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'photo' | 'verification'>('form');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateEmployeeId = async (employeeId: string): Promise<{ isValid: boolean; message: string }> => {
    try {
      // First check if NIP exists in employees table
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('employee_id', employeeId)
        .single();

      if (employeeError || !employee) {
        console.error('Employee not found:', employeeError);
        return { isValid: false, message: 'NIP tidak ditemukan di database employee. Silakan periksa NIP Anda.' };
      }

      // Check if NIP is already registered using direct query (fallback method)
      const { data: existingRegistration, error: regError } = await supabase
        .from('voter_registrations')
        .select('email, is_approved')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (regError) {
        console.warn('Error checking existing registration:', regError);
        // Continue with basic validation
      }

      if (existingRegistration) {
        if (existingRegistration.is_approved) {
          return { 
            isValid: false, 
            message: `NIP ini sudah digunakan untuk registrasi dengan email ${existingRegistration.email} dan sudah disetujui. Silakan gunakan NIP lain.` 
          };
        } else {
          return { 
            isValid: false, 
            message: 'NIP ini sedang dalam proses registrasi dan menunggu persetujuan. Silakan tunggu atau gunakan NIP lain.' 
          };
        }
      }

      return { isValid: true, message: 'NIP tersedia untuk registrasi' };
    } catch (error) {
      console.error('Error in validateEmployeeId:', error);
      return { isValid: false, message: 'Terjadi kesalahan saat validasi NIP. Silakan coba lagi.' };
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Check if email already exists in voter_profiles (approved registrations)
      const { data: voterProfile, error: profileError } = await supabase
        .from('voter_profiles')
        .select('email')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking voter profile email:', profileError);
        return true; // Assume exists to be safe
      }

      if (voterProfile) {
        return true; // Email already has active voter profile
      }

      // Check if email exists in approved registrations
      const { data: approvedRegistration, error: regError } = await supabase
        .from('voter_registrations')
        .select('email')
        .eq('email', email)
        .eq('is_approved', true)
        .single();

      if (regError && regError.code !== 'PGRST116') {
        console.error('Error checking approved registration email:', regError);
        return true; // Assume exists to be safe
      }

      return !!approvedRegistration;
    } catch (error) {
      console.error('Error in checkEmailExists:', error);
      return true;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate NIP
      const employeeValidation = await validateEmployeeId(formData.employeeId.trim());
      if (!employeeValidation.isValid) {
        setError(employeeValidation.message);
        setLoading(false);
        return;
      }

      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email.trim());
      if (emailExists) {
        setError('Email sudah terdaftar dalam sistem registrasi');
        setLoading(false);
        return;
      }

      // Move to photo step
      setStep('photo');
      setLoading(false);

    } catch (error) {
      console.error('Error in form validation:', error);
      setError('Terjadi kesalahan saat validasi data. Silakan coba lagi.');
      setLoading(false);
    }
  };



  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Tidak dapat mengakses kamera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Set canvas to portrait dimensions for better image quality
        const maxWidth = 480;
        const maxHeight = 640;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;

        // Calculate aspect ratio and resize
        let newWidth = maxWidth;
        let newHeight = maxHeight;

        if (videoWidth > videoHeight) {
          newHeight = (videoHeight * maxWidth) / videoWidth;
        } else {
          newWidth = (videoWidth * maxHeight) / videoHeight;
        }

        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;

        // Draw and compress with higher quality for better image clarity
        context.drawImage(videoRef.current, 0, 0, newWidth, newHeight);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.5);
        setCapturedPhoto(imageData);
        
        // Create File object for compatibility with existing code
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'face-photo.jpg', { type: 'image/jpeg' });
            setFormData(prev => ({ ...prev, facePhoto: file }));
          }
        }, 'image/jpeg', 0.5);
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setFormData(prev => ({ ...prev, facePhoto: null }));
    startCamera();
  };

  // Auto-start camera when entering photo step
  useEffect(() => {
    if (step === 'photo' && !capturedPhoto) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const handleRegistration = async () => {
    if (!formData.facePhoto) {
      setError('Silakan upload atau ambil foto wajah Anda');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Double-check NIP availability before registration
      const employeeValidation = await validateEmployeeId(formData.employeeId.trim());
      if (!employeeValidation.isValid) {
        setError(employeeValidation.message);
        setLoading(false);
        return;
      }

      // Create voter registration record with proper error handling
      const { data: registrationData, error: registrationError } = await supabase
        .from('voter_registrations')
        .insert({
          employee_id: formData.employeeId.trim(),
          email: formData.email.trim(),
          face_photo_url: null // Will be uploaded later if needed
        })
        .select()
        .single();

      if (registrationError) {
        // Handle specific duplicate key error
        if (registrationError.code === '23505') {
          setError('NIP ini sudah digunakan untuk registrasi voter. Silakan gunakan NIP lain.');
          setLoading(false);
          return;
        }
        throw new Error(`Gagal menyimpan registrasi: ${registrationError.message}`);
      }

      // Create Supabase auth user with proper redirect URL
      const redirectUrl = import.meta.env.PROD 
        ? `${window.location.origin}/voter/verify` 
        : `${window.location.origin}/voter/verify`;
        
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            employee_id: formData.employeeId.trim(),
            role: 'voter',
            registration_id: registrationData.id
          }
        }
      });

      if (authError) {
        throw new Error(`Gagal membuat akun: ${authError.message}`);
      }

      // Update registration with face photo (base64 data URL)
      if (capturedPhoto) {
        await supabase
          .from('voter_registrations')
          .update({ face_photo_url: capturedPhoto })
          .eq('id', registrationData.id);
      }

      setStep('verification');
      setSuccess('Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.');
      
      // Clear Supabase session from localStorage after successful registration
      clearSupabaseSession();
      
    } catch (error: any) {
      console.error('Error in registration:', error);
      
      // Handle specific database constraint errors
      if (error.code === '23505') {
        setError('NIP atau email sudah digunakan. Silakan gunakan data lain.');
      } else {
        setError(error.message || 'Terjadi kesalahan saat registrasi. Silakan coba lagi.');
      }
      
      setLoading(false);
    }
  };

  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registrasi Berhasil!</h2>
            <p className="text-gray-600 mb-6">
              Kami telah mengirim email verifikasi ke <strong>{formData.email}</strong>.
              Silakan cek inbox Anda dan klik link verifikasi untuk mengaktifkan akun.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Setelah email terverifikasi, akun Anda akan menunggu persetujuan admin untuk bisa voting.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Kembali ke Beranda
              </button>
              {/* <button
                onClick={() => {
                  setStep('form');
                  setFormData({ employeeId: '', email: '', password: '', facePhoto: null });
                  setCapturedPhoto(null);
                  setSuccess('');
                }}
                className="w-full bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Registrasi Voter Lain
              </button> */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'photo') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl p-6">
            <div className="text-center mb-6">
              <Camera className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900">Ambil Foto Wajah</h2>
              <p className="text-gray-600 text-sm">Foto wajah diperlukan untuk validasi identitas voter</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl overflow-hidden mb-4 sm:mb-6">
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-[3/4] object-cover"
                />
              ) : (
                <img src={capturedPhoto} alt="Foto wajah" className="w-full aspect-[3/4] object-cover" />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-col gap-3">
              {!capturedPhoto ? (
                <>
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Ambil Foto
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={retakePhoto}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition-colors"
                  >
                    Ulangi Foto
                  </button>
                  <button
                    onClick={handleRegistration}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Memproses...' : 'Daftar Voter'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl p-6">
          <div className="text-center mb-6">
            <UserPlus className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900">Registrasi Voter</h2>
            <p className="text-gray-600 text-sm">Daftar sebagai voter untuk pemilihan ketua serikat pekerja</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Induk Pegawai (NIP)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  placeholder="Masukkan NIP Anda"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Buat password yang kuat"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
            </div>

            <div className="flex gap-3">
              <Link
                to="/"
                className="flex-1 bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 transition-colors text-center"
              >
                Kembali
              </Link>
              <button
                type="submit"
                disabled={loading || !formData.employeeId || !formData.email || !formData.password}
                className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Validasi...' : 'Lanjut Upload Foto'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Persyaratan Registrasi:</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• NIP harus terdaftar di database perusahaan</li>
              <li>• Email belum pernah digunakan untuk registrasi voter</li>
              <li>• Foto wajah diperlukan untuk validasi identitas</li>
              <li>• Akun akan aktif setelah approval admin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
