<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\LogAktivitas;
use App\Models\Refleksi;
use App\Models\Siswa;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SiswaRefleksiController extends Controller
{
    /**
     * Menampilkan refleksi pada minggu terpilih, jadwal minggu yang sama,
     * komentar guru untuk refleksi tersebut, dan riwayat minggu sebelumnya.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Refleksi::class);
        $siswa = $this->currentStudent($request);

        $filters = $request->validate([
            'tahun' => ['sometimes', 'integer', 'between:2000,2100'],
            'minggu_ke' => ['sometimes', 'integer', 'between:1,53'],
        ]);

        $now = CarbonImmutable::now();
        $year = (int) ($filters['tahun'] ?? $now->isoWeekYear());
        $week = (int) ($filters['minggu_ke'] ?? $now->isoWeek());
        $this->ensureValidIsoWeek($year, $week);

        $reflection = $siswa->refleksi()
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->first();

        return response()->json($this->periodPayload($siswa, $year, $week, $reflection));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Refleksi::class);
        $siswa = $this->currentStudent($request);
        $validated = $this->validateReflection($request, false);
        $year = (int) $validated['tahun'];
        $week = (int) $validated['minggu_ke'];
        $this->ensureValidIsoWeek($year, $week);

        $exists = $siswa->refleksi()->where('tahun', $year)->where('minggu_ke', $week)->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Kamu sudah mengisi refleksi untuk minggu ini. Buka refleksi yang sudah ada untuk memperbaikinya.',
                'code' => 'REFLECTION_ALREADY_EXISTS',
            ], 409);
        }

        try {
            $reflection = DB::transaction(function () use ($siswa, $validated, $request) {
                // Relasi profil login menentukan siswa_id; nilai dari klien tidak pernah digunakan.
                $reflection = $siswa->refleksi()->create($this->databasePayload($validated));
                $this->recordActivity($request, 'tambah_refleksi');
                return $reflection;
            });
        } catch (QueryException $exception) {
            if ($this->isUniqueConstraintViolation($exception)) {
                return response()->json([
                    'message' => 'Refleksi untuk minggu ini sudah tersedia. Kamu bisa membuka dan memperbaiki refleksi tersebut.',
                    'code' => 'REFLECTION_ALREADY_EXISTS',
                ], 409);
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'Refleksimu berhasil disimpan. Terima kasih sudah meluangkan waktu untuk melihat kembali proses belajarmu.',
            'data' => $this->reflectionPayload($reflection),
        ], 201);
    }

    public function show(Request $request, int $refleksi): JsonResponse
    {
        $reflection = $this->findOwnedReflection($request, $refleksi);
        $this->authorize('view', $reflection);
        $siswa = $this->currentStudent($request);

        return response()->json($this->periodPayload(
            $siswa,
            (int) $reflection->tahun,
            (int) $reflection->minggu_ke,
            $reflection
        ));
    }

    public function update(Request $request, int $refleksi): JsonResponse
    {
        $reflection = $this->findOwnedReflection($request, $refleksi);
        $this->authorize('update', $reflection);
        $validated = $this->validateReflection($request, true);

        $year = (int) ($validated['tahun'] ?? $reflection->tahun);
        $week = (int) ($validated['minggu_ke'] ?? $reflection->minggu_ke);
        $this->ensureValidIsoWeek($year, $week);

        $duplicate = $this->currentStudent($request)->refleksi()
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->where('id', '<>', $reflection->id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'Minggu tersebut sudah memiliki refleksi. Setiap siswa hanya mengisi satu refleksi untuk satu minggu.',
                'code' => 'REFLECTION_ALREADY_EXISTS',
            ], 409);
        }

        $reflection->fill($this->databasePayload($validated))->save();
        $reflection->refresh();
        $this->recordActivity($request, 'ubah_refleksi');

        return response()->json([
            'message' => 'Refleksimu berhasil diperbarui. Kamu boleh menyesuaikannya saat ada hal baru yang ingin dicatat.',
            'data' => $this->reflectionPayload($reflection),
        ]);
    }

    public function destroy(Request $request, int $refleksi): JsonResponse
    {
        $reflection = $this->findOwnedReflection($request, $refleksi);
        $this->authorize('delete', $reflection);

        $reflection->delete();
        $this->recordActivity($request, 'hapus_refleksi');

        return response()->json([
            'message' => 'Refleksi berhasil dihapus. Kamu dapat mengisinya kembali untuk minggu tersebut.',
        ]);
    }

    private function periodPayload(Siswa $siswa, int $year, int $week, ?Refleksi $reflection): array
    {
        $weekStart = $this->isoWeekStart($year, $week);
        $schedules = $siswa->jadwal()
            ->with('tugas:id,mata_pelajaran,judul,status')
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->get()
            ->map(fn (Jadwal $jadwal) => $this->schedulePayload($jadwal))
            ->values();

        $history = $siswa->refleksi()
            ->where(function ($query) use ($year, $week) {
                $query->where('tahun', '<', $year)
                    ->orWhere(function ($nested) use ($year, $week) {
                        $nested->where('tahun', $year)->where('minggu_ke', '<', $week);
                    });
            })
            ->orderByDesc('tahun')
            ->orderByDesc('minggu_ke')
            ->limit(12)
            ->get(['id', 'tahun', 'minggu_ke', 'skor_realistis', 'hanya_untuk_saya', 'updated_at'])
            ->map(fn (Refleksi $item) => [
                'id' => $item->id,
                'tahun' => (int) $item->tahun,
                'minggu_ke' => (int) $item->minggu_ke,
                'skor_realistis' => $item->skor_realistis,
                'hanya_untuk_saya' => (bool) $item->hanya_untuk_saya,
                'updated_at' => $item->updated_at,
            ])
            ->values();

        $comments = $reflection ? $this->commentsPayload($reflection, $siswa) : [];

        return [
            'data' => $reflection ? $this->reflectionPayload($reflection) : null,
            'schedule' => $schedules,
            'comments' => $comments,
            'history' => $history,
            'meta' => [
                'tahun' => $year,
                'minggu_ke' => $week,
                'mulai' => $weekStart->toDateString(),
                'selesai' => $weekStart->addDays(6)->toDateString(),
            ],
        ];
    }

    private function commentsPayload(Refleksi $reflection, Siswa $siswa): array
    {
        return $reflection->komentar()
            ->where('siswa_id', $siswa->id)
            ->with(['guru:id,user_id', 'guru.user:id,nama'])
            ->orderByDesc('created_at')
            ->get(['id', 'guru_id', 'siswa_id', 'refleksi_id', 'isi', 'created_at'])
            ->map(fn ($comment) => [
                'id' => $comment->id,
                'isi' => $comment->isi,
                'guru' => $comment->guru?->user?->nama ?? 'Guru BK',
                'created_at' => $comment->created_at,
            ])
            ->values()
            ->all();
    }

    private function validateReflection(Request $request, bool $partial): array
    {
        $sometimes = $partial ? ['sometimes'] : [];
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        $validated = $request->validate([
            'tahun' => array_merge($required, ['integer', 'between:2000,2100']),
            'minggu_ke' => array_merge($required, ['integer', 'between:1,53']),
            'skor_realistis' => array_merge($required, ['integer', 'between:1,4']),
            'terlaksana' => array_merge($sometimes, ['nullable', 'string', 'max:5000']),
            'hambatan' => array_merge($sometimes, ['nullable', 'string', 'max:5000']),
            'perbaikan' => array_merge($sometimes, ['nullable', 'string', 'max:5000']),
            'hanya_untuk_saya' => array_merge($sometimes, ['boolean']),
            'siswa_id' => ['prohibited'],
        ], [
            'tahun.required' => 'Tahun refleksi belum ditentukan.',
            'minggu_ke.required' => 'Minggu refleksi belum ditentukan.',
            'minggu_ke.between' => 'Pilih minggu ke-1 sampai ke-53.',
            'skor_realistis.required' => 'Pilih tingkat kesesuaian jadwalmu.',
            'skor_realistis.between' => 'Pilih skala 1 sampai 4.',
            'terlaksana.max' => 'Catatan kegiatan yang terlaksana terlalu panjang.',
            'hambatan.max' => 'Catatan tantangan terlalu panjang.',
            'perbaikan.max' => 'Catatan rencana perbaikan terlalu panjang.',
            'siswa_id.prohibited' => 'Pemilik refleksi ditentukan dari akun yang sedang login.',
        ]);

        return $validated;
    }

    private function databasePayload(array $values): array
    {
        unset($values['siswa_id']);
        return $values;
    }

    private function reflectionPayload(Refleksi $reflection): array
    {
        return [
            'id' => $reflection->id,
            'tahun' => (int) $reflection->tahun,
            'minggu_ke' => (int) $reflection->minggu_ke,
            'skor_realistis' => $reflection->skor_realistis,
            'terlaksana' => $reflection->terlaksana,
            'hambatan' => $reflection->hambatan,
            'perbaikan' => $reflection->perbaikan,
            'hanya_untuk_saya' => (bool) $reflection->hanya_untuk_saya,
            'updated_at' => $reflection->updated_at,
        ];
    }

    private function schedulePayload(Jadwal $jadwal): array
    {
        return [
            'id' => $jadwal->id,
            'hari' => (int) $jadwal->hari,
            'jam_mulai' => substr((string) $jadwal->jam_mulai, 0, 5),
            'jam_selesai' => substr((string) $jadwal->jam_selesai, 0, 5),
            'jenis_blok' => $jadwal->jenis_blok === 'kegiatan_lain' ? 'lain' : $jadwal->jenis_blok,
            'kegiatan' => $jadwal->kegiatan,
            'tugas' => $jadwal->tugas ? [
                'mata_pelajaran' => $jadwal->tugas->mata_pelajaran,
                'judul' => $jadwal->tugas->judul,
            ] : null,
        ];
    }

    private function currentStudent(Request $request): Siswa
    {
        $student = $request->user()->siswa()->first();
        abort_if(!$student, 404, 'Profil siswa tidak ditemukan untuk akun ini.');

        return $student;
    }

    private function findOwnedReflection(Request $request, int $reflectionId): Refleksi
    {
        return $this->currentStudent($request)
            ->refleksi()
            ->whereKey($reflectionId)
            ->firstOrFail();
    }

    private function ensureValidIsoWeek(int $year, int $week): void
    {
        $start = $this->isoWeekStart($year, $week);
        if ((int) $start->isoWeekYear() !== $year || (int) $start->isoWeek() !== $week) {
            throw ValidationException::withMessages([
                'minggu_ke' => ['Nomor minggu tersebut tidak tersedia pada tahun yang dipilih.'],
            ]);
        }
    }

    private function isoWeekStart(int $year, int $week): CarbonImmutable
    {
        return CarbonImmutable::create($year, 1, 4, 0, 0, 0)
            ->startOfWeek(Carbon::MONDAY)
            ->addWeeks($week - 1);
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $driverCode = (int) ($exception->errorInfo[1] ?? 0);
        return $sqlState === '23000' && $driverCode === 1062;
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'refleksi',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
