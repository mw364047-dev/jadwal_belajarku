<?php

namespace App\Providers;

use App\Models\Jadwal;
use App\Models\LayananBk;
use App\Models\KomentarGuru;
use App\Models\Siswa;
use App\Models\Materi;
use App\Models\Refleksi;
use App\Models\Tugas;
use App\Policies\JadwalPolicy;
use App\Policies\LayananBkPolicy;
use App\Policies\KomentarGuruPolicy;
use App\Policies\GuruSiswaPolicy;
use App\Policies\MateriPolicy;
use App\Policies\RefleksiPolicy;
use App\Policies\TugasPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Tugas::class => TugasPolicy::class,
        Jadwal::class => JadwalPolicy::class,
        LayananBk::class => LayananBkPolicy::class,
        Refleksi::class => RefleksiPolicy::class,
        Materi::class => MateriPolicy::class,
        Siswa::class => GuruSiswaPolicy::class,
        KomentarGuru::class => KomentarGuruPolicy::class,
    ];

    public function boot(): void
    {
        // Policy kepemilikan siswa, komentar, jadwal, layanan BK, refleksi, tugas, dan materi didaftarkan eksplisit.
    }
}
