<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Browser navigation to an API URL (such as opening a PDF in a new tab)
     * may send Accept: text/html. Keep unauthenticated API responses JSON so
     * Laravel does not try to redirect to the missing backend login route.
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        if ($request->is('api/*')) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return parent::unauthenticated($request, $exception);
    }

    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // Pelaporan error tambahan dapat dikonfigurasi di sini.
        });
    }
}
