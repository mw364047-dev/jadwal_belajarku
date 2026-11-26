import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, getDashboardPath } from './context/AuthContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminGuruPage from './pages/admin/AdminGuruPage.jsx'
import AdminSiswaPage from './pages/admin/AdminSiswaPage.jsx'
import AdminKelasPage from './pages/admin/AdminKelasPage.jsx'
import AdminPenugasanPage from './pages/admin/AdminPenugasanPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminMonitoringGuruPage from './pages/admin/AdminMonitoringGuruPage.jsx'
import AdminRekapLayananPage from './pages/admin/AdminRekapLayananPage.jsx'
import AdminLogPage from './pages/admin/AdminLogPage.jsx'
import SiswaTugasPage from './pages/siswa/SiswaTugasPage.jsx'
import SiswaJadwalPage from './pages/siswa/SiswaJadwalPage.jsx'
import SiswaRefleksiPage from './pages/siswa/SiswaRefleksiPage.jsx'
import MateriPage from './pages/MateriPage.jsx'
import InfoPage from './pages/InfoPage.jsx'
import GuruDashboardPage from './pages/guru/GuruDashboardPage.jsx'
import GuruSiswaPage from './pages/guru/GuruSiswaPage.jsx'
import GuruSiswaDetailPage from './pages/guru/GuruSiswaDetailPage.jsx'
import GuruLayananPage from './pages/guru/GuruLayananPage.jsx'
import GuruRekapLayananPage from './pages/guru/GuruRekapLayananPage.jsx'
import SiswaLayananPage from './pages/siswa/SiswaLayananPage.jsx'
import { GuestRoute, ProtectedRoute } from './routes/ProtectedRoute.jsx'

function DefaultRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center px-4 text-base text-slate-600">Memeriksa akun…</div>
  if (!user) return <Navigate to="/" replace />
  if (user.must_change_password) return <Navigate to="/ganti-password" replace />
  return <Navigate to={getDashboardPath(user.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/ganti-password" element={<ProtectedRoute passwordPage><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/bantuan-bk" element={<AppLayout><InfoPage type="bantuan" /></AppLayout>} />
      <Route path="/kebijakan-data" element={<AppLayout><InfoPage type="kebijakan" /></AppLayout>} />
      <Route path="/batasan-produk" element={<AppLayout><InfoPage type="batasan" /></AppLayout>} />
      <Route path="/materi" element={<ProtectedRoute><AppLayout><MateriPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/guru" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminGuruPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/siswa" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminSiswaPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/kelas" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminKelasPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/penugasan" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminPenugasanPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/monitoring-guru" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminMonitoringGuruPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/rekap-layanan" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminRekapLayananPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/log" element={<ProtectedRoute roles={['admin']}><AppLayout><AdminLogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/guru" element={<ProtectedRoute roles={['guru_bk']}><AppLayout><GuruDashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/guru/siswa" element={<ProtectedRoute roles={['guru_bk']}><AppLayout><GuruSiswaPage /></AppLayout></ProtectedRoute>} />
      <Route path="/guru/siswa/:siswaId" element={<ProtectedRoute roles={['guru_bk']}><AppLayout><GuruSiswaDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/guru/layanan" element={<ProtectedRoute roles={['guru_bk']}><AppLayout><GuruLayananPage /></AppLayout></ProtectedRoute>} />
      <Route path="/guru/rekap-layanan" element={<ProtectedRoute roles={['guru_bk']}><AppLayout><GuruRekapLayananPage /></AppLayout></ProtectedRoute>} />
      <Route path="/siswa" element={<ProtectedRoute roles={['siswa']}><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/siswa/tugas" element={<ProtectedRoute roles={['siswa']}><AppLayout><SiswaTugasPage /></AppLayout></ProtectedRoute>} />
      <Route path="/siswa/jadwal" element={<ProtectedRoute roles={['siswa']}><AppLayout><SiswaJadwalPage /></AppLayout></ProtectedRoute>} />
      <Route path="/siswa/refleksi" element={<ProtectedRoute roles={['siswa']}><AppLayout><SiswaRefleksiPage /></AppLayout></ProtectedRoute>} />
      <Route path="/siswa/layanan" element={<ProtectedRoute roles={['siswa']}><AppLayout><SiswaLayananPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}
