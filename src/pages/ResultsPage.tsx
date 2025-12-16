
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, VoteResult } from '../lib/supabase';
import { TrendingUp, Users, Home } from 'lucide-react';



export default function ResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<VoteResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();

    const channel = supabase
      .channel('vote_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => {
          loadResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const loadResults = async () => {
    setLoading(true);
    
    // Load vote results
    const { data } = await supabase
      .from('vote_results')
      .select('*');

    if (data) {
      setResults(data);
      const total = data.reduce((sum, result) => sum + result.vote_count, 0);
      setTotalVotes(total);
    }

    // Load total employees count
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    setTotalEmployees(count || 0);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-4">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
              Hasil Voting Real-Time
            </h1>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium p-2 rounded-lg hover:bg-blue-50 w-fit"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Beranda</span>
              <span className="sm:hidden">Home</span>
            </button>
          </div>



          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8" />
              <div className="text-center">
                <div className="text-2xl sm:text-4xl font-bold">{totalVotes} / {totalEmployees}</div>
                <div className="text-xs sm:text-sm text-blue-100">Total Pemilih / Total Pegawai Terdaftar</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Memuat hasil...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Belum ada voting yang masuk
            </div>
          ) : (

            <div className="space-y-4 sm:space-y-6">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 sm:gap-6">
                    <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600' :
                      index === 1 ? 'bg-gray-200 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {result.order_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{result.name}</h3>
                        {index === 0 && totalVotes > 0 && (
                          <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Terdepan</span>
                            <span className="sm:hidden">#1</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              index === 0 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                              'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${result.percentage || 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-600">
                          {result.vote_count} suara
                        </span>
                        <span className="font-bold text-gray-900 text-base sm:text-lg">
                          {result.percentage || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}


          <div className="mt-4 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Data diperbarui secara otomatis setiap ada voting baru
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
