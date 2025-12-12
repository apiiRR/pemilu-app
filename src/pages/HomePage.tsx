
import { Vote, BarChart3, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="min-h-screen bg-black bg-opacity-20 flex items-center justify-center px-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Pemilihan Bakal Calon Ketua Serikat Pekerja
            </h1>
            <p className="text-xl text-blue-100">
              Sistem voting online yang aman dan transparan
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link
              to="/vote"
              className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voting</h2>
              <p className="text-gray-600 mb-4">
                Gunakan hak suara Anda untuk memilih ketua serikat pekerja
              </p>
              <div className="bg-blue-600 text-white font-medium py-3 rounded-lg">
                Mulai Voting
              </div>
            </Link>

            <Link
              to="/results"
              className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block"
            >
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Hasil</h2>
              <p className="text-gray-600 mb-4">
                Lihat hasil voting secara real-time dan transparan
              </p>
              <div className="bg-green-600 text-white font-medium py-3 rounded-lg">
                Lihat Hasil
              </div>
            </Link>

            <Link
              to="/admin/login"
              className="bg-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block"
            >
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin</h2>
              <p className="text-gray-600 mb-4">
                Kelola calon, pegawai, dan pantau hasil voting
              </p>
              <div className="bg-slate-600 text-white font-medium py-3 rounded-lg">
                Login Admin
              </div>
            </Link>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-3">Cara Voting:</h3>
            <ol className="space-y-2 text-blue-50">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <span>Masukkan Nomor Induk Pegawai (NIP) Anda</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <span>Pilih calon ketua serikat pekerja</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <span>Ambil foto selfie sebagai validasi</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">4.</span>
                <span>Kirim voting Anda</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
