<?php

namespace App\Policies;

use App\Models\Tugas;
use App\Models\User;

class TugasPolicy
{
    /** Hanya akun siswa yang sudah memiliki profil siswa dapat melihat daftar tugas. */
    public function viewAny(User $user): bool
    {
        return $user->role === 'siswa' && $user->siswa()->exists();
    }

    /** Memastikan tugas dimiliki oleh profil siswa dari akun yang sedang login. */
    public function view(User $user, Tugas $tugas): bool
    {
        return $user->role === 'siswa'
            && (int) ($user->siswa?->id ?? 0) === (int) $tugas->siswa_id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'siswa' && $user->siswa()->exists();
    }

    public function update(User $user, Tugas $tugas): bool
    {
        return $this->view($user, $tugas);
    }

    public function delete(User $user, Tugas $tugas): bool
    {
        return $this->view($user, $tugas);
    }
}
