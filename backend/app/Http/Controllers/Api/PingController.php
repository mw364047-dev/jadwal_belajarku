<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PingController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'application' => 'Jadwal Belajarku',
            'message' => 'API Jadwal Belajarku aktif.',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
