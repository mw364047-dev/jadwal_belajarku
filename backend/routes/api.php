<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\AdminGuruController;
use App\Http\Controllers\Api\Admin\AdminSiswaController;
use App\Http\Controllers\Api\Admin\AdminKelasController;
use App\Http\Controllers\Api\Admin\AdminPenugasanController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminMonitoringGuruController;
use App\Http\Controllers\Api\Admin\AdminRekapLayananController;
use App\Http\Controllers\Api\Admin\AdminLogController;
use App\Http\Controllers\Api\Admin\AdminMateriController;
use App\Http\Controllers\Api\Siswa\SiswaTugasController;
use App\Http\Controllers\Api\Siswa\SiswaJadwalController;
use App\Http\Controllers\Api\Siswa\SiswaRefleksiController;
use App\Http\Controllers\Api\Siswa\SiswaCetakController;
use App\Http\Controllers\Api\Guru\GuruSiswaController;
use App\Http\Controllers\Api\Guru\GuruKomentarController;
use App\Http\Controllers\Api\Guru\GuruLayananController;
use App\Http\Controllers\Api\Siswa\SiswaLayananController;
use App\Http\Controllers\Api\PingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', PingController::class)->name('api.ping');

// Templat kosong dapat diunduh tanpa akun sebagai lembar latihan cetak.
Route::get('/cetak/templat', [SiswaCetakController::class, 'templat'])->name('api.cetak.templat');

// Tidak ada endpoint pendaftaran mandiri. Akun dibuat oleh admin/seeder.
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/me', [AuthController::class, 'me'])
        ->middleware('active')
        ->name('api.me');
    Route::put('/password', [AuthController::class, 'updatePassword'])
        ->middleware('active')
        ->name('api.password.update');

    // Materi dapat dibaca oleh semua akun yang sudah aktif dan menyelesaikan
    // penggantian password awal.
    Route::middleware(['active', 'password.changed'])->group(function () {
        Route::get('/materi', [AdminMateriController::class, 'publicIndex'])->name('api.materi.index');

        // Policy membatasi kelola materi untuk admin/guru BK; penghapusan hanya admin.
        Route::apiResource('/admin/materi', AdminMateriController::class)
            ->parameters(['materi' => 'materi']);
    });

    // Endpoint verifikasi akses ini menjadi contoh sekaligus sarana uji middleware role.
    // Endpoint CRUD berikutnya harus memakai pola auth:sanctum + active + password.changed + role.
    Route::get('/admin/access-check', function (Request $request) {
        return response()->json(['success' => true, 'message' => 'Akses admin diterima.', 'role' => $request->user()->role]);
    })->middleware(['active', 'password.changed', 'role:admin'])->name('api.admin.access-check');

    Route::get('/guru/access-check', function (Request $request) {
        return response()->json(['success' => true, 'message' => 'Akses Guru BK diterima.', 'role' => $request->user()->role]);
    })->middleware(['active', 'password.changed', 'role:guru_bk'])->name('api.guru.access-check');

    // Guru BK hanya dapat membaca siswa yang ditugaskan pada tahun ajaran berjalan.
    Route::middleware(['active', 'password.changed', 'role:guru_bk'])
        ->prefix('guru')
        ->name('api.guru.')
        ->group(function () {
            Route::get('siswa', [GuruSiswaController::class, 'index'])->name('siswa.index');
            Route::get('siswa/{siswa}/tugas', [GuruSiswaController::class, 'tugas'])->whereNumber('siswa')->name('siswa.tugas');
            Route::get('siswa/{siswa}/jadwal', [GuruSiswaController::class, 'jadwal'])->whereNumber('siswa')->name('siswa.jadwal');
            Route::get('siswa/{siswa}/refleksi', [GuruSiswaController::class, 'refleksi'])->whereNumber('siswa')->name('siswa.refleksi');
            Route::apiResource('komentar', GuruKomentarController::class)->parameters(['komentar' => 'komentar']);

            // Endpoint statis harus diletakkan sebelum apiResource agar tidak dianggap sebagai ID.
            Route::get('layanan/options', [GuruLayananController::class, 'options'])->name('layanan.options');
            Route::get('layanan/rekap', [GuruLayananController::class, 'rekap'])->name('layanan.rekap');
            Route::apiResource('layanan', GuruLayananController::class)->parameters(['layanan' => 'layanan']);
        });

    Route::get('/siswa/access-check', function (Request $request) {
        return response()->json(['success' => true, 'message' => 'Akses siswa diterima.', 'role' => $request->user()->role]);
    })->middleware(['active', 'password.changed', 'role:siswa'])->name('api.siswa.access-check');

    // Siswa hanya dapat mengelola tugas milik profil pada akun yang sedang login.
    Route::middleware(['active', 'password.changed', 'role:siswa'])
        ->prefix('siswa')
        ->name('api.siswa.')
        ->group(function () {
            Route::get('cetak/{tahun}/{minggu}', [SiswaCetakController::class, 'jadwal'])
                ->where(['tahun' => '[0-9]{4}', 'minggu' => '[0-9]{1,2}'])
                ->name('cetak.jadwal');
            Route::apiResource('tugas', SiswaTugasController::class)->parameters(['tugas' => 'tugas']);

            // Rute salin diletakkan sebelum apiResource agar tidak dianggap sebagai ID jadwal.
            Route::post('jadwal/salin', [SiswaJadwalController::class, 'salin'])->name('jadwal.salin');
            Route::apiResource('jadwal', SiswaJadwalController::class)->parameters(['jadwal' => 'jadwal']);
            Route::apiResource('refleksi', SiswaRefleksiController::class)->parameters(['refleksi' => 'refleksi']);
            Route::get('layanan', [SiswaLayananController::class, 'index'])->name('layanan.index');
        });

    // Seluruh pengelolaan guru BK hanya dapat dilakukan admin yang akunnya aktif
    // dan sudah menyelesaikan kewajiban penggantian password awal.
    Route::middleware(['active', 'password.changed', 'role:admin'])
        ->prefix('admin')
        ->name('api.admin.')
        ->group(function () {
            Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
            Route::get('monitoring-guru', [AdminMonitoringGuruController::class, 'index'])->name('monitoring-guru');
            Route::get('rekap-layanan/export', [AdminRekapLayananController::class, 'export'])->name('rekap-layanan.export');
            Route::get('rekap-layanan', [AdminRekapLayananController::class, 'index'])->name('rekap-layanan.index');
            Route::get('log', [AdminLogController::class, 'index'])->name('log.index');

            Route::apiResource('guru', AdminGuruController::class);

            // Rute statis diletakkan sebelum apiResource agar tidak dianggap sebagai ID.
            Route::post('siswa/import/preview', [AdminSiswaController::class, 'previewImport'])
                ->name('siswa.import.preview');
            Route::post('siswa/import', [AdminSiswaController::class, 'import'])
                ->name('siswa.import');
            Route::get('penugasan/options', [AdminPenugasanController::class, 'options'])
                ->name('penugasan.options');

            Route::apiResource('siswa', AdminSiswaController::class);
            Route::apiResource('kelas', AdminKelasController::class)->parameters(['kelas' => 'kelas']);
            Route::apiResource('penugasan', AdminPenugasanController::class);
            Route::patch('guru/{guru}/status', [AdminGuruController::class, 'toggleStatus'])
                ->name('guru.toggle-status');
            Route::post('users/{id}/reset-password', [AdminGuruController::class, 'resetPassword'])
                ->whereNumber('id')
                ->name('users.reset-password');
        });
});
