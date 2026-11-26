<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exports\AdminRekapLayananExport;
use App\Http\Controllers\Controller;
use App\Support\AdminRekapLayananQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class AdminRekapLayananController extends Controller
{
    /**
     * Mengembalikan ringkasan tanpa topik maupun tindak_lanjut.
     * Query hanya memilih kolom yang boleh dilihat admin.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);
        $perPage = $filters['per_page'] ?? 10;

        $results = AdminRekapLayananQuery::build($filters)
            ->orderByDesc('lb.tanggal')
            ->orderByDesc('lb.id')
            ->paginate($perPage)
            ->appends($request->query());

        $results->through(fn ($row) => [
            'id' => (int) $row->id,
            'guru' => [
                'id' => (int) $row->guru_id,
                'nama' => $row->guru_nama,
            ],
            'siswa' => $row->siswa_id ? [
                'id' => (int) $row->siswa_id,
                'nama' => $row->siswa_nama,
            ] : null,
            'kelas' => $row->kelas_id ? [
                'id' => (int) $row->kelas_id,
                'nama_kelas' => $row->nama_kelas,
                'tahun_ajaran' => $row->tahun_ajaran,
            ] : null,
            'jenis_layanan' => $row->jenis_layanan,
            'tanggal' => $row->tanggal,
        ]);

        return response()->json($results);
    }

    /** Unduh rekap ringkasan sebagai XLSX. Perlu maatwebsite/excel terpasang. */
    public function export(Request $request)
    {
        if (!class_exists(Excel::class)) {
            return response()->json([
                'message' => 'Fitur ekspor Excel memerlukan paket maatwebsite/excel. Jalankan composer require maatwebsite/excel:^3.1 pada folder backend.',
            ], 503);
        }

        $filters = $this->validatedFilters($request);
        unset($filters['per_page']);

        $filename = 'rekap-layanan-bk-' . now()->format('Ymd-His') . '.xlsx';

        return Excel::download(new AdminRekapLayananExport($filters), $filename);
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'guru_id' => ['nullable', 'integer', 'exists:guru_bk,id'],
            'kelas_id' => ['nullable', 'integer', 'exists:kelas,id'],
            'jenis_layanan' => ['nullable', 'in:klasikal,kelompok,individual,informasi,tindak_lanjut'],
            'tanggal_mulai' => ['nullable', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
    }
}
