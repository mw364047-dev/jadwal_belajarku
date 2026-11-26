<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMonitoringGuruController extends Controller
{
    /** Daftar guru BK, riwayat login, dan ringkasan jumlah layanan pada periode terpilih. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'tanggal_mulai' => ['nullable', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $applyPeriod = function (Builder $query) use ($filters): void {
            if (!empty($filters['tanggal_mulai'])) {
                $query->whereDate('tanggal', '>=', $filters['tanggal_mulai']);
            }
            if (!empty($filters['tanggal_selesai'])) {
                $query->whereDate('tanggal', '<=', $filters['tanggal_selesai']);
            }
        };

        $query = GuruBk::query()
            ->with('user:id,nama,username,is_active,last_login_at')
            ->whereHas('user', fn (Builder $userQuery) => $userQuery->where('role', 'guru_bk'))
            ->withCount(['layanan as jumlah_layanan' => $applyPeriod])
            ->withMax(['layanan as layanan_terakhir' => $applyPeriod], 'tanggal');

        if (!empty($filters['search'])) {
            $like = '%' . trim($filters['search']) . '%';
            $query->whereHas('user', fn (Builder $userQuery) => $userQuery
                ->where('role', 'guru_bk')
                ->where('nama', 'like', $like));
        }

        $gurus = $query->orderByDesc('id')->paginate($filters['per_page'] ?? 10);
        $gurus->through(fn (GuruBk $guru) => [
            'id' => $guru->id,
            'nama' => $guru->user?->nama,
            'username' => $guru->user?->username,
            'is_active' => (bool) ($guru->user?->is_active ?? false),
            'last_login_at' => $guru->user?->last_login_at,
            'jumlah_layanan' => (int) ($guru->jumlah_layanan ?? 0),
            'layanan_terakhir' => $guru->layanan_terakhir,
        ]);

        return response()->json($gurus);
    }
}
