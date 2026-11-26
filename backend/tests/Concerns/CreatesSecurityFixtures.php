<?php

namespace Tests\Concerns;

use App\Models\GuruBk;
use App\Models\Jadwal;
use App\Models\Kelas;
use App\Models\KomentarGuru;
use App\Models\LayananBk;
use App\Models\Materi;
use App\Models\PenugasanGuruSiswa;
use App\Models\Refleksi;
use App\Models\Siswa;
use App\Models\Tugas;
use App\Models\User;
use App\Support\TahunAjaran;
use Carbon\CarbonImmutable;

trait CreatesSecurityFixtures
{
    protected User $adminUser;
    protected User $guruAUser;
    protected User $guruBUser;
    protected User $siswaAUser;
    protected User $siswaBUser;
    protected GuruBk $guruA;
    protected GuruBk $guruB;
    protected Kelas $kelasA;
    protected Kelas $kelasB;
    protected Siswa $siswaA;
    protected Siswa $siswaB;
    protected PenugasanGuruSiswa $penugasanA;
    protected PenugasanGuruSiswa $penugasanB;
    protected Tugas $tugasA;
    protected Tugas $tugasB;
    protected Jadwal $jadwalA;
    protected Jadwal $jadwalB;
    protected Refleksi $refleksiA;
    protected Refleksi $refleksiB;
    protected KomentarGuru $komentarA;
    protected LayananBk $layananA;
    protected LayananBk $layananB;
    protected Materi $materi;
    protected int $tahunMinggu;
    protected int $minggu;
    protected string $tahunAjaran;

    protected function createSecurityFixtures(): void
    {
        $this->tahunAjaran = TahunAjaran::berjalan();
        $period = CarbonImmutable::now();
        $this->tahunMinggu = (int) $period->isoWeekYear();
        $this->minggu = (int) $period->isoWeek();

        $this->adminUser = $this->makeSecurityUser('admin', 'security-admin');
        $this->guruAUser = $this->makeSecurityUser('guru_bk', 'security-guru-a');
        $this->guruBUser = $this->makeSecurityUser('guru_bk', 'security-guru-b');
        $this->siswaAUser = $this->makeSecurityUser('siswa', 'security-siswa-a');
        $this->siswaBUser = $this->makeSecurityUser('siswa', 'security-siswa-b');

        $this->kelasA = Kelas::create([
            'nama_kelas' => 'VIII TEST A',
            'tahun_ajaran' => $this->tahunAjaran,
        ]);
        $this->kelasB = Kelas::create([
            'nama_kelas' => 'VIII TEST B',
            'tahun_ajaran' => $this->tahunAjaran,
        ]);

        $this->guruA = GuruBk::create([
            'user_id' => $this->guruAUser->id,
            'nip' => 'TEST-GURU-A',
            'jabatan' => 'Guru BK',
        ]);
        $this->guruB = GuruBk::create([
            'user_id' => $this->guruBUser->id,
            'nip' => 'TEST-GURU-B',
            'jabatan' => 'Guru BK',
        ]);

        $this->siswaA = Siswa::create([
            'user_id' => $this->siswaAUser->id,
            'nis' => 'TEST-SISWA-A',
            'kelas_id' => $this->kelasA->id,
        ]);
        $this->siswaB = Siswa::create([
            'user_id' => $this->siswaBUser->id,
            'nis' => 'TEST-SISWA-B',
            'kelas_id' => $this->kelasB->id,
        ]);

        $this->penugasanA = PenugasanGuruSiswa::create([
            'guru_id' => $this->guruA->id,
            'siswa_id' => $this->siswaA->id,
            'tahun_ajaran' => $this->tahunAjaran,
        ]);
        $this->penugasanB = PenugasanGuruSiswa::create([
            'guru_id' => $this->guruB->id,
            'siswa_id' => $this->siswaB->id,
            'tahun_ajaran' => $this->tahunAjaran,
        ]);

        $this->tugasA = Tugas::create([
            'siswa_id' => $this->siswaA->id,
            'mata_pelajaran' => 'Matematika',
            'judul' => 'Tugas milik siswa A',
            'tenggat' => $period->addDays(2)->toDateString(),
            'durasi_menit' => 30,
            'prioritas' => 'sedang',
            'status' => 'belum',
        ]);
        $this->tugasB = Tugas::create([
            'siswa_id' => $this->siswaB->id,
            'mata_pelajaran' => 'IPA',
            'judul' => 'Tugas rahasia siswa B',
            'tenggat' => $period->addDays(3)->toDateString(),
            'durasi_menit' => 45,
            'prioritas' => 'tinggi',
            'status' => 'belum',
        ]);

        $this->jadwalA = Jadwal::create([
            'siswa_id' => $this->siswaA->id,
            'tahun' => $this->tahunMinggu,
            'minggu_ke' => $this->minggu,
            'hari' => 1,
            'jam_mulai' => '16:00:00',
            'jam_selesai' => '16:45:00',
            'jenis_blok' => 'belajar',
            'tugas_id' => $this->tugasA->id,
            'kegiatan' => 'Jadwal milik siswa A',
        ]);
        $this->jadwalB = Jadwal::create([
            'siswa_id' => $this->siswaB->id,
            'tahun' => $this->tahunMinggu,
            'minggu_ke' => $this->minggu,
            'hari' => 2,
            'jam_mulai' => '17:00:00',
            'jam_selesai' => '17:45:00',
            'jenis_blok' => 'belajar',
            'tugas_id' => $this->tugasB->id,
            'kegiatan' => 'Jadwal rahasia siswa B',
        ]);

        $this->refleksiA = Refleksi::create([
            'siswa_id' => $this->siswaA->id,
            'tahun' => $this->tahunMinggu,
            'minggu_ke' => $this->minggu,
            'skor_realistis' => 3,
            'terlaksana' => 'Catatan siswa A',
            'hambatan' => 'Tantangan siswa A',
            'perbaikan' => 'Rencana siswa A',
            'hanya_untuk_saya' => false,
        ]);
        $this->refleksiB = Refleksi::create([
            'siswa_id' => $this->siswaB->id,
            'tahun' => $this->tahunMinggu,
            'minggu_ke' => $this->minggu,
            'skor_realistis' => 2,
            'terlaksana' => 'REFLECTION_B_PRIVATE_MARKER',
            'hambatan' => 'HAMBATAN_B_PRIVATE_MARKER',
            'perbaikan' => 'PERBAIKAN_B_PRIVATE_MARKER',
            'hanya_untuk_saya' => false,
        ]);

        $this->komentarA = KomentarGuru::create([
            'guru_id' => $this->guruA->id,
            'siswa_id' => $this->siswaA->id,
            'jadwal_id' => $this->jadwalA->id,
            'isi' => 'Komentar pendampingan yang aman.',
        ]);

        $this->layananA = LayananBk::create([
            'guru_id' => $this->guruA->id,
            'siswa_id' => $this->siswaA->id,
            'jenis_layanan' => 'individual',
            'tanggal' => $period->toDateString(),
            'topik' => 'TOPIK_SENSITIF_PRIVATE_MARKER',
            'tindak_lanjut' => 'TINDAK_LANJUT_SENSITIF_PRIVATE_MARKER',
        ]);
        $this->layananB = LayananBk::create([
            'guru_id' => $this->guruB->id,
            'siswa_id' => $this->siswaB->id,
            'jenis_layanan' => 'kelompok',
            'tanggal' => $period->subDay()->toDateString(),
            'topik' => 'Topik catatan guru B',
            'tindak_lanjut' => 'Isi tindak lanjut guru B',
        ]);

        $this->materi = Materi::create([
            'judul' => 'Materi pengujian',
            'isi' => 'Konten materi biasa.',
            'urutan' => 1,
            'dibuat_oleh' => $this->adminUser->id,
        ]);
    }

    protected function makeSecurityUser(
        string $role,
        string $username,
        bool $active = true,
        bool $mustChangePassword = false,
        string $password = 'SecurityTest123!'
    ): User {
        return User::create([
            'nama' => 'Pengguna ' . $username,
            'username' => $username,
            'email' => $username . '@security.test',
            'password' => $password,
            'role' => $role,
            'is_active' => $active,
            'must_change_password' => $mustChangePassword,
        ]);
    }

    /**
     * Mengubah route API ber-parameter menjadi URL menggunakan record fixture yang nyata.
     */
    protected function concreteApiUri(string $uri): string
    {
        $ids = [
            'guru' => $this->guruA->id,
            'siswa' => $this->siswaA->id,
            'kelas' => $this->kelasA->id,
            'penugasan' => $this->penugasanA->id,
            'materi' => $this->materi->id,
            'komentar' => $this->komentarA->id,
            'layanan' => $this->layananA->id,
            'tugas' => $this->tugasA->id,
            'jadwal' => $this->jadwalA->id,
            'refleksi' => $this->refleksiA->id,
            'id' => $this->adminUser->id,
            'tahun' => $this->tahunMinggu,
            'minggu' => $this->minggu,
        ];

        $path = preg_replace_callback('/\{([^}]+)\}/', function (array $matches) use ($ids): string {
            $name = rtrim($matches[1], '?');
            return (string) ($ids[$name] ?? 1);
        }, $uri);

        return '/' . ltrim((string) $path, '/');
    }
}
