<?php

namespace App\Policies;

use App\Models\Materi;
use App\Models\User;

class MateriPolicy
{
    private function canManage(User $user): bool
    {
        return in_array($user->role, ['admin', 'guru_bk'], true);
    }

    public function viewAny(User $user): bool
    {
        return $this->canManage($user);
    }

    public function view(User $user, Materi $materi): bool
    {
        return $this->canManage($user);
    }

    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    public function update(User $user, Materi $materi): bool
    {
        return $this->canManage($user);
    }

    public function delete(User $user, Materi $materi): bool
    {
        // Guru BK dapat membuat dan memperbarui materi, sedangkan penghapusan
        // hanya boleh dilakukan oleh admin.
        return $user->role === 'admin';
    }
}
