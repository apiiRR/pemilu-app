

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Candidate } from '../lib/supabase';
import { Camera, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useVotingSchedule } from '../hooks/useVotingSchedule';
import { VotingStatus } from '../components/VotingStatus';



export default function VotingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'employee-id' | 'select-candidate' | 'selfie' | 'success'>('employee-id');
  const [employeeId, setEmployeeId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
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


  const handleEmployeeIdSubmit = async (e: React.FormEvent) => {
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
      // Clean the employee ID - remove extra whitespace
      const cleanEmployeeId = employeeId.trim();
      console.log('Checking employee ID:', cleanEmployeeId);

      // First, let's see all employees to debug
      const { data: allEmployees, error: selectError } = await supabase
        .from('employees')
        .select('*')
        .limit(10);
      
      if (selectError) {
        console.error('Error fetching employees:', selectError);
        setError(`Database error: ${selectError.message}`);
        setLoading(false);
        return;
      }

      console.log('Sample employees from database:', allEmployees);

      // Now check for specific employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', cleanEmployeeId)
        .maybeSingle();

      if (employeeError) {
        console.error('Error checking employee:', employeeError);
        setError(`Error checking employee: ${employeeError.message}`);
        setLoading(false);
        return;
      }

      if (!employee) {
        console.log('Employee not found for ID:', cleanEmployeeId);
        setError(`Nomor Induk Pegawai "${cleanEmployeeId}" tidak terdaftar. Pastikan NIP sudah diimpor oleh admin.`);
        setLoading(false);
        return;
      }

      if (employee.has_voted) {
        console.log('Employee already voted:', employee);
        setError('Anda sudah melakukan voting sebelumnya');
        setLoading(false);
        return;
      }

      console.log('Employee validation successful:', employee);
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
    setStep('selfie');
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

  const takeSelfie = () => {
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
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.5); // Higher quality for better image clarity
        setSelfieImage(imageData);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakeSelfie = () => {
    setSelfieImage(null);
    startCamera();


  };

  const submitVote = async () => {
    if (!selectedCandidate || !selfieImage) return;

    setLoading(true);
    setError('');

    try {
      console.log('Starting vote submission...', {
        employeeId,
        candidateId: selectedCandidate.id,
        selfieImageLength: selfieImage.length
      });

      // Simple approach: store base64 image directly in database (no storage needed)
      console.log('Saving vote with base64 image directly...');
      
      const { data: voteData, error: voteError } = await supabase
        .from('votes')
        .insert({
          employee_id: employeeId.trim(),
          candidate_id: selectedCandidate.id,
          selfie_url: selfieImage
        })
        .select()
        .single();

      if (voteError) {
        console.error('Vote insertion failed:', voteError);
        throw new Error(`Gagal menyimpan vote: ${voteError.message}`);
      }
      
      console.log('Vote saved successfully:', voteData);

      // Update employee voting status
      console.log('Updating employee voting status...');
      const { error: updateError } = await supabase
        .from('employees')
        .update({ has_voted: true })
        .eq('employee_id', employeeId.trim());

      if (updateError) {
        console.error('Employee update failed:', updateError);
        // Don't throw here, vote was already saved
        console.log('Vote was saved but employee update failed');
      } else {
        console.log('Employee voting status updated successfully');
      }

      console.log('Vote submission completed successfully');
      setStep('success');
      
    } catch (err) {
      console.error('Vote submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Gagal menyimpan voting: ${errorMessage}. Silakan coba lagi.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'selfie' && !selfieImage) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

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


          {step === 'employee-id' && (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleEmployeeIdSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Induk Pegawai (Contoh : 12-04-9999)
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Masukkan NIP Anda"
                    required
                  />
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
                  {loading ? 'Memproses...' : 'Lanjutkan'}
                </button>
              </form>
            </div>
          )}


          {step === 'select-candidate' && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
                Pilih Calon Ketua Serikat Pekerja
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => handleCandidateSelect(candidate)}
                    className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 sm:p-6 text-left transition-all hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold text-blue-600 flex-shrink-0">
                        {candidate.order_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{candidate.name}</h3>
                      </div>
                    </div>
                    {candidate.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">{candidate.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}


          {step === 'selfie' && selectedCandidate && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 text-center">
                Ambil Foto Selfie
              </h2>
              <p className="text-gray-600 text-center mb-4 sm:mb-6 text-sm sm:text-base">
                Anda memilih: <span className="font-semibold">{selectedCandidate.name}</span>
              </p>


              <div className="bg-gray-900 rounded-xl overflow-hidden mb-4 sm:mb-6">
                {!selfieImage ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full aspect-[3/4] object-cover"
                  />
                ) : (
                  <img src={selfieImage} alt="Selfie" className="w-full aspect-[3/4] object-cover" />
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {!selfieImage ? (
                  <>
                    <button
                      onClick={() => setStep('select-candidate')}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={takeSelfie}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                      Ambil Foto
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={retakeSelfie}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Ulangi Foto
                    </button>
                    <button
                      onClick={submitVote}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span className="hidden sm:inline">Menyimpan...</span>
                          <span className="sm:hidden">Loading...</span>
                        </>
                      ) : (
                        'Kirim Voting'
                      )}
                    </button>
                  </>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mt-4">
                  {error}
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

              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base px-4">
                Terima kasih telah berpartisipasi dalam pemilihan bakal calon ketua serikat pekerja.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <button
                  onClick={() => navigate('/')}
                  className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Beranda
                </button>
                <button
                  onClick={() => navigate('/results')}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm sm:text-base"
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
