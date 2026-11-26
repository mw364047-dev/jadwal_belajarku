<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use App\Models\LayananBk;
use App\Models\Siswa;
use App\Models\User;
use App\Support\TahunAjaran;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    /** Ringkasan data utama khusus admin. */
    public function index(): JsonResponse
    {
        $bulanMulai = now()->startOfMonth();
        $bulanSelesai = now()->endOfMonth();
        $loginSejak = now()->subDays(30);

        $jumlahGuru = GuruBk::query()
            ->whereHas('user', fn ($query) => $query->where('role', 'guru_bk'))
            ->count();

        $jumlahSiswa = Siswa::query()
            ->whereHas('user', fn ($query) => $query->where('role', 'siswa'))
            ->count();

        $layananBulanIni = LayananBk::query()
            ->whereBetween('tanggal', [$bulanMulai->toDateString(), $bulanSelesai->toDateString()])
            ->count();

        $guruLogin30Hari = User::query()
            ->where('role', 'guru_bk')
            ->whereNotNull('last_login_at')
            ->where('last_login_at', '>=', $loginSejak)
            ->count();

        $tahunAjaran = TahunAjaran::berjalan();

        // Siswa yang belum memiliki penugasan Guru BK pada tahun ajaran berjalan.
        $siswaTanpaPendamping = Siswa::query()
            ->whereHas('user', fn ($query) => $query->where('role', 'siswa'))
            ->whereDoesntHave('penugasan', fn ($query) => $query->where('tahun_ajaran', $tahunAjaran))
            ->count();

        // Akun non-admin yang masih diwajibkan mengganti password awal.
        $akunBelumGantiPassword = User::query()
            ->whereIn('role', ['guru_bk', 'siswa'])
            ->where('must_change_password', true)
            ->count();
        $siswaBelumGantiPassword = User::query()
            ->where('role', 'siswa')
            ->where('must_change_password', true)
            ->count();
        $guruBelumGantiPassword = User::query()
            ->where('role', 'guru_bk')
            ->where('must_change_password', true)
            ->count();

        // Agregasi hanya membaca jenis dan jumlah; topik serta tindak_lanjut tidak diambil.
        $layananPerJenis = LayananBk::query()
            ->select('jenis_layanan')
            ->selectRaw('COUNT(*) AS jumlah')
            ->whereBetween('tanggal', [$bulanMulai->toDateString(), $bulanSelesai->toDateString()])
            ->groupBy('jenis_layanan')
            ->orderBy('jenis_layanan')
            ->get()
            ->map(fn ($item) => [
                'jenis_layanan' => $item->jenis_layanan,
                'jumlah' => (int) $item->jumlah,
            ])
            ->values();

        return response()->json([
            'data' => [
                'jumlah_guru' => $jumlahGuru,
                'jumlah_siswa' => $jumlahSiswa,
                'layanan_bulan_ini' => $layananBulanIni,
                'guru_login_30_hari' => $guruLogin30Hari,
                'layanan_per_jenis' => $layananPerJenis,
                'perlu_ditindak' => [
                    'guru_belum_login_30_hari' => max(0, $jumlahGuru - $guruLogin30Hari),
                    'siswa_tanpa_guru_pendamping' => $siswaTanpaPendamping,
                    'akun_belum_ganti_kata_sandi' => $akunBelumGantiPassword,
                    'siswa_belum_ganti_kata_sandi' => $siswaBelumGantiPassword,
                    'guru_belum_ganti_kata_sandi' => $guruBelumGantiPassword,
                ],
                'tahun_ajaran' => $tahunAjaran,
                'periode' => [
                    'bulan_mulai' => $bulanMulai->toDateString(),
                    'bulan_selesai' => $bulanSelesai->toDateString(),
                    'login_sejak' => $loginSejak->toDateString(),
                ],
            ],
        ]);
    }
}
