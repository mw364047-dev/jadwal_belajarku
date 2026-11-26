<?php

namespace App\Policies;

use App\Models\Refleksi;
use App\Models\User;

class RefleksiPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'siswa' && $user->siswa()->exists();
    }

    public function view(User $user, Refleksi $refleksi): bool
    {
        return $user->role === 'siswa'
            && (int) ($user->siswa?->id ?? 0) === (int) $refleksi->siswa_id;
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Refleksi $refleksi): bool
    {
        return $this->view($user, $refleksi);
    }

    public function delete(User $user, Refleksi $refleksi): bool
    {
        return $this->view($user, $refleksi);
    }

    /** Guru binaan boleh mengetahui status pengisian refleksi siswa. */
    public function viewStatusForGuru(User $user, Refleksi $refleksi): bool
    {
        if ($user->role !== 'guru_bk') {
            return false;
        }

        return $user->guruBk()
            ->whereHas('siswaBinaan', fn ($query) => $query->where('siswa.id', $refleksi->siswa_id))
            ->exists();
    }

    /** Isi refleksi hanya dapat dilihat guru binaan bila siswa tidak memilih opsi privat. */
    public function viewContentForGuru(User $user, Refleksi $refleksi): bool
    {
        return $this->viewStatusForGuru($user, $refleksi) && !$refleksi->hanya_untuk_saya;
    }
}
