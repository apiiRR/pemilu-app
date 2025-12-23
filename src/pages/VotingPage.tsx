

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, Candidate, VoterProfile, checkVoterEligibility, updateVoterVoteStatus, createVoterProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { useVotingSchedule } from '../hooks/useVotingSchedule';
import { VotingStatus } from '../components/VotingStatus';

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

export default function VotingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<'email-login' | 'select-candidate' | 'success' | 'already-voted'>('email-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null);

  
  // Voting schedule state
  const { votingStatus, loading: statusLoading } = useVotingSchedule();
  const [checkedSchedule, setCheckedSchedule] = useState(false);


  useEffect(() => {
    loadCandidates();
  }, []);

  // Check voting schedule when component mounts
  useEffect(() => {
    if (!statusLoading && !checkedSchedule) {
      setCheckedSchedule(true);
      // If voting is not open, show schedule error
      if (!votingStatus.isOpen) {
        setError(getVotingScheduleErrorMessage());
      }
    }
  }, [statusLoading, checkedSchedule, votingStatus]);

  // Get error message based on voting status
  const getVotingScheduleErrorMessage = (): string => {
    switch (votingStatus.status) {
      case 'inactive':
        return 'Voting saat ini tidak aktif. Silakan hubungi admin untuk aktivasi voting.';
      case 'not-started':
        const startTime = votingStatus.settings ? new Date(votingStatus.settings.start_time).toLocaleString('id-ID') : 'waktu yang belum ditentukan';
        return `Voting belum dimulai. Voting akan dimulai pada ${startTime}.`;
      case 'ended':
        return 'Voting telah berakhir. Terima kasih atas partisipasi Anda.';
      default:
        return 'Voting tidak tersedia saat ini. Silakan hubungi admin.';
    }
  };



  const loadCandidates = async () => {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .order('order_number');
    if (data) setCandidates(data);

  };


  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check voting schedule first
    if (!votingStatus.isOpen) {
      setError(getVotingScheduleErrorMessage());
      setLoading(false);
      return;
    }

    try {
      // Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError('Email atau password salah');
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Gagal masuk ke sistem');
        setLoading(false);
        return;
      }

      // Check if email is verified
      if (!data.user.email_confirmed_at) {
        setError('Email Anda belum diverifikasi. Silakan cek email Anda dan klik link verifikasi.');
        setLoading(false);
        return;
      }

      // Check voter eligibility
      console.log('Checking voter eligibility for user:', data.user.id);
      const eligibilityCheck = await checkVoterEligibility(data.user.id);
      console.log('Eligibility check result:', eligibilityCheck);
      
      if (!eligibilityCheck.eligible) {
        console.error('User not eligible:', eligibilityCheck.error);
        
        // Check if the user has already voted
        if (eligibilityCheck.profile) {
          // Clear Supabase session from localStorage when user is already voted
          clearSupabaseSession();
          
          setStep('already-voted');
          setVoterProfile(eligibilityCheck.profile);
        } else {
          setError(eligibilityCheck.error || 'Anda tidak berhak untuk voting');
        }
        
        setLoading(false);
        return;
      }

      // Set voter profile and proceed
      setVoterProfile(eligibilityCheck.profile || null);
      console.log('Voter validation successful:', eligibilityCheck.profile);
      setLoading(false);
      setStep('select-candidate');
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Terjadi kesalahan yang tidak terduga');
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate || !voterProfile) return;

    setLoading(true);
    setError('');

    try {
      console.log('Starting vote submission...', {
        voterProfile: voterProfile.employee_id,
        candidateId: selectedCandidate.id
      });

      // Insert vote record
      const { data: voteData, error: voteError } = await supabase
        .from('votes')
        .insert({
          employee_id: voterProfile.employee_id,
          candidate_id: selectedCandidate.id,
          selfie_url: 'no_selfie_required' // Placeholder since no selfie is needed
        })
        .select()
        .single();

      if (voteError) {
        console.error('Vote insertion failed:', voteError);
        throw new Error(`Gagal menyimpan vote: ${voteError.message}`);
      }
      
      console.log('Vote saved successfully:', voteData);

      // Update voter profile voting status
      console.log('Updating voter profile voting status...');
      try {
        await updateVoterVoteStatus(voterProfile.id);
        console.log('Voter profile voting status updated successfully');
      } catch (updateError) {
        console.error('Voter profile update failed:', updateError);
        // Don't throw here, vote was already saved
        console.log('Vote was saved but voter profile update failed');
      }

      console.log('Vote submission completed successfully');
      
      // Clear Supabase session from localStorage after successful voting
      clearSupabaseSession();
      
      // Logout user and redirect to home
      await signOut();
      setStep('success');
      
    } catch (err) {
      console.error('Vote submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Clear Supabase session from localStorage after failed voting
      clearSupabaseSession();
      
      setError(`Gagal menyimpan voting: ${errorMessage}. Silakan coba lagi.`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">


        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 text-center mb-4 sm:mb-8">
            Pemilihan Bakal Calon Ketua Serikat Pekerja
          </h1>

          {/* Voting Status Display */}
          <div className="mb-4 sm:mb-8">
            <VotingStatus showDetails={false} />
          </div>


          {step === 'email-login' && (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleEmailLoginSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Masukkan email Anda"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Masukkan password Anda"
                    required
                  />
                </div>
                <div className="text-right">
                  <Link
                    to="/reset-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            </div>
          )}

          {step === 'select-candidate' && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
                Pilih Calon Ketua Serikat Pekerja
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleCandidateSelect(candidate)}
                    className={`bg-white border-2 rounded-xl p-4 sm:p-6 text-left transition-all hover:shadow-lg ${
                      selectedCandidate?.id === candidate.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold text-blue-600 flex-shrink-0">
                        {candidate.order_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{candidate.name}</h3>
                        {selectedCandidate?.id === candidate.id && (
                          <span className="text-sm text-blue-600 font-medium">✓ Terpilih</span>
                        )}
                      </div>
                    </div>
                    {candidate.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">{candidate.description}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Voting Action Buttons */}
              {selectedCandidate && (
                <div className="max-w-md mx-auto">
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-center text-sm text-gray-700">
                      Anda memilih: <span className="font-semibold text-blue-700">{selectedCandidate.name}</span>
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleVoteSubmit}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Menyimpan Vote...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Kirim Voting
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition-colors"
                    >
                      Batal Pilih
                    </button>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mt-4">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}





          {step === 'success' && (
            <div className="text-center py-8 sm:py-12">
              <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Voting Berhasil!
              </h2>

              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base px-4">
                Terima kasih telah berpartisipasi dalam pemilihan bakal calon ketua serikat pekerja.
              </p>

              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base px-4">
                Anda telah keluar dari sistem secara otomatis.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <button
                  onClick={() => navigate('/')}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Kembali ke Beranda
                </button>
                <button
                  onClick={() => navigate('/results')}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Lihat Hasil Voting
                </button>
              </div>
            </div>
          )}

          {step === 'already-voted' && (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 text-orange-500 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Anda Sudah Melakukan Voting
              </h2>

              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base px-4">
                Akun Anda telah digunakan untuk voting sebelumnya.
              </p>



              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base px-4">
                Setiap voter hanya dapat voting sekali. Terima kasih atas partisipasi Anda.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <button
                  onClick={() => navigate('/')}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Kembali ke Beranda
                </button>
                <button
                  onClick={() => navigate('/results')}
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Lihat Hasil Voting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
