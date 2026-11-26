<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLogController extends Controller
{
    /** Daftar aktivitas dengan filter pengguna dan tanggal. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'tanggal_mulai' => ['nullable', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = LogAktivitas::query()
            ->with('user:id,nama,username,role')
            ->when(!empty($filters['user_id']), fn ($builder) => $builder->where('user_id', $filters['user_id']))
            ->when(!empty($filters['tanggal_mulai']), fn ($builder) => $builder->whereDate('waktu', '>=', $filters['tanggal_mulai']))
            ->when(!empty($filters['tanggal_selesai']), fn ($builder) => $builder->whereDate('waktu', '<=', $filters['tanggal_selesai']))
            ->orderByDesc('waktu');

        $logs = $query->paginate($filters['per_page'] ?? 15)->appends($request->query());
        $logs->through(fn (LogAktivitas $log) => [
            'id' => $log->id,
            'user_id' => $log->user_id,
            'pengguna' => $log->user?->nama ?? 'Pengguna dihapus',
            'username' => $log->user?->username,
            'role' => $log->user?->role,
            'aksi' => $log->aksi,
            'modul' => $log->modul,
            'ip_address' => $log->ip_address,
            'waktu' => $log->waktu,
        ]);

        $users = User::query()
            ->whereHas('logAktivitas')
            ->select(['id', 'nama', 'username', 'role'])
            ->orderBy('nama')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'nama' => $user->nama,
                'username' => $user->username,
                'role' => $user->role,
            ]);

        return response()->json([
            'logs' => $logs,
            'users' => $users,
        ]);
    }
}
