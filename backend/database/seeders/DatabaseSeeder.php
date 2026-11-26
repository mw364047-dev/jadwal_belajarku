<?php

namespace Database\Seeders;

use App\Models\GuruBk;
use App\Models\Jadwal;
use App\Models\Kelas;
use App\Models\LayananBk;
use App\Models\PenugasanGuruSiswa;
use App\Models\Refleksi;
use App\Models\Siswa;
use App\Models\Tugas;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Semua akun dan data di bawah adalah data demo fiktif.
        $password = 'Belajar123!';

        $admin = User::create([
            'nama' => 'Administrator Demo',
            'username' => 'admin',
            'email' => 'admin@jadwalbelajarku.test',
            'password' => $password,
            'role' => 'admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $guruData = [
            ['nama' => 'Ayu Lestari, S.Pd.', 'username' => 'guru01', 'email' => 'guru01@jadwalbelajarku.test', 'nip' => 'DEMO-GURU-001'],
            ['nama' => 'Budi Santoso, S.Pd.', 'username' => 'guru02', 'email' => 'guru02@jadwalbelajarku.test', 'nip' => 'DEMO-GURU-002'],
            ['nama' => 'Citra Permata, S.Pd.', 'username' => 'guru03', 'email' => 'guru03@jadwalbelajarku.test', 'nip' => 'DEMO-GURU-003'],
        ];

        $gurus = [];
        foreach ($guruData as $data) {
            $user = User::create([
                'nama' => $data['nama'],
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $password,
                'role' => 'guru_bk',
                'is_active' => true,
                'must_change_password' => true,
            ]);
            $gurus[] = GuruBk::create([
                'user_id' => $user->id,
                'nip' => $data['nip'],
                'jabatan' => 'Guru Bimbingan dan Konseling',
            ]);
        }

        $tahunAjaran = '2026/2027';
        $kelasA = Kelas::create(['nama_kelas' => 'VIII A', 'tahun_ajaran' => $tahunAjaran]);
        $kelasB = Kelas::create(['nama_kelas' => 'VIII B', 'tahun_ajaran' => $tahunAjaran]);
        $kelasList = [$kelasA, $kelasB];

        $namaDepan = [
            'Aditya', 'Aisyah', 'Bagas', 'Cahya', 'Dinda', 'Fajar', 'Farah', 'Gilang', 'Intan', 'Raka',
            'Nadia', 'Rizky', 'Salsa', 'Tegar', 'Umar', 'Vina', 'Wahyu', 'Yasmin', 'Zaki', 'Putri',
        ];
        $namaBelakang = [
            'Pratama', 'Putri', 'Saputra', 'Rahma', 'Hidayat', 'Ananda', 'Lestari', 'Ramadhan', 'Aulia', 'Maulana',
            'Permata', 'Firmansyah', 'Safitri', 'Wijaya', 'Akbar', 'Nugraha', 'Puspita', 'Kurniawan', 'Sari', 'Fauzi',
        ];

        $siswaList = [];
        for ($i = 0; $i < 20; $i++) {
            $nomor = $i + 1;
            $nama = $namaDepan[$i].' '.$namaBelakang[$i];
            $user = User::create([
                'nama' => $nama,
                'username' => sprintf('siswa%02d', $nomor),
                'email' => sprintf('siswa%02d@jadwalbelajarku.test', $nomor),
                'password' => $password,
                'role' => 'siswa',
                'is_active' => true,
                'must_change_password' => true,
            ]);

            $siswa = Siswa::create([
                'user_id' => $user->id,
                'nis' => sprintf('DEMO-%04d', $nomor),
                'kelas_id' => $kelasList[$i < 10 ? 0 : 1]->id,
            ]);
            $siswaList[] = $siswa;

            // Setiap siswa memiliki guru binaan; pembagian dibuat merata pada 3 guru.
            $guruUtama = $gurus[$i % 3];
            PenugasanGuruSiswa::create([
                'guru_id' => $guruUtama->id,
                'siswa_id' => $siswa->id,
                'tahun_ajaran' => $tahunAjaran,
            ]);
            // Tambahkan guru kedua untuk beberapa siswa sebagai contoh penugasan lebih dari satu.
            if ($i % 5 === 0) {
                $guruKedua = $gurus[($i + 1) % 3];
                PenugasanGuruSiswa::create([
                    'guru_id' => $guruKedua->id,
                    'siswa_id' => $siswa->id,
                    'tahun_ajaran' => $tahunAjaran,
                ]);
            }
        }

        $mataPelajaran = ['Matematika', 'Bahasa Indonesia', 'IPA', 'Bahasa Inggris', 'IPS'];
        $judulTugas = [
            'Mengerjakan latihan bab pecahan',
            'Membaca dan merangkum materi',
            'Menyelesaikan lembar kerja',
            'Mempersiapkan presentasi kelompok',
        ];
        $kegiatanBelajar = ['Belajar Matematika', 'Membaca materi IPA', 'Latihan Bahasa Inggris'];

        foreach ($siswaList as $index => $siswa) {
            $tugasSiswa = [];
            for ($j = 0; $j < 2; $j++) {
                $tugasSiswa[] = Tugas::create([
                    'siswa_id' => $siswa->id,
                    'mata_pelajaran' => $mataPelajaran[($index + $j) % count($mataPelajaran)],
                    'judul' => $judulTugas[($index + $j) % count($judulTugas)],
                    'tenggat' => now()->addDays(2 + (($index + $j) % 7))->toDateString(),
                    'durasi_menit' => [30, 45, 60][($index + $j) % 3],
                    'prioritas' => ['tinggi', 'sedang', 'rendah'][($index + $j) % 3],
                    'status' => ['belum', 'proses', 'selesai'][($index + $j) % 3],
                ]);
            }

            // Tiga blok contoh untuk minggu berjalan; hari menggunakan 1=Senin s.d. 7=Minggu.
            foreach ([
                ['hari' => 1, 'mulai' => '16:00:00', 'selesai' => '16:45:00', 'jenis' => 'belajar', 'kegiatan' => $kegiatanBelajar[$index % 3]],
                ['hari' => 2, 'mulai' => '17:00:00', 'selesai' => '17:30:00', 'jenis' => 'istirahat', 'kegiatan' => 'Istirahat dan kegiatan pribadi'],
                ['hari' => 4, 'mulai' => '19:00:00', 'selesai' => '19:45:00', 'jenis' => 'belajar', 'kegiatan' => 'Menyelesaikan tugas sekolah'],
            ] as $slotIndex => $slot) {
                Jadwal::create([
                    'siswa_id' => $siswa->id,
                    'tahun' => (int) now()->format('o'),
                    'minggu_ke' => (int) now()->format('W'),
                    'hari' => $slot['hari'],
                    'jam_mulai' => $slot['mulai'],
                    'jam_selesai' => $slot['selesai'],
                    'jenis_blok' => $slot['jenis'],
                    'tugas_id' => $slotIndex === 0 ? $tugasSiswa[0]->id : null,
                    'kegiatan' => $slot['kegiatan'],
                    'catatan' => $slotIndex === 0 ? 'Contoh jadwal belajar yang dapat disesuaikan.' : null,
                ]);
            }

            Refleksi::create([
                'siswa_id' => $siswa->id,
                'tahun' => (int) now()->format('o'),
                'minggu_ke' => (int) now()->format('W'),
                'skor_realistis' => 3,
                'terlaksana' => 'Sebagian kegiatan belajar dapat dilakukan sesuai rencana.',
                'hambatan' => 'Ada kegiatan keluarga yang berlangsung bersamaan.',
                'perbaikan' => 'Mencoba mengatur ulang waktu belajar pada hari berikutnya.',
                'hanya_untuk_saya' => false,
            ]);
        }

        foreach ($gurus as $index => $guru) {
            $siswaLayanan = $siswaList[$index];
            LayananBk::create([
                'guru_id' => $guru->id,
                'siswa_id' => $siswaLayanan->id,
                'kelas_id' => $siswaLayanan->kelas_id,
                'jenis_layanan' => ['individual', 'kelompok', 'informasi'][$index],
                'tanggal' => now()->subDays($index + 1)->toDateString(),
                'topik' => ['Pendampingan pengaturan waktu belajar', 'Diskusi strategi belajar mingguan', 'Informasi kebiasaan belajar sehat'][$index],
                'tindak_lanjut' => 'Data tindak lanjut ini merupakan contoh fiktif untuk pengujian enkripsi.',
            ]);
        }

        $this->call(MateriSeeder::class);
    }
}
