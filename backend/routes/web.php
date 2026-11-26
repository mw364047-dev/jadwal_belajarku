<?php

use Illuminate\Support\Facades\Route;

// Frontend SPA dijalankan terpisah oleh Vite. Endpoint halaman web belum diperlukan.
Route::get('/', function () {
    return response()->json([
        'application' => 'Jadwal Belajarku API',
        'message' => 'Gunakan frontend Vite untuk antarmuka aplikasi.',
    ]);
});
