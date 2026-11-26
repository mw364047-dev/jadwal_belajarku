<?php

namespace App\Policies;

use App\Models\Siswa;
use App\Models\User;
use App\Support\TahunAjaran;

class GuruSiswaPolicy
{
    public function viewForGuru(User $user, Siswa $siswa): bool
    {
        if ($user->role !== 'guru_bk') {
            return false;
        }

        $guru = $user->guruBk()->first();
        if (!$guru) {
            return false;
        }

        return $guru->siswaBinaan()
            ->where('siswa.id', $siswa->id)
            ->wherePivot('tahun_ajaran', TahunAjaran::berjalan())
            ->exists();
    }
}
