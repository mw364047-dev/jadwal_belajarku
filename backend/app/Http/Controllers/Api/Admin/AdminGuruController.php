<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGuruRequest;
use App\Http\Requests\Admin\UpdateGuruRequest;
use App\Models\GuruBk;
use App\Models\LogAktivitas;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AdminGuruController extends Controller
{
    /** Daftar guru BK dengan pencarian, filter status, dan paginasi. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:semua,aktif,nonaktif'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $search = trim((string) ($filters['search'] ?? ''));
        $status = $filters['status'] ?? 'semua';

        $query = GuruBk::query()
            ->with('user')
            ->whereHas('user', fn (Builder $userQuery) => $userQuery->where('role', 'guru_bk'));

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder->whereHas('user', function (Builder $userQuery) use ($like): void {
                    $userQuery->where('role', 'guru_bk')
                        ->where(function (Builder $fields) use ($like): void {
                            $fields->where('nama', 'like', $like)
                                ->orWhere('username', 'like', $like)
                                ->orWhere('email', 'like', $like);
                        });
                })->orWhere('nip', 'like', $like)
                    ->orWhere('jabatan', 'like', $like);
            });
        }

        if ($status === 'aktif' || $status === 'nonaktif') {
            $isActive = $status === 'aktif';
            $query->whereHas('user', fn (Builder $userQuery) => $userQuery
                ->where('role', 'guru_bk')
                ->where('is_active', $isActive));
        }

        $gurus = $query->orderByDesc('id')->paginate($filters['per_page'] ?? 10);
        $gurus->through(fn (GuruBk $guru) => $this->guruPayload($guru));

        return response()->json($gurus);
    }

    /** Membuat akun guru BK dan profilnya. Password sementara hanya dikirim sekali. */
    public function store(StoreGuruRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $temporaryPassword = $this->generateTemporaryPassword();

        $guru = DB::transaction(function () use ($validated, $temporaryPassword, $request): GuruBk {
            $user = User::create([
                'nama' => $validated['nama'],
                'username' => $validated['username'],
                'email' => $validated['email'] ?? null,
                'password' => $temporaryPassword,
                'role' => 'guru_bk',
                'is_active' => true,
                'must_change_password' => true,
            ]);

            $guru = $user->guruBk()->create([
                'nip' => $validated['nip'] ?? null,
                'jabatan' => $validated['jabatan'] ?? null,
            ]);

            $this->recordActivity($request, 'tambah_guru');

            return $guru->load('user');
        });

        return response()->json([
            'message' => 'Data guru BK berhasil ditambahkan.',
            'data' => $this->guruPayload($guru),
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    /** Menampilkan satu guru BK. */
    public function show(GuruBk $guru): JsonResponse
    {
        $this->activeGuruUser($guru);

        return response()->json(['data' => $this->guruPayload($guru->load('user'))]);
    }

    /** Memperbarui akun dan profil guru BK. */
    public function update(UpdateGuruRequest $request, GuruBk $guru): JsonResponse
    {
        $validated = $request->validated();
        $user = $this->activeGuruUser($guru);

        DB::transaction(function () use ($validated, $user, $guru, $request): void {
            $user->update([
                'nama' => $validated['nama'],
                'username' => $validated['username'],
                'email' => $validated['email'] ?? null,
            ]);

            $guru->update([
                'nip' => $validated['nip'] ?? null,
                'jabatan' => $validated['jabatan'] ?? null,
            ]);

            $this->recordActivity($request, 'ubah_guru');
        });

        return response()->json([
            'message' => 'Data guru BK berhasil diperbarui.',
            'data' => $this->guruPayload($guru->fresh()->load('user')),
        ]);
    }

    /** Soft delete akun guru BK; profil dan relasi historis tetap dipertahankan. */
    public function destroy(Request $request, GuruBk $guru): JsonResponse
    {
        $user = $this->activeGuruUser($guru);

        DB::transaction(function () use ($user, $request): void {
            $user->forceFill(['is_active' => false])->save();
            $user->delete();
            $this->recordActivity($request, 'hapus_guru');
        });

        return response()->json(['message' => 'Akun guru BK berhasil dihapus secara soft delete.']);
    }

    /** Mengaktifkan atau menonaktifkan akun guru BK. */
    public function toggleStatus(Request $request, GuruBk $guru): JsonResponse
    {
        $user = $this->activeGuruUser($guru);
        $user->is_active = !$user->is_active;
        $user->save();

        $this->recordActivity($request, $user->is_active ? 'aktifkan_guru' : 'nonaktifkan_guru');

        return response()->json([
            'message' => $user->is_active ? 'Akun guru BK berhasil diaktifkan.' : 'Akun guru BK berhasil dinonaktifkan.',
            'data' => $this->guruPayload($guru->fresh()->load('user')),
        ]);
    }

    /** Membuat password sementara untuk akun guru BK; nilai plaintext hanya dikembalikan sekali. */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $user = User::query()->where('role', 'guru_bk')->findOrFail($id);
        $temporaryPassword = $this->generateTemporaryPassword();

        $user->forceFill([
            'password' => $temporaryPassword,
            'must_change_password' => true,
            'failed_login_count' => 0,
            'locked_until' => null,
        ])->save();

        $this->recordActivity($request, 'reset_password_guru');

        return response()->json([
            'message' => 'Password sementara berhasil dibuat. Berikan kepada guru BK melalui saluran yang aman.',
            'temporary_password' => $temporaryPassword,
            'user' => [
                'id' => $user->id,
                'nama' => $user->nama,
                'username' => $user->username,
            ],
        ]);
    }

    /** Menolak profil guru yang user-nya sudah di-soft-delete atau bukan role guru_bk. */
    private function activeGuruUser(GuruBk $guru): User
    {
        $user = $guru->user()->first();

        if (!$user || $user->role !== 'guru_bk') {
            throw new NotFoundHttpException('Data guru BK tidak ditemukan.');
        }

        return $user;
    }

    private function guruPayload(GuruBk $guru): array
    {
        $user = $guru->user;

        return [
            'id' => $guru->id,
            'user_id' => $user?->id,
            'nama' => $user?->nama,
            'username' => $user?->username,
            'email' => $user?->email,
            'nip' => $guru->nip,
            'jabatan' => $guru->jabatan,
            'is_active' => (bool) ($user?->is_active ?? false),
            'must_change_password' => (bool) ($user?->must_change_password ?? false),
            'last_login_at' => $user?->last_login_at,
            'created_at' => $guru->created_at,
        ];
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'guru_bk',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }

    /** Membuat password acak dengan huruf besar, huruf kecil, angka, dan simbol. */
    private function generateTemporaryPassword(): string
    {
        $groups = [
            'ABCDEFGHJKLMNPQRSTUVWXYZ',
            'abcdefghijkmnopqrstuvwxyz',
            '23456789',
            '!@#$%&*',
        ];

        $characters = [];
        foreach ($groups as $group) {
            $characters[] = $group[random_int(0, strlen($group) - 1)];
        }

        $allCharacters = implode('', $groups);
        for ($index = 0; $index < 8; $index++) {
            $characters[] = $allCharacters[random_int(0, strlen($allCharacters) - 1)];
        }

        // Fisher-Yates shuffle menggunakan random_int agar posisi karakter tidak mudah ditebak.
        for ($index = count($characters) - 1; $index > 0; $index--) {
            $swapIndex = random_int(0, $index);
            [$characters[$index], $characters[$swapIndex]] = [$characters[$swapIndex], $characters[$index]];
        }

        return implode('', $characters);
    }
}
