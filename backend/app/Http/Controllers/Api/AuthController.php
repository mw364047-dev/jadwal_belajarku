<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Masuk menggunakan username atau email dan password.
     * Akun dikunci selama 10 menit setelah lima kali password salah.
     */
    public function login(Request $request): JsonResponse
    {
        if (!$request->hasSession()) {
            return response()->json([
                'message' => 'Sesi SPA belum aktif. Pastikan origin frontend terdaftar pada SANCTUM_STATEFUL_DOMAINS dan gunakan hostname yang sama.',
            ], 400);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ], [
            'username.required' => 'Masukkan username atau email.',
            'password.required' => 'Masukkan kata sandi.',
        ]);

        $identifier = trim($validated['username']);
        $user = User::query()
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Username/email atau kata sandi tidak sesuai.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'Akun ini sedang dinonaktifkan. Silakan hubungi administrator.',
            ], 403);
        }

        if ($user->locked_until && $user->locked_until->isFuture()) {
            return $this->lockedResponse($user->locked_until);
        }

        if (!Hash::check($validated['password'], $user->password)) {
            $failureState = DB::transaction(function () use ($user): array {
                /** @var User|null $account */
                $account = User::query()->lockForUpdate()->find($user->id);

                if (!$account) {
                    return ['locked_until' => null, 'remaining' => 0, 'already_locked' => false];
                }

                if (!$account->is_active) {
                    return ['locked_until' => null, 'remaining' => 0, 'inactive' => true];
                }

                if ($account->locked_until && $account->locked_until->isFuture()) {
                    return [
                        'locked_until' => $account->locked_until,
                        'remaining' => 0,
                        'already_locked' => true,
                    ];
                }

                // Masa penguncian yang sudah lewat memulai hitungan baru.
                if ($account->locked_until && $account->locked_until->isPast()) {
                    $account->failed_login_count = 0;
                    $account->locked_until = null;
                }

                $account->failed_login_count = min(5, (int) $account->failed_login_count + 1);

                if ($account->failed_login_count >= 5) {
                    $account->locked_until = now()->addMinutes(10);
                }

                $account->save();

                return [
                    'locked_until' => $account->locked_until,
                    'remaining' => max(0, 5 - (int) $account->failed_login_count),
                    'already_locked' => false,
                ];
            });

            if (!empty($failureState['inactive'])) {
                return response()->json([
                    'code' => 'ACCOUNT_INACTIVE',
                    'message' => 'Akun ini sedang dinonaktifkan. Silakan hubungi administrator.',
                ], 403);
            }

            if ($failureState['locked_until']) {
                return $this->lockedResponse($failureState['locked_until']);
            }

            return response()->json([
                'message' => 'Username/email atau kata sandi tidak sesuai.',
            ], 401);
        }

        // Periksa kembali status akun/penguncian sebelum membuat sesi.
        $user->refresh();

        if (!$user->is_active) {
            return response()->json([
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'Akun ini sedang dinonaktifkan. Silakan hubungi administrator.',
            ], 403);
        }

        if ($user->locked_until && $user->locked_until->isFuture()) {
            return $this->lockedResponse($user->locked_until);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
            'failed_login_count' => 0,
            'locked_until' => null,
        ])->save();

        LogAktivitas::create([
            'user_id' => $user->id,
            'aksi' => 'login',
            'modul' => 'auth',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);

        return response()->json([
            'message' => 'Login berhasil.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    /** Mengakhiri sesi login. */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            LogAktivitas::create([
                'user_id' => $user->id,
                'aksi' => 'logout',
                'modul' => 'auth',
                'ip_address' => $request->ip(),
                'waktu' => now(),
            ]);
        }

        $token = $user?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Kamu sudah keluar dari akun.']);
    }

    /** Mengembalikan identitas pengguna yang sedang login. */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /** Mengganti password dan menyelesaikan kewajiban ganti password pertama. */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ], [
            'current_password.required' => 'Masukkan kata sandi saat ini.',
            'password.required' => 'Masukkan kata sandi baru.',
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi baru belum sama.',
            'password.different' => 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Kata sandi saat ini tidak sesuai.',
                'errors' => [
                    'current_password' => ['Kata sandi saat ini tidak sesuai.'],
                ],
            ], 422);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
            'failed_login_count' => 0,
            'locked_until' => null,
        ])->save();

        LogAktivitas::create([
            'user_id' => $user->id,
            'aksi' => 'ubah_password',
            'modul' => 'auth',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui.',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    private function lockedResponse($lockedUntil): JsonResponse
    {
        $seconds = max(1, (int) now()->diffInSeconds($lockedUntil));

        return response()->json([
            'code' => 'ACCOUNT_LOCKED',
            'message' => 'Akun terkunci sementara karena terlalu banyak percobaan login. Silakan coba kembali setelah 10 menit.',
            'locked_until' => $lockedUntil->toIso8601String(),
            'retry_after_seconds' => $seconds,
        ], 423);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'nama' => $user->nama,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => (bool) $user->is_active,
            'must_change_password' => (bool) $user->must_change_password,
        ];
    }
}
