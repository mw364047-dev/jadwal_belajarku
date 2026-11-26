<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\LogAktivitas;
use App\Models\Siswa;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SiswaJadwalController extends Controller
{
    private const JENIS_BLOK = ['belajar', 'istirahat', 'ibadah', 'ujian_libur', 'lain'];

    /** Daftar jadwal hanya untuk siswa yang sedang login, pada tahun dan minggu terpilih. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Jadwal::class);
        $siswa = $this->currentStudent($request);

        $filters = $request->validate([
            'tahun' => ['sometimes', 'integer', 'between:2000,2100'],
            'minggu_ke' => ['sometimes', 'integer', 'between:1,53'],
        ]);

        $now = CarbonImmutable::now();
        $year = (int) ($filters['tahun'] ?? $now->isoWeekYear());
        $week = (int) ($filters['minggu_ke'] ?? $now->isoWeek());
        $this->ensureValidIsoWeek($year, $week);

        $schedules = $siswa->jadwal()
            ->with(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama'])
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->orderBy('id')
            ->get()
            ->map(fn (Jadwal $jadwal) => $this->schedulePayload($jadwal));

        $weekStart = $this->isoWeekStart($year, $week);

        return response()->json([
            'data' => $schedules,
            'meta' => [
                'tahun' => $year,
                'minggu_ke' => $week,
                'mulai' => $weekStart->toDateString(),
                'selesai' => $weekStart->addDays(6)->toDateString(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Jadwal::class);
        $siswa = $this->currentStudent($request);
        $validated = $this->validateSchedule($request, $siswa);

        $jadwal = $siswa->jadwal()->create($this->databasePayload($validated));
        $jadwal->load(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama']);
        $warnings = $this->overlapWarnings($siswa, $validated, (int) $jadwal->id);
        $this->recordActivity($request, 'tambah_jadwal');

        return response()->json([
            'message' => 'Jadwal berhasil disimpan. Kamu bisa menyesuaikannya kapan saja.',
            'data' => $this->schedulePayload($jadwal),
            'warnings' => $warnings,
        ], 201);
    }

    public function show(Request $request, int $jadwal): JsonResponse
    {
        $ownedSchedule = $this->findOwnedSchedule($request, $jadwal);
        $this->authorize('view', $ownedSchedule);
        $ownedSchedule->load(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama']);

        return response()->json(['data' => $this->schedulePayload($ownedSchedule)]);
    }

    public function update(Request $request, int $jadwal): JsonResponse
    {
        $ownedSchedule = $this->findOwnedSchedule($request, $jadwal);
        $this->authorize('update', $ownedSchedule);
        $siswa = $this->currentStudent($request);
        $validated = $this->validateSchedule($request, $siswa);

        $ownedSchedule->update($this->databasePayload($validated));
        $ownedSchedule->refresh()->load(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama']);
        $warnings = $this->overlapWarnings($siswa, $validated, (int) $ownedSchedule->id);
        $this->recordActivity($request, 'ubah_jadwal');

        return response()->json([
            'message' => 'Perubahan jadwal berhasil disimpan.',
            'data' => $this->schedulePayload($ownedSchedule),
            'warnings' => $warnings,
        ]);
    }

    public function destroy(Request $request, int $jadwal): JsonResponse
    {
        $ownedSchedule = $this->findOwnedSchedule($request, $jadwal);
        $this->authorize('delete', $ownedSchedule);

        $ownedSchedule->delete();
        $this->recordActivity($request, 'hapus_jadwal');

        return response()->json(['message' => 'Jadwal berhasil dihapus.']);
    }

    /** Menyalin semua blok dari minggu sebelumnya ke minggu terpilih tanpa menimpa isi yang sudah ada. */
    public function salin(Request $request): JsonResponse
    {
        $this->authorize('create', Jadwal::class);
        $siswa = $this->currentStudent($request);

        $period = $request->validate([
            'tahun' => ['required', 'integer', 'between:2000,2100'],
            'minggu_ke' => ['required', 'integer', 'between:1,53'],
        ]);
        $year = (int) $period['tahun'];
        $week = (int) $period['minggu_ke'];
        $this->ensureValidIsoWeek($year, $week);

        $destinationExists = $siswa->jadwal()
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->exists();

        if ($destinationExists) {
            return response()->json([
                'message' => 'Minggu ini sudah memiliki jadwal. Salin tidak dijalankan agar tidak membuat jadwal ganda.',
            ], 409);
        }

        $previousWeek = $this->isoWeekStart($year, $week)->subWeek();
        $sourceYear = (int) $previousWeek->isoWeekYear();
        $sourceWeek = (int) $previousWeek->isoWeek();

        $sourceSchedules = $siswa->jadwal()
            ->where('tahun', $sourceYear)
            ->where('minggu_ke', $sourceWeek)
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->get();

        if ($sourceSchedules->isEmpty()) {
            return response()->json([
                'message' => 'Minggu sebelumnya belum memiliki jadwal untuk disalin. Kamu bisa mulai menyusun minggu ini dari awal.',
                'copied_count' => 0,
                'warnings' => [],
            ]);
        }

        [$created, $warnings] = DB::transaction(function () use ($siswa, $sourceSchedules, $year, $week, $request) {
            $created = collect();
            foreach ($sourceSchedules as $source) {
                $copy = $siswa->jadwal()->create([
                    'tahun' => $year,
                    'minggu_ke' => $week,
                    'hari' => $source->hari,
                    'jam_mulai' => $source->jam_mulai,
                    'jam_selesai' => $source->jam_selesai,
                    'jenis_blok' => $source->jenis_blok,
                    'tugas_id' => $source->tugas_id,
                    'kegiatan' => $source->kegiatan,
                    'catatan' => $source->catatan,
                ]);
                $created->push($copy);
            }

            $warnings = [];
            foreach ($created as $copy) {
                $warnings = array_merge($warnings, $this->overlapWarnings($siswa, [
                    'tahun' => $year,
                    'minggu_ke' => $week,
                    'hari' => (int) $copy->hari,
                    'jam_mulai' => substr((string) $copy->jam_mulai, 0, 5),
                    'jam_selesai' => substr((string) $copy->jam_selesai, 0, 5),
                    'kegiatan' => $copy->kegiatan,
                ], (int) $copy->id));
            }

            $this->recordActivity($request, 'salin_jadwal_minggu_lalu');
            return [$created, array_values(array_unique($warnings))];
        });

        return response()->json([
            'message' => count($created) . ' blok jadwal dari minggu sebelumnya berhasil disalin. Silakan tinjau dan sesuaikan bila diperlukan.',
            'copied_count' => count($created),
            'data' => $created->map(function (Jadwal $jadwal) {
                $jadwal->load(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama']);
                return $this->schedulePayload($jadwal);
            }),
            'warnings' => $warnings,
        ], 201);
    }

    private function currentStudent(Request $request): Siswa
    {
        $student = $request->user()->siswa()->first();
        abort_if(!$student, 404, 'Profil siswa tidak ditemukan untuk akun ini.');

        return $student;
    }

    /** Semua pencarian detail dibatasi oleh relasi profil siswa dari akun login. */
    private function findOwnedSchedule(Request $request, int $scheduleId): Jadwal
    {
        return $this->currentStudent($request)
            ->jadwal()
            ->whereKey($scheduleId)
            ->firstOrFail();
    }

    private function validateSchedule(Request $request, Siswa $siswa): array
    {
        $validated = $request->validate([
            'tahun' => ['required', 'integer', 'between:2000,2100'],
            'minggu_ke' => ['required', 'integer', 'between:1,53'],
            'hari' => ['required', 'integer', 'between:1,7'],
            'jam_mulai' => ['required', 'date_format:H:i'],
            'jam_selesai' => ['required', 'date_format:H:i', 'after:jam_mulai'],
            'jenis_blok' => ['required', Rule::in(self::JENIS_BLOK)],
            'kegiatan' => ['required', 'string', 'max:180'],
            'catatan' => ['nullable', 'string'],
            'tugas_id' => [
                'nullable',
                'integer',
                Rule::exists('tugas', 'id')->where(fn ($query) => $query->where('siswa_id', $siswa->id)),
            ],
            'siswa_id' => ['prohibited'],
            'durasi_menit' => ['prohibited'],
        ], [
            'hari.required' => 'Pilih hari untuk kegiatan ini.',
            'hari.between' => 'Pilih hari Senin sampai Minggu.',
            'jam_mulai.required' => 'Tentukan jam mulai kegiatan.',
            'jam_mulai.date_format' => 'Gunakan format waktu jam dan menit.',
            'jam_selesai.required' => 'Tentukan jam selesai kegiatan.',
            'jam_selesai.date_format' => 'Gunakan format waktu jam dan menit.',
            'jam_selesai.after' => 'Jam selesai perlu lebih besar daripada jam mulai.',
            'jenis_blok.in' => 'Pilih jenis kegiatan yang tersedia.',
            'kegiatan.required' => 'Tuliskan nama kegiatan yang ingin kamu jadwalkan.',
            'tugas_id.exists' => 'Tugas yang dipilih tidak ditemukan pada akunmu.',
            'siswa_id.prohibited' => 'Pemilik jadwal ditentukan otomatis dari akun yang sedang login.',
            'durasi_menit.prohibited' => 'Durasi dihitung otomatis dari jam mulai dan jam selesai.',
        ]);

        $this->ensureValidIsoWeek((int) $validated['tahun'], (int) $validated['minggu_ke']);

        return $validated;
    }

    private function ensureValidIsoWeek(int $year, int $week): void
    {
        $start = $this->isoWeekStart($year, $week);
        if ((int) $start->isoWeekYear() !== $year || (int) $start->isoWeek() !== $week) {
            throw ValidationException::withMessages([
                'minggu_ke' => ['Nomor minggu tidak tersedia pada tahun yang dipilih.'],
            ]);
        }
    }

    private function isoWeekStart(int $year, int $week): CarbonImmutable
    {
        return CarbonImmutable::create($year, 1, 4, 0, 0, 0)
            ->startOfWeek(Carbon::MONDAY)
            ->addWeeks($week - 1);
    }

    /** Nilai API "lain" dipetakan ke enum database lama "kegiatan_lain". */
    private function databasePayload(array $values): array
    {
        $values['jenis_blok'] = $values['jenis_blok'] === 'lain' ? 'kegiatan_lain' : $values['jenis_blok'];
        return $values;
    }

    private function schedulePayload(Jadwal $jadwal): array
    {
        $start = substr((string) $jadwal->jam_mulai, 0, 5);
        $end = substr((string) $jadwal->jam_selesai, 0, 5);
        $startMinutes = $this->timeToMinutes($start);
        $endMinutes = $this->timeToMinutes($end);

        return [
            'id' => $jadwal->id,
            'tahun' => (int) $jadwal->tahun,
            'minggu_ke' => (int) $jadwal->minggu_ke,
            'hari' => (int) $jadwal->hari,
            'jam_mulai' => $start,
            'jam_selesai' => $end,
            'durasi_menit' => max(0, $endMinutes - $startMinutes),
            'jenis_blok' => $jadwal->jenis_blok === 'kegiatan_lain' ? 'lain' : $jadwal->jenis_blok,
            'tugas_id' => $jadwal->tugas_id ? (int) $jadwal->tugas_id : null,
            'tugas' => $jadwal->tugas ? [
                'id' => $jadwal->tugas->id,
                'mata_pelajaran' => $jadwal->tugas->mata_pelajaran,
                'judul' => $jadwal->tugas->judul,
                'status' => $jadwal->tugas->status,
            ] : null,
            'kegiatan' => $jadwal->kegiatan,
            'catatan' => $jadwal->catatan,
            'comments' => $jadwal->relationLoaded('komentar')
                ? $jadwal->komentar->map(fn ($comment) => [
                    'id' => (int) $comment->id,
                    'guru' => $comment->guru?->user?->nama ?? 'Guru BK',
                    'isi' => $comment->isi,
                    'created_at' => $comment->created_at,
                ])->values()->all()
                : [],
            'created_at' => $jadwal->created_at,
            'updated_at' => $jadwal->updated_at,
        ];
    }

    /** Bentrok tidak menggagalkan simpan; hanya dikembalikan sebagai pesan peringatan. */
    private function overlapWarnings(Siswa $siswa, array $values, ?int $ignoreId = null): array
    {
        $query = $siswa->jadwal()
            ->where('tahun', $values['tahun'])
            ->where('minggu_ke', $values['minggu_ke'])
            ->where('hari', $values['hari'])
            ->where('jam_mulai', '<', $values['jam_selesai'])
            ->where('jam_selesai', '>', $values['jam_mulai']);

        if ($ignoreId !== null) {
            $query->where('id', '<>', $ignoreId);
        }

        $conflicts = $query->orderBy('jam_mulai')->get(['id', 'kegiatan', 'jam_mulai', 'jam_selesai']);
        if ($conflicts->isEmpty()) {
            return [];
        }

        $names = $conflicts->map(function (Jadwal $conflict) {
            return sprintf(
                '%s (%s–%s)',
                $conflict->kegiatan,
                substr((string) $conflict->jam_mulai, 0, 5),
                substr((string) $conflict->jam_selesai, 0, 5)
            );
        })->implode(', ');

        return ["Waktu kegiatan ini bertumpang tindih dengan {$names}. Jadwal tetap tersimpan; silakan tinjau kembali susunannya."];
    }

    private function timeToMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));
        return ($hours * 60) + $minutes;
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'jadwal',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
