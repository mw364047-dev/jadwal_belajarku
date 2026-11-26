<?php

namespace App\Policies;

use App\Models\LayananBk;
use App\Models\User;

class LayananBkPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'guru_bk' && $user->guruBk()->exists();
    }

    public function view(User $user, LayananBk $layanan): bool
    {
        return $user->role === 'guru_bk'
            && (int) ($user->guruBk?->id ?? 0) === (int) $layanan->guru_id;
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, LayananBk $layanan): bool
    {
        return $this->view($user, $layanan);
    }

    public function delete(User $user, LayananBk $layanan): bool
    {
        return $this->view($user, $layanan);
    }
}
