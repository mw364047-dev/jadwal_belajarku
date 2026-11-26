<?php

namespace App\Policies;

use App\Models\KomentarGuru;
use App\Models\User;
use App\Support\TahunAjaran;

class KomentarGuruPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'guru_bk' && $user->guruBk()->exists();
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    /** Guru dapat membaca komentar pada siswa binaan, kecuali komentar refleksi privat. */
    public function view(User $user, KomentarGuru $komentar): bool
    {
        if ($user->role !== 'guru_bk' || ($komentar->refleksi_id && $komentar->refleksi?->hanya_untuk_saya)) {
            return false;
        }

        $guru = $user->guruBk()->first();
        return $guru && $guru->siswaBinaan()
            ->where('siswa.id', $komentar->siswa_id)
            ->wherePivot('tahun_ajaran', TahunAjaran::berjalan())
            ->exists();
    }

    /** Guru hanya dapat mengubah komentar yang dibuat oleh profil gurunya sendiri. */
    public function update(User $user, KomentarGuru $komentar): bool
    {
        return $this->view($user, $komentar)
            && (int) ($user->guruBk?->id ?? 0) === (int) $komentar->guru_id;
    }

    public function delete(User $user, KomentarGuru $komentar): bool
    {
        return $this->view($user, $komentar)
            && (int) ($user->guruBk?->id ?? 0) === (int) $komentar->guru_id;
    }
}
