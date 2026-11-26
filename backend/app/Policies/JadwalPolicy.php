<?php

namespace App\Policies;

use App\Models\Jadwal;
use App\Models\User;

class JadwalPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'siswa' && $user->siswa()->exists();
    }

    public function view(User $user, Jadwal $jadwal): bool
    {
        return $user->role === 'siswa'
            && (int) ($user->siswa?->id ?? 0) === (int) $jadwal->siswa_id;
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Jadwal $jadwal): bool
    {
        return $this->view($user, $jadwal);
    }

    public function delete(User $user, Jadwal $jadwal): bool
    {
        return $this->view($user, $jadwal);
    }
}
