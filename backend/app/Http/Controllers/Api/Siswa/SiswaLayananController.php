<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use App\Models\Siswa;
use App\Models\LayananBk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiswaLayananController extends Controller
{
    /**
     * Ringkasan layanan untuk siswa login. Hanya jenis dan tanggal yang dikirim;
     * topik dan tindak_lanjut tidak pernah dipilih atau diserialisasi.
     * Catatan untuk kelas turut terlihat oleh siswa yang berada di kelas tersebut.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user()->siswa()->with('kelas:id,nama_kelas,tahun_ajaran')->first();
        abort_if(!$student, 404, 'Profil siswa tidak ditemukan.');

        $records = LayananBk::query()
            ->select(['id', 'siswa_id', 'kelas_id', 'jenis_layanan', 'tanggal'])
            ->where(function ($query) use ($student) {
                $query->where('siswa_id', $student->id);
                if ($student->kelas_id) {
                    $query->orWhere('kelas_id', $student->kelas_id);
                }
            })
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($record) => [
                'jenis_layanan' => $record->jenis_layanan,
                'tanggal' => $record->tanggal?->format('Y-m-d'),
            ])
            ->values();

        return response()->json([
            'data' => $records,
            'total' => $records->count(),
        ]);
    }
}
