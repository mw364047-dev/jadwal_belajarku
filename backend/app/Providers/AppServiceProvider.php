<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Registrasi service aplikasi ditambahkan sesuai kebutuhan fitur berikutnya.
    }

    public function boot(): void
    {
        // Pengaturan global aplikasi ditambahkan sesuai kebutuhan.
    }
}
