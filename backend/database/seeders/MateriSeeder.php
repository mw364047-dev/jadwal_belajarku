<?php

namespace Database\Seeders;

use App\Models\Materi;
use App\Models\User;
use Illuminate\Database\Seeder;

class MateriSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::query()->where('role', 'admin')->value('id');

        $materiAwal = [
            [
                'judul' => 'Langkah 1: Membuat Rencana Belajar',
                'isi' => "Mulailah dengan mencatat kegiatan dan tugas sekolah yang perlu kamu lakukan minggu ini.\n\nTuliskan nama mata pelajaran, hal yang perlu dikerjakan, dan kapan tugas perlu diselesaikan. Kamu juga boleh mencatat kegiatan lain yang sudah memiliki waktu tetap.\n\nTidak harus langsung sempurna. Mulai dari daftar sederhana, lalu perbarui jika ada kegiatan baru.",
                'urutan' => 1,
            ],
            [
                'judul' => 'Mengenal Prioritas Tugas',
                'isi' => "Setelah membuat daftar, lihat kembali tugas-tugasmu. Kamu dapat mempertimbangkan tenggat, tingkat kesulitan, dan berapa lama tugas mungkin dikerjakan.\n\nPilih satu tugas yang perlu diperhatikan lebih dahulu. Tugas yang tenggatnya dekat dapat didahulukan, tetapi tetap sesuaikan dengan keadaan dan kebutuhanmu.\n\nPrioritas adalah panduan untuk membantu memilih langkah berikutnya, bukan aturan yang harus selalu sama.",
                'urutan' => 2,
            ],
            [
                'judul' => 'Langkah 3: Memperkirakan Durasi',
                'isi' => "Perkirakan waktu yang kamu butuhkan untuk setiap tugas. Misalnya, membaca satu bagian materi mungkin membutuhkan 20 menit, sedangkan latihan soal dapat membutuhkan 30–45 menit.\n\nGunakan perkiraan yang masuk akal dan sediakan jeda. Jika ternyata tugas membutuhkan waktu lebih lama, kamu boleh menyesuaikan jadwal.\n\nPerkiraan durasi membantu kamu membagi waktu, bukan untuk membatasi proses belajar.",
                'urutan' => 3,
            ],
            [
                'judul' => 'Menyusun Jadwal yang Seimbang',
                'isi' => "Langkah berikutnya adalah menempatkan tugas ke waktu yang tersedia. Sisakan ruang untuk istirahat, ibadah, makan, kegiatan keluarga, dan aktivitas lain.\n\nKamu tidak harus mengisi seluruh waktu dengan belajar. Jadwal yang baik adalah jadwal yang dapat dicoba dan masih bisa diperbaiki ketika keadaan berubah.",
                'urutan' => 5,
            ],
            [
                'judul' => 'Contoh Jadwal Mingguan (Bukan Aturan Wajib)',
                'isi' => "Berikut contoh sederhana yang dapat kamu jadikan inspirasi. Waktu dan kegiatannya boleh diubah sesuai rutinitasmu. Contoh ini bukan aturan wajib.\n\nSenin, 16.00–16.30: Mengulang materi Matematika.\nSelasa, 16.00–16.20: Membaca materi IPA, lalu istirahat.\nRabu, 16.00–16.45: Mengerjakan latihan Bahasa Indonesia.\nKamis, 16.00–16.30: Menyelesaikan tugas yang tenggatnya lebih dekat.\nJumat: Waktu lebih ringan untuk membaca atau mengecek tugas.\nSabtu/Minggu: Menyesuaikan dengan kegiatan keluarga dan waktu istirahat.\n\nKamu boleh mengganti hari, jam, durasi, dan mata pelajaran. Pilih susunan yang terasa sesuai dengan keadaanmu.",
                'urutan' => 4,
            ],
        ];

        foreach ($materiAwal as $item) {
            Materi::updateOrCreate(
                ['judul' => $item['judul']],
                [
                    'isi' => $item['isi'],
                    'urutan' => $item['urutan'],
                    'dibuat_oleh' => $adminId,
                ]
            );
        }
    }
}
