<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->must_change_password) {
            return response()->json([
                'code' => 'PASSWORD_CHANGE_REQUIRED',
                'message' => 'Silakan ganti kata sandi awal sebelum menggunakan fitur aplikasi.',
            ], 423);
        }

        return $next($request);
    }
}
