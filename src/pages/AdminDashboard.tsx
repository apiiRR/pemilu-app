





import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, Candidate, Employee, Vote } from '../lib/supabase';
import { LogOut, Plus, Trash2, Upload, Users, Image, Eye, Bug } from 'lucide-react';

import { testSupabaseConnection, testAddCandidate, debugAuth } from '../utils/debugSupabase';
import { runCandidateAdditionTest } from '../utils/testCandidateAddition';

export default function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'candidates' | 'employees' | 'votes'>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [votes, setVotes] = useState<(Vote & { candidate_name: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateDescription, setCandidateDescription] = useState('');
  const [candidateOrder, setCandidateOrder] = useState('');



  const [employeeIds, setEmployeeIds] = useState('');
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);



  useEffect(() => {
    // Tunggu loading selesai sebelum cek user
    if (authLoading) {
      // Auth masih loading, tunggu
      return;
    }
    
    if (!user) {
      // User sudah di-load dan tidak ada (belum login)
      navigate('/admin/login');
      return;
    }
    
    // User sudah login, load data
    loadData();
  }, [user, authLoading, activeTab]); // Include activeTab to reload data when tab changes


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

    const employeeData = ids.map(id => ({
      employee_id: id,
      has_voted: false
    }));

    const { error } = await supabase
      .from('employees')
      .upsert(employeeData, { onConflict: 'employee_id' });

    if (!error) {
      setEmployeeIds('');
      loadData();
      alert(`Berhasil menambahkan ${ids.length} pegawai`);
    } else {
      alert('Gagal mengimpor pegawai');
    }
    setLoading(false);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pegawai ini?')) return;

    await supabase.from('employees').delete().eq('id', id);
    loadData();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-700 font-medium"
              >
                <Bug className="w-4 h-4" />
                Debug
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('candidates')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'candidates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Kelola Calon
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'employees'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Kelola Pegawai
              </button>
              <button
                onClick={() => setActiveTab('votes')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'votes'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Detail Voting
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
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">{employees.length} pegawai</span>
                  </div>
                </div>

                <form onSubmit={handleImportEmployees} className="bg-gray-50 p-4 rounded-lg mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Nomor Induk Pegawai (satu per baris)
                  </label>
                  <textarea
                    value={employeeIds}
                    onChange={(e) => setEmployeeIds(e.target.value)}
                    placeholder="123456&#10;234567&#10;345678"
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                    rows={6}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Mengimpor...' : 'Import Pegawai'}
                  </button>
                </form>

                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-gray-900">{employee.employee_id}</span>
                        {employee.has_voted && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            Sudah Voting
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'votes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Detail Voting</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">{votes.length} suara</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">NIP</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Calon Dipilih</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waktu</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Selfie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {votes.map((vote) => (
                        <tr key={vote.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{vote.employee_id}</td>
                          <td className="px-4 py-3 font-medium">{vote.candidate_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(vote.voted_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedSelfie(vote.selfie_url)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              Lihat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Debug Tools</h3>

              <button
                onClick={() => setShowDebug(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    const result = await testSupabaseConnection();
                    alert(`Connection Test: ${result.success ? 'Success' : 'Failed - ' + result.error}`);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Test Connection
                </button>
                
                <button
                  onClick={async () => {
                    const result = await testAddCandidate();
                    alert(`Add Test: ${result.success ? 'Success' : 'Failed - ' + result.error}`);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Test Add Candidate
                </button>
                
                <button
                  onClick={async () => {
                    const result = await debugAuth();
                    alert(`Auth Test: ${result.success ? 'Success - ' + (result.user?.email || 'No email') : 'Failed - ' + result.error}`);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Test Auth
                </button>
                

                <button
                  onClick={async () => {
                    const result = await runCandidateAdditionTest();
                    const summary = `Environment: ${result.env.url && result.env.key ? '✓' : '✗'}
Connection: ${result.connection ? '✓' : '✗'}
Insert: ${result.insert ? '✓' : '✗'}
Overall: ${result.connection && result.insert ? 'SUCCESS' : 'FAILED'}`;
                    alert(`Full Diagnostic:\n${summary}${result.errors.length > 0 ? '\n\nErrors:\n' + result.errors.join('\n') : ''}`);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
                >
                  Full Diagnostic
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>Console Logs:</strong> Check browser console for detailed debug information.</p>
                <p><strong>Environment:</strong> Make sure Supabase environment variables are set.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSelfie && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSelfie(null)}
        >
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full">
            <img src={selectedSelfie} alt="Selfie" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
