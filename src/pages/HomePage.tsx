
import { Vote, BarChart3, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="min-h-screen bg-black bg-opacity-20 flex items-center justify-center px-4">
        <div className="max-w-4xl w-full">

          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
              Pemilihan Bakal Calon Ketua Serikat Pekerja
            </h1>
            <p className="text-lg sm:text-xl text-blue-100">
              Sistem voting online yang aman dan transparan
            </p>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <Link
              to="/vote"
              className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block"
            >
              <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Vote className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Voting</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Gunakan hak suara Anda untuk memilih ketua serikat pekerja
              </p>
              <div className="bg-blue-600 text-white font-medium py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                Mulai Voting
              </div>
            </Link>

            <Link
              to="/results"
              className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block"
            >
              <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Hasil</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Lihat hasil voting secara real-time dan transparan
              </p>
              <div className="bg-green-600 text-white font-medium py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                Lihat Hasil
              </div>
            </Link>

            <Link
              to="/admin/login"
              className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 text-center hover:shadow-2xl transition-all transform hover:-translate-y-1 block sm:col-span-2 lg:col-span-1"
            >
              <div className="bg-slate-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Admin</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Kelola calon, pegawai, dan pantau hasil voting
              </p>
              <div className="bg-slate-600 text-white font-medium py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                Login Admin
              </div>
            </Link>
          </div>


          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-white">
            <h3 className="text-base sm:text-lg font-semibold mb-3">Cara Voting:</h3>
            <ol className="space-y-2 text-blue-50">
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold text-sm sm:text-base">1.</span>
                <span className="text-sm sm:text-base">Masukkan Nomor Induk Pegawai (NIP) Anda</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold text-sm sm:text-base">2.</span>
                <span className="text-sm sm:text-base">Pilih calon ketua serikat pekerja</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold text-sm sm:text-base">3.</span>
                <span className="text-sm sm:text-base">Ambil foto selfie sebagai validasi</span>
              </li>
              <li className="flex gap-2 sm:gap-3">
                <span className="font-bold text-sm sm:text-base">4.</span>
                <span className="text-sm sm:text-base">Kirim voting Anda</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
