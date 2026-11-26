<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use App\Models\Kelas;
use App\Models\LayananBk;
use App\Models\LogAktivitas;
use App\Models\Siswa;
use App\Support\TahunAjaran;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class GuruLayananController extends Controller
{
    private const JENIS_LAYANAN = ['klasikal', 'kelompok', 'individual', 'informasi', 'tindak_lanjut'];

    /** Daftar catatan yang dibuat oleh guru yang sedang login. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LayananBk::class);
        $guru = $this->currentGuru($request);
        $filters = $this->validatedFilters($request);

        // Ubah HasMany menjadi Eloquent Builder sebelum menerapkan filter.
        // Relasi sudah membawa kondisi guru_id dari profil guru yang login.
        $query = $guru->layanan()->getQuery()
            ->with([
                'siswa.user:id,nama',
                'siswa.kelas:id,nama_kelas,tahun_ajaran',
                'kelas:id,nama_kelas,tahun_ajaran',
            ]);
        $this->applyFilters($query, $filters);

        $records = $query->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10)
            ->appends($request->query());

        $records->through(fn (LayananBk $record) => $this->recordPayload($record, true));

        return response()->json($records);
    }

    /** Pilihan target hanya berisi siswa dan kelas yang ditugaskan kepada guru login. */
    public function options(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LayananBk::class);
        $guru = $this->currentGuru($request);
        $academicYear = TahunAjaran::berjalan();

        $students = $guru->siswaBinaan()
            ->wherePivot('tahun_ajaran', $academicYear)
            ->with([
                'user:id,nama',
                'kelas:id,nama_kelas,tahun_ajaran',
            ])
            ->orderBy('siswa.id')
            ->get();

        $studentOptions = $students->map(fn (Siswa $student) => [
            'id' => (int) $student->id,
            'nama' => $student->user?->nama ?? 'Siswa',
            'nis' => $student->nis,
            'kelas' => $student->kelas?->nama_kelas,
        ])->values();

        $classOptions = $students
            ->pluck('kelas')
            ->filter()
            ->unique('id')
            ->sortBy(fn ($class) => $class->nama_kelas)
            ->values()
            ->map(fn (Kelas $class) => [
                'id' => (int) $class->id,
                'nama_kelas' => $class->nama_kelas,
                'tahun_ajaran' => $class->tahun_ajaran,
            ]);

        return response()->json([
            'siswa' => $studentOptions,
            'kelas' => $classOptions,
            'tahun_ajaran' => $academicYear,
        ]);
    }

    /** Rekap per jenis dan bulan hanya untuk catatan guru yang sedang login. */
    public function rekap(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LayananBk::class);
        $guru = $this->currentGuru($request);
        $filters = $this->validatedFilters($request, false);

        $base = LayananBk::query()->where('guru_id', $guru->id);
        $this->applyFilters($base, $filters);

        $perJenis = (clone $base)
            ->selectRaw('jenis_layanan, COUNT(*) AS jumlah')
            ->groupBy('jenis_layanan')
            ->orderBy('jenis_layanan')
            ->get()
            ->map(fn ($row) => [
                'jenis_layanan' => $row->jenis_layanan,
                'jumlah' => (int) $row->jumlah,
            ])
            ->values();

        $perBulan = (clone $base)
            ->selectRaw("DATE_FORMAT(tanggal, '%Y-%m') AS bulan, COUNT(*) AS jumlah")
            ->groupBy('bulan')
            ->orderBy('bulan')
            ->get()
            ->map(fn ($row) => [
                'bulan' => $row->bulan,
                'jumlah' => (int) $row->jumlah,
            ])
            ->values();

        return response()->json([
            'total' => (int) (clone $base)->count(),
            'per_jenis' => $perJenis,
            'per_bulan' => $perBulan,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', LayananBk::class);
        $guru = $this->currentGuru($request);
        $payload = $this->validatedPayload($request);
        $this->ensureAssignedTarget($guru, $payload);

        $record = DB::transaction(function () use ($guru, $payload, $request): LayananBk {
            $record = $guru->layanan()->create($payload);
            $this->writeLog($request, 'menambahkan_catatan_layanan');
            return $record;
        });

        $record->load(['siswa.user:id,nama', 'siswa.kelas:id,nama_kelas,tahun_ajaran', 'kelas:id,nama_kelas,tahun_ajaran']);

        return response()->json([
            'message' => 'Catatan layanan berhasil disimpan.',
            'data' => $this->recordPayload($record, true),
        ], 201);
    }

    public function show(Request $request, int $layanan): JsonResponse
    {
        $record = $this->ownedRecord($request, $layanan);
        $this->authorize('view', $record);
        $record->load(['siswa.user:id,nama', 'siswa.kelas:id,nama_kelas,tahun_ajaran', 'kelas:id,nama_kelas,tahun_ajaran']);

        return response()->json(['data' => $this->recordPayload($record, true)]);
    }

    public function update(Request $request, int $layanan): JsonResponse
    {
        $record = $this->ownedRecord($request, $layanan);
        $this->authorize('update', $record);
        $guru = $this->currentGuru($request);
        $payload = $this->validatedPayload($request, $record);
        $this->ensureAssignedTarget($guru, $payload);

        DB::transaction(function () use ($record, $payload, $request): void {
            $record->fill($payload);
            $record->save();
            $this->writeLog($request, 'mengubah_catatan_layanan');
        });

        $record->refresh()->load(['siswa.user:id,nama', 'siswa.kelas:id,nama_kelas,tahun_ajaran', 'kelas:id,nama_kelas,tahun_ajaran']);

        return response()->json([
            'message' => 'Catatan layanan berhasil diperbarui.',
            'data' => $this->recordPayload($record, true),
        ]);
    }

    public function destroy(Request $request, int $layanan): JsonResponse
    {
        $record = $this->ownedRecord($request, $layanan);
        $this->authorize('delete', $record);

        DB::transaction(function () use ($record, $request): void {
            $record->delete(); // Soft delete; catatan tetap tersimpan di database.
            $this->writeLog($request, 'menghapus_catatan_layanan');
        });

        return response()->json(['message' => 'Catatan layanan berhasil dihapus.']);
    }

    private function currentGuru(Request $request): GuruBk
    {
        $guru = $request->user()->guruBk()->first();
        abort_if(!$guru, 404, 'Profil Guru BK tidak ditemukan.');
        return $guru;
    }

    private function ownedRecord(Request $request, int $id): LayananBk
    {
        return $this->currentGuru($request)->layanan()->whereKey($id)->firstOrFail();
    }

    private function validatedFilters(Request $request, bool $includePagination = true): array
    {
        $rules = [
            'jenis_layanan' => ['nullable', 'in:' . implode(',', self::JENIS_LAYANAN)],
            'tanggal_mulai' => ['nullable', 'date_format:Y-m-d'],
            'tanggal_selesai' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:tanggal_mulai'],
        ];

        if ($includePagination) {
            $rules['per_page'] = ['nullable', 'integer', 'min:1', 'max:100'];
            $rules['page'] = ['nullable', 'integer', 'min:1'];
        }

        return $request->validate($rules);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['jenis_layanan'])) {
            $query->where('jenis_layanan', $filters['jenis_layanan']);
        }
        if (!empty($filters['tanggal_mulai'])) {
            $query->whereDate('tanggal', '>=', $filters['tanggal_mulai']);
        }
        if (!empty($filters['tanggal_selesai'])) {
            $query->whereDate('tanggal', '<=', $filters['tanggal_selesai']);
        }
    }

    /**
     * Validasi gabungan juga mendukung PATCH: field yang tidak dikirim memakai nilai lama.
     * siswa_id/kelas_id tetap harus tepat satu dan target wajib berada dalam binaan aktif.
     */
    private function validatedPayload(Request $request, ?LayananBk $existing = null): array
    {
        $input = [
            'jenis_layanan' => $request->input('jenis_layanan', $existing?->jenis_layanan),
            'siswa_id' => $request->exists('siswa_id') ? $request->input('siswa_id') : $existing?->siswa_id,
            'kelas_id' => $request->exists('kelas_id') ? $request->input('kelas_id') : $existing?->kelas_id,
            'tanggal' => $request->input('tanggal', $existing?->tanggal?->format('Y-m-d')),
            'topik' => $request->input('topik', $existing?->topik),
            'tindak_lanjut' => $request->exists('tindak_lanjut') ? $request->input('tindak_lanjut') : $existing?->tindak_lanjut,
        ];

        $payload = Validator::make($input, [
            'jenis_layanan' => ['required', 'in:' . implode(',', self::JENIS_LAYANAN)],
            'siswa_id' => ['nullable', 'integer', 'min:1'],
            'kelas_id' => ['nullable', 'integer', 'min:1'],
            'tanggal' => ['required', 'date_format:Y-m-d'],
            'topik' => ['required', 'string', 'max:180'],
            'tindak_lanjut' => ['nullable', 'string', 'max:20000'],
        ])->validate();

        $hasStudent = !empty($payload['siswa_id']);
        $hasClass = !empty($payload['kelas_id']);

        if ($hasStudent === $hasClass) {
            throw ValidationException::withMessages([
                'siswa_id' => ['Pilih satu sasaran layanan: siswa binaan atau kelas binaan.'],
            ]);
        }

        if ($payload['jenis_layanan'] === 'klasikal' && !$hasClass) {
            throw ValidationException::withMessages([
                'kelas_id' => ['Layanan klasikal harus ditujukan kepada kelas binaan.'],
            ]);
        }

        return $payload;
    }

    private function ensureAssignedTarget(GuruBk $guru, array $payload): void
    {
        $academicYear = TahunAjaran::berjalan();

        if (!empty($payload['siswa_id'])) {
            $assigned = $guru->siswaBinaan()
                ->where('siswa.id', $payload['siswa_id'])
                ->wherePivot('tahun_ajaran', $academicYear)
                ->exists();

            if (!$assigned) {
                throw ValidationException::withMessages([
                    'siswa_id' => ['Siswa tersebut tidak termasuk siswa binaanmu pada tahun ajaran berjalan.'],
                ]);
            }

            return;
        }

        $classExists = Kelas::query()
            ->whereKey($payload['kelas_id'])
            ->where('tahun_ajaran', $academicYear)
            ->exists();

        $hasAssignedStudent = $guru->siswaBinaan()
            ->where('siswa.kelas_id', $payload['kelas_id'])
            ->wherePivot('tahun_ajaran', $academicYear)
            ->exists();

        if (!$classExists || !$hasAssignedStudent) {
            throw ValidationException::withMessages([
                'kelas_id' => ['Kelas tersebut tidak termasuk kelas binaanmu pada tahun ajaran berjalan.'],
            ]);
        }
    }

    private function recordPayload(LayananBk $record, bool $includePrivateContent): array
    {
        return [
            'id' => (int) $record->id,
            'guru_id' => (int) $record->guru_id,
            'siswa_id' => $record->siswa_id ? (int) $record->siswa_id : null,
            'kelas_id' => $record->kelas_id ? (int) $record->kelas_id : null,
            'jenis_layanan' => $record->jenis_layanan,
            'tanggal' => $record->tanggal?->format('Y-m-d'),
            'topik' => $record->topik,
            // Hanya dipanggil pada endpoint guru dan selalu untuk catatan milik guru login.
            'tindak_lanjut' => $includePrivateContent ? $record->tindak_lanjut : null,
            'siswa' => $record->siswa ? [
                'id' => (int) $record->siswa->id,
                'nama' => $record->siswa->user?->nama ?? 'Siswa',
                'nis' => $record->siswa->nis,
                'kelas' => $record->siswa->kelas?->nama_kelas,
            ] : null,
            'kelas' => $record->kelas ? [
                'id' => (int) $record->kelas->id,
                'nama_kelas' => $record->kelas->nama_kelas,
                'tahun_ajaran' => $record->kelas->tahun_ajaran,
            ] : null,
            'created_at' => $record->created_at,
            'updated_at' => $record->updated_at,
        ];
    }

    private function writeLog(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'layanan_bk',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
