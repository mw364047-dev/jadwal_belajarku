<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Login is handled by the React SPA, not by a named Laravel web route.
     * API requests must not attempt to redirect to route('login').
     */
    protected function redirectTo($request)
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return null;
        }

        return route('login');
    }
}
