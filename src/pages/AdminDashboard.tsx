






import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, Candidate, Employee, Vote, VotingSettings, updateVotingSettings, getVotingSettings, deleteEmployee, deleteVoteAndResetStatus, bulkDeleteVotesAndResetStatus } from '../lib/supabase';
import { LogOut, Plus, Trash2, Upload, Users, Image, Eye, Settings, Clock, Check, X, UserCheck, XSquare } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'candidates' | 'employees' | 'voter-registrations' | 'votes' | 'settings'>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [votes, setVotes] = useState<(Vote & { candidate_name: string })[]>([]);
  const [voterRegistrations, setVoterRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  
  
  // Voting settings state
  const [votingSettings, setVotingSettings] = useState<VotingSettings | null>(null);
  const [votingName, setVotingName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isActive, setIsActive] = useState(false);

  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateDescription, setCandidateDescription] = useState('');
  const [candidateOrder, setCandidateOrder] = useState('');



  const [employeeIds, setEmployeeIds] = useState('');
  const [employeeNames, setEmployeeNames] = useState('');
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);
  const [selectedVoterDetail, setSelectedVoterDetail] = useState<any>(null);






  useEffect(() => {
    // Tunggu loading selesai sebelum cek user
    if (authLoading) {
      // Auth masih loading, tunggu
      return;
    }
    
    if (!user) {
      // User sudah di-load dan tidak ada (belum login)
      navigate('/hidupJokowi/login');
      return;
    }
    
    // Check if user is admin
    checkAdminAccess();
  }, [user, authLoading, activeTab]); // Include activeTab to reload data when tab changes

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
        return;
      }

      if (!adminUser) {
        // User is not admin, redirect to home
        alert('Anda tidak memiliki akses ke halaman admin');
        navigate('/');
        return;
      }

      // User is admin, load data
      loadData();
    } catch (err) {
      console.error('Unexpected error checking admin access:', err);
      navigate('/');
    }
  };


  // Load voting settings when settings tab is active
  useEffect(() => {
    if (activeTab === 'settings') {
      loadVotingSettings();
    }
  }, [activeTab]);

  // Load voting settings
  const loadVotingSettings = async () => {
    try {
      const settings = await getVotingSettings();
      setVotingSettings(settings);
      
      if (settings) {
        setVotingName(settings.voting_name);
        setStartTime(formatDateTimeForInput(settings.start_time));
        setEndTime(formatDateTimeForInput(settings.end_time));
        setIsActive(settings.is_active);
      } else {
        // Set default values for new settings
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        setVotingName('Pemilihan Ketua Serikat Pekerja');
        setStartTime(formatDateTimeForInput(tomorrow.toISOString()));
        setEndTime(formatDateTimeForInput(dayAfter.toISOString()));
        setIsActive(false);
      }
    } catch (error) {
      console.error('Error loading voting settings:', error);
    }
  };


  // Format date for input field (YYYY-MM-DDTHH:MM) - convert to local time
  const formatDateTimeForInput = (dateString: string): string => {
    const date = new Date(dateString);
    // Convert to local time before formatting
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };



  // Convert local datetime input to UTC string for database
  const formatDateTimeForDatabase = (localDateTimeString: string): string => {
    // input type="datetime-local" returns local time, we need to store as UTC
    // Don't convert - JavaScript Date automatically handles this when toISOString() is called
    const localDate = new Date(localDateTimeString);
    return localDate.toISOString();
  };

  // Handle update voting settings
  const handleUpdateVotingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate times
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      if (startDate >= endDate) {
        alert('Waktu berakhir harus lebih lambat dari waktu mulai');
        setLoading(false);
        return;
      }

      if (startDate <= new Date()) {
        if (!confirm('Waktu mulai sudah lewat. Tetap simpan pengaturan ini?')) {
          setLoading(false);
          return;
        }
      }


      const settingsData = {
        voting_name: votingName.trim() || 'Pemilihan Ketua Serikat Pekerja',
        start_time: formatDateTimeForDatabase(startTime),
        end_time: formatDateTimeForDatabase(endTime),
        is_active: isActive
      };

      console.log('Saving settings with converted times:', settingsData);

      const savedSettings = await updateVotingSettings(settingsData);
      
      // Update local state immediately to reflect changes
      setVotingSettings(savedSettings);
      
      // Also reload to ensure we have the latest data
      await loadVotingSettings();
      
      alert('Pengaturan voting berhasil diperbarui!');
      
    } catch (error) {
      console.error('Error updating voting settings:', error);
      alert(`Gagal memperbarui pengaturan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };


  const loadData = async () => {
    console.log('Loading data for tab:', activeTab);
    
    if (activeTab === 'candidates') {
      console.log('Loading candidates...');
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('order_number');
      
      if (error) {
        console.error('Error loading candidates:', error);
      } else {
        console.log('Candidates loaded:', data);
        setCandidates(data || []);
      }
    } else if (activeTab === 'employees') {
      console.log('Loading employees...');
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading employees:', error);
      } else {
        console.log('Employees loaded:', data);
        setEmployees(data || []);
      }
    } else if (activeTab === 'voter-registrations') {
      console.log('Loading voter registrations...');
      // Load all voter registrations including those who haven't verified email yet
      const { data, error } = await supabase
        .from('voter_registrations')
        .select('*')
        .order('registration_date', { ascending: false });
      
      if (error) {
        console.error('Error loading voter registrations:', error);
      } else {
        console.log('Voter registrations loaded:', data);
        setVoterRegistrations(data || []);
      }
    } else if (activeTab === 'votes') {
      console.log('Loading votes...');
      const { data, error } = await supabase
        .from('votes')
        .select(`
          *,
          candidates (name)
        `)
        .order('voted_at', { ascending: false });
      
      if (error) {
        console.error('Error loading votes:', error);
      } else {
        console.log('Votes loaded:', data);
        if (data) {
          setVotes(data.map(v => ({
            ...v,
            candidate_name: (v.candidates as any)?.name || 'Unknown'
          })));
        }
      }
    }
  };



  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate inputs
    if (!candidateName.trim()) {
      alert('Nama calon harus diisi');
      setLoading(false);
      return;
    }

    if (!candidateOrder.trim()) {
      alert('Nomor urut harus diisi');
      setLoading(false);
      return;
    }

    const orderNumber = parseInt(candidateOrder);
    if (isNaN(orderNumber)) {
      alert('Nomor urut harus berupa angka');
      setLoading(false);
      return;
    }

    try {
      console.log('=== ADDING CANDIDATE ===');
      console.log('Current user:', user);
      console.log('User authenticated:', !!user);
      
      // Test connection first
      console.log('Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('candidates')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Database connection test failed:', testError);
        alert(`Koneksi database gagal: ${testError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Database connection OK, test data:', testData);

      const candidateData = {
        name: candidateName.trim(),
        description: candidateDescription.trim() || null,
        order_number: orderNumber
      };

      console.log('Inserting candidate data:', candidateData);

      const { data, error } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select();

      console.log('Supabase response - data:', data);
      console.log('Supabase response - error:', error);

      if (error) {
        console.error('Supabase insert error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        alert(`Gagal menambahkan calon: ${error.message}\nKode: ${error.code}`);
        return;
      }

      console.log('Candidate added successfully!', data);
      
      // Clear form
      setCandidateName('');
      setCandidateDescription('');
      setCandidateOrder('');
      setShowAddCandidate(false);
      
      // Force reload candidates specifically
      console.log('Reloading candidates...');
      const { data: freshCandidates } = await supabase
        .from('candidates')
        .select('*')
        .order('order_number');
      
      if (freshCandidates) {
        console.log('Fresh candidates loaded:', freshCandidates);
        setCandidates(freshCandidates);
      }
      
      alert('Calon berhasil ditambahkan!');
      
    } catch (err) {
      console.error('Unexpected error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      alert(`Terjadi kesalahan yang tidak terduga: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('Yakin ingin menghapus calon ini?')) return;

    await supabase.from('candidates').delete().eq('id', id);
    loadData();
  };

  const handleImportEmployees = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const ids = employeeIds
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const names = employeeNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    // Validate that we have matching numbers of NIPs and names
    if (ids.length !== names.length) {
      alert(`Jumlah NIP (${ids.length}) dan nama (${names.length}) harus sama`);
      setLoading(false);
      return;
    }

    const employeeData = ids.map((id, index) => ({
      employee_id: id,
      employee_name: names[index] || null,
      has_voted: false
    }));

    const { error } = await supabase
      .from('employees')
      .upsert(employeeData, { onConflict: 'employee_id' });

    if (!error) {
      setEmployeeIds('');
      setEmployeeNames('');
      loadData();
      alert(`Berhasil menambahkan ${ids.length} pegawai`);
    } else {
      alert('Gagal mengimpor pegawai');
    }
    setLoading(false);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Yakin ingin menghapus employee ini beserta semua data terkait (votes, voter profile, registrasi)?')) return;

    setLoading(true);
    try {
      const result = await deleteEmployee(employeeId);
      
      if (result.success) {
        alert(result.message || 'Employee berhasil dihapus');
        // Reload employees data
        if (activeTab === 'employees') {
          loadData();
        }
      } else {
        alert(`Gagal menghapus employee: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVoter = async (registrationId: string) => {
    if (!confirm('Apakah Anda yakin ingin menyetujui voter ini?')) return;

    try {
      const { error } = await supabase.rpc('approve_voter_registration', {
        registration_id: registrationId,
        approver_id: user?.id
      });

      if (error) {
        throw error;
      }

      alert('Voter berhasil disetujui!');
      loadData();
    } catch (error: any) {
      console.error('Error approving voter:', error);
      alert(`Gagal menyetujui voter: ${error.message}`);
    }
  };

  const handleRejectVoter = async (registrationId: string) => {
    if (!confirm('Apakah Anda yakin ingin menolak voter ini?')) return;

    try {
      const { error } = await supabase
        .from('voter_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) {
        throw error;
      }

      alert('Registrasi voter berhasil ditolak!');
      loadData();
    } catch (error: any) {
      console.error('Error rejecting voter:', error);
      alert(`Gagal menolak voter: ${error.message}`);
    }
  };

  const handleShowVoterDetail = async (employeeId: string) => {
    try {
      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      // Get voter profile details
      const { data: voterProfile, error: profileError } = await supabase
        .from('voter_profiles')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      // Get voting registration details
      const { data: registration, error: registrationError } = await supabase
        .from('voter_registrations')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      // If employee data is not found, show error
      if (employeeError) {
        alert('Data voter tidak ditemukan');
        return;
      }

      const voterDetail = {
        employee: employee || null,
        voterProfile: voterProfile || null,
        registration: registration || null
      };

      setSelectedVoterDetail(voterDetail);
    } catch (error: any) {
      console.error('Error fetching voter detail:', error);
      alert('Gagal memuat detail voter');
    }
  };

  // Vote selection and deletion functions
  const handleSelectVote = (employeeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedVotes(prev => [...prev, employeeId]);
    } else {
      setSelectedVotes(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAllVotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedVotes(votes.map(vote => vote.employee_id));
    } else {
      setSelectedVotes([]);
    }
  };

  const handleDeleteSingleVote = async (employeeId: string) => {
    if (!confirm('Yakin ingin menghapus vote ini dan mereset status voting user?')) return;

    setLoading(true);
    try {
      const result = await deleteVoteAndResetStatus(employeeId);
      
      if (result.success) {
        alert(result.message || 'Vote berhasil dihapus dan status voting direset');
        // Reload votes data
        if (activeTab === 'votes') {
          loadData();
        }
        // Also refresh employees to update has_voted status
        if (activeTab === 'employees') {
          loadData();
        }
        // Remove from selected votes if it was selected
        setSelectedVotes(prev => prev.filter(id => id !== employeeId));
      } else {
        alert(`Gagal menghapus vote: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error deleting single vote:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteVotes = async () => {
    if (selectedVotes.length === 0) {
      alert('Tidak ada vote yang dipilih');
      return;
    }

    if (!confirm(`Yakin ingin menghapus ${selectedVotes.length} vote dan mereset status voting semua user yang dipilih?`)) return;

    setLoading(true);
    try {
      const result = await bulkDeleteVotesAndResetStatus(selectedVotes);
      
      if (result.success) {
        alert(result.message || `${result.successCount} vote berhasil dihapus`);
        // Reload votes data
        if (activeTab === 'votes') {
          loadData();
        }
        // Also refresh employees to update has_voted status
        if (activeTab === 'employees') {
          loadData();
        }
        setSelectedVotes([]);
      } else {
        alert(`Gagal bulk delete votes: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error bulk deleting votes:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVotingStatus = async (employeeId: string) => {
    if (!confirm('Yakin ingin mereset status voting user ini? (User akan bisa voting lagi)')) return;

    setLoading(true);
    try {
      // Just reset the status without deleting vote
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ has_voted: false })
        .eq('employee_id', employeeId);

      if (employeeError) {
        throw employeeError;
      }



      alert('Status voting berhasil direset');
      // Reload data
      loadData();
    } catch (error: any) {
      console.error('Error resetting voting status:', error);
      alert(`Gagal mereset status voting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Employee selection functions
  const handleSelectEmployee = (employeeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAllEmployees = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmployees(employees.map(emp => emp.employee_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleBulkResetVotingStatus = async () => {
    if (selectedEmployees.length === 0) {
      alert('Tidak ada employee yang dipilih');
      return;
    }

    if (!confirm(`Yakin ingin mereset status voting ${selectedEmployees.length} user yang dipilih? (User akan bisa voting lagi)`)) return;

    setLoading(true);
    try {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const employeeId of selectedEmployees) {
        try {
          // Reset employee status
          const { error: employeeError } = await supabase
            .from('employees')
            .update({ has_voted: false })
            .eq('employee_id', employeeId);

          if (employeeError) {
            throw employeeError;
          }

          successCount++;
          results.push({ employeeId, success: true });

        } catch (error: any) {
          console.error(`Error resetting status for employee ${employeeId}:`, error);
          errorCount++;
          results.push({ employeeId, success: false, error: error.message });
        }
      }

      const message = `Berhasil mereset status ${successCount} user, ${errorCount} error`;
      alert(message);

      // Reload data
      loadData();
      setSelectedEmployees([]);

    } catch (error: any) {
      console.error('Error in bulk reset voting status:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-sm text-gray-600">{user.email}</span>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 sm:gap-2 text-red-600 hover:text-red-700 font-medium p-2 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">


          <div className="border-b">
            <nav className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('candidates')}
                className={`flex-shrink-0 px-3 sm:px-6 py-4 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'candidates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">Kelola </span>Calon
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`flex-shrink-0 px-3 sm:px-6 py-4 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'employees'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">Kelola </span>Pegawai
              </button>
              <button
                onClick={() => setActiveTab('voter-registrations')}
                className={`flex-shrink-0 px-3 sm:px-6 py-4 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'voter-registrations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">Approval </span>Voter
              </button>
              <button
                onClick={() => setActiveTab('votes')}
                className={`flex-shrink-0 px-3 sm:px-6 py-4 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'votes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">Detail </span>Voting
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-shrink-0 px-3 sm:px-6 py-4 font-medium border-b-2 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                  activeTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Pengaturan </span>Voting
              </button>

            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'candidates' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Daftar Calon</h2>
                  <button
                    onClick={() => setShowAddCandidate(!showAddCandidate)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Calon
                  </button>
                </div>

                {showAddCandidate && (
                  <form onSubmit={handleAddCandidate} className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Nama Calon"
                        className="px-4 py-2 border rounded-lg"
                        required
                      />
                      <input
                        type="number"
                        value={candidateOrder}
                        onChange={(e) => setCandidateOrder(e.target.value)}
                        placeholder="Nomor Urut"
                        className="px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <textarea
                      value={candidateDescription}
                      onChange={(e) => setCandidateDescription(e.target.value)}
                      placeholder="Visi & Misi (opsional)"
                      className="w-full px-4 py-2 border rounded-lg mb-4"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {loading ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCandidate(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          {candidate.order_number}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                          {candidate.description && (
                            <p className="text-sm text-gray-600 line-clamp-1">{candidate.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Daftar Pegawai</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">{employees.length} pegawai</span>
                    </div>
                    {selectedEmployees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{selectedEmployees.length} dipilih</span>
                        <button
                          onClick={handleBulkResetVotingStatus}
                          className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                          disabled={loading}
                        >
                          <Check className="w-4 h-4" />
                          Reset Status {selectedEmployees.length} User
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleImportEmployees} className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nomor Induk Pegawai (satu per baris)
                      </label>
                      <textarea
                        value={employeeIds}
                        onChange={(e) => setEmployeeIds(e.target.value)}
                        placeholder="123456&#10;234567&#10;345678"
                        className="w-full px-4 py-2 border rounded-lg"
                        rows={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Pegawai (satu per baris, sesuaikan dengan NIP)
                      </label>
                      <textarea
                        value={employeeNames}
                        onChange={(e) => setEmployeeNames(e.target.value)}
                        placeholder="Budi Santoso&#10;Siti Aminah&#10;Ahmad Rizki"
                        className="w-full px-4 py-2 border rounded-lg"
                        rows={6}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Mengimpor...' : 'Import Pegawai'}
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.length === employees.length && employees.length > 0}
                            onChange={(e) => handleSelectAllEmployees(e)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">NIP</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nama</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status Voting</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employee.employee_id)}
                              onChange={(e) => handleSelectEmployee(employee.employee_id, e)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{employee.employee_id}</td>
                          <td className="px-4 py-3 text-sm">{employee.employee_name || 'Belum diisi'}</td>
                          <td className="px-4 py-3">
                            {employee.has_voted ? (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                Sudah Voting
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                Belum Voting
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {employee.has_voted && (
                                <button
                                  onClick={() => handleResetVotingStatus(employee.employee_id)}
                                  className="text-orange-600 hover:text-orange-700 p-1 rounded transition-colors"
                                  title="Reset status voting user"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteEmployee(employee.employee_id)}
                                className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                title="Hapus employee dan data terkait"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'voter-registrations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Persetujuan Registrasi Voter</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <UserCheck className="w-5 h-5" />
                    <span className="font-medium">
                      {voterRegistrations.filter(r => !r.is_approved && r.user_id).length} menunggu persetujuan, {voterRegistrations.filter(r => !r.user_id).length} menunggu verifikasi
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {voterRegistrations.map((registration) => (
                    <div key={registration.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="font-mono font-medium text-gray-900">{registration.employee_id}</span>
                            <span className="text-sm text-gray-600">{registration.email}</span>
                            {registration.is_approved ? (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                Disetujui
                              </span>
                            ) : registration.user_id ? (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                                Menunggu Persetujuan
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                Menunggu Verifikasi Email
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Terdaftar: {new Date(registration.registration_date).toLocaleString('id-ID')}
                          </div>
                          {registration.face_photo_url && (
                            <div className="mb-2">
                              <button
                                onClick={() => {
                                  setSelectedSelfie(registration.face_photo_url);
                                }}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm disabled:text-gray-400"
                                disabled={!registration.face_photo_url}
                              >
                                <Image className="w-4 h-4" />
                                Lihat Foto Wajah
                              </button>
                            </div>
                          )}
                          {registration.approved_at && (
                            <div className="text-sm text-green-600">
                              Disetujui: {new Date(registration.approved_at).toLocaleString('id-ID')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!registration.is_approved && registration.user_id && (
                            <>
                              <button
                                onClick={() => handleApproveVoter(registration.id)}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                Setujui
                              </button>
                              <button
                                onClick={() => handleRejectVoter(registration.id)}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                              >
                                <X className="w-4 h-4" />
                                Tolak
                              </button>
                            </>
                          )}
                          {!registration.is_approved && !registration.user_id && (
                            <span className="text-sm text-gray-500 italic">
                              Menunggu verifikasi email user
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {voterRegistrations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Belum ada registrasi voter</p>
                  </div>
                )}
              </div>
            )}


            {activeTab === 'votes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Detail Voting</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">{votes.length} suara</span>
                    </div>
                    {selectedVotes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{selectedVotes.length} dipilih</span>
                        <button
                          onClick={handleBulkDeleteVotes}
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                          disabled={loading}
                        >
                          <XSquare className="w-4 h-4" />
                          Hapus {selectedVotes.length} Vote
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedVotes.length === votes.length && votes.length > 0}
                            onChange={(e) => handleSelectAllVotes(e)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">NIP</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Calon Dipilih</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waktu</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {votes.map((vote) => (
                        <tr key={vote.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedVotes.includes(vote.employee_id)}
                              onChange={(e) => handleSelectVote(vote.employee_id, e)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            <button
                              onClick={() => handleShowVoterDetail(vote.employee_id)}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                            >
                              {vote.employee_id}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-medium">{vote.candidate_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(vote.voted_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteSingleVote(vote.employee_id)}
                              className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                              title="Hapus vote dan reset status voting"
                            >
                              <XSquare className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}



            {activeTab === 'settings' && (
              <div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Pengaturan Jadwal Voting</h2>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Kelola jadwal voting</span>
                  </div>
                </div>





                {/* Settings Form */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pengaturan Jadwal</h3>
                  

                  <form onSubmit={handleUpdateVotingSettings} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Voting
                      </label>
                      <input
                        type="text"
                        value={votingName}
                        onChange={(e) => setVotingName(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Masukkan nama voting"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Waktu Mulai Voting
                        </label>
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Waktu Berakhir Voting
                        </label>
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Aktifkan voting (centang untuk mengizinkan voting sesuai jadwal)
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Settings className="w-4 h-4" />
                        {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => loadVotingSettings()}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                      >
                        Reset
                      </button>
                    </div>
                  </form>

                  {/* Important Notes */}
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Catatan Penting:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Voting hanya dapat dilakukan jika dicentang dan dalam rentang waktu yang ditentukan</li>
                      <li>• Waktu voting menggunakan timezone server (UTC)</li>
                      <li>• Pastikan waktu mulai lebih awal dari waktu berakhir</li>
                      <li>• Perubahan pengaturan akan berlaku langsung</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {selectedSelfie && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSelfie(null)}
        >
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Foto Wajah Voter</h3>
              <button
                onClick={() => setSelectedSelfie(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>
            <img 
              src={selectedSelfie} 
              alt="Foto Wajah Voter" 
              className="w-full rounded-lg"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZvdG8gdGlkYWsgZGl0ZW11a2FuPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
        </div>
      )}

      {selectedVoterDetail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVoterDetail(null)}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Detail Identitas Voter</h3>
              <button
                onClick={() => setSelectedVoterDetail(null)}
                className="text-gray-500 hover:text-gray-700 p-1 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Information */}
              {selectedVoterDetail.employee && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Data Pegawai</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">NIP:</span>
                      <span className="font-mono font-medium">{selectedVoterDetail.employee.employee_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nama:</span>
                      <span className="font-medium">{selectedVoterDetail.employee.employee_name || 'Belum diisi'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Voting:</span>
                      <span className={`font-medium ${selectedVoterDetail.employee.has_voted ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedVoterDetail.employee.has_voted ? 'Sudah Voting' : 'Belum Voting'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Voter Profile Information */}
              {selectedVoterDetail.voterProfile && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Profil Voter</h4>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedVoterDetail.voterProfile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Akun:</span>
                      <span className={`font-medium ${selectedVoterDetail.voterProfile.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedVoterDetail.voterProfile.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Dibuat:</span>
                      <span className="font-medium">
                        {new Date(selectedVoterDetail.voterProfile.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Information */}
              {selectedVoterDetail.registration && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Data Registrasi</h4>
                  <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Persetujuan:</span>
                      <span className={`font-medium ${selectedVoterDetail.registration.is_approved ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectedVoterDetail.registration.is_approved ? 'Disetujui' : 'Belum Disetujui'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Registrasi:</span>
                      <span className="font-medium">
                        {new Date(selectedVoterDetail.registration.registration_date).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {selectedVoterDetail.registration.face_photo_url && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Foto Wajah:</span>
                        <button
                          onClick={() => setSelectedSelfie(selectedVoterDetail.registration.face_photo_url)}
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          Lihat Foto
                        </button>
                      </div>
                    )}
                    {selectedVoterDetail.registration.approved_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Disetujui Pada:</span>
                        <span className="font-medium text-green-600">
                          {new Date(selectedVoterDetail.registration.approved_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
