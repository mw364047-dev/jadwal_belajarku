<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->is_active) {
            // Putuskan sesi aktif agar akun yang dinonaktifkan tidak dapat memakai sesi lama.
            Auth::guard('web')->logout();

            $token = $user->currentAccessToken();
            if ($token && method_exists($token, 'delete')) {
                $token->delete();
            }

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'Akun ini sedang dinonaktifkan. Silakan hubungi administrator.',
            ], 403);
        }

        return $next($request);
    }
}
