<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use App\Models\Kelas;
use App\Models\LogAktivitas;
use App\Models\PenugasanGuruSiswa;
use App\Models\Siswa;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminPenugasanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'tahun_ajaran' => ['nullable', 'string', 'max:9'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = PenugasanGuruSiswa::query()
            ->with([
                'guru.user' => fn ($query) => $query->withTrashed(),
                'siswa.user' => fn ($query) => $query->withTrashed(),
                'siswa.kelas',
            ]);

        if (!empty($filters['tahun_ajaran'])) {
            $query->where('tahun_ajaran', $filters['tahun_ajaran']);
        }
        if (!empty($filters['search'])) {
            $like = '%' . trim($filters['search']) . '%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder->whereHas('guru.user', fn (Builder $user) => $user->where('nama', 'like', $like))
                    ->orWhereHas('siswa.user', fn (Builder $user) => $user->where('nama', 'like', $like))
                    ->orWhereHas('siswa', fn (Builder $siswa) => $siswa->where('nis', 'like', $like));
            });
        }

        $assignments = $query->orderByDesc('tahun_ajaran')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);
        $assignments->through(fn (PenugasanGuruSiswa $assignment) => $this->assignmentPayload($assignment));

        return response()->json($assignments);
    }

    /** Opsi aktif untuk formulir penugasan massal. */
    public function options(): JsonResponse
    {
        $teachers = GuruBk::query()
            ->whereHas('user', fn (Builder $user) => $user->where('role', 'guru_bk')->where('is_active', true))
            ->with('user:id,nama')
            ->orderBy('id')
            ->get()
            ->map(fn (GuruBk $guru) => ['id' => $guru->id, 'nama' => $guru->user?->nama]);

        $students = Siswa::query()
            ->whereHas('user', fn (Builder $user) => $user->where('role', 'siswa')->where('is_active', true))
            ->with(['user:id,nama', 'kelas:id,nama_kelas,tahun_ajaran'])
            ->orderBy('kelas_id')->orderBy('nis')
            ->limit(500)
            ->get()
            ->map(fn (Siswa $siswa) => [
                'id' => $siswa->id,
                'nama' => $siswa->user?->nama,
                'nis' => $siswa->nis,
                'kelas_id' => $siswa->kelas_id,
                'nama_kelas' => $siswa->kelas?->nama_kelas,
                'tahun_ajaran' => $siswa->kelas?->tahun_ajaran,
            ]);

        $years = Kelas::query()->select('tahun_ajaran')->distinct()->orderByDesc('tahun_ajaran')->pluck('tahun_ajaran');

        return response()->json([
            'teachers' => $teachers,
            'students' => $students,
            'years' => $years,
        ]);
    }

    /** Penugasan massal: satu guru BK untuk banyak siswa sekaligus. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'guru_id' => ['required', 'integer', 'exists:guru_bk,id'],
            'siswa_ids' => ['required', 'array', 'min:1', 'max:500'],
            'siswa_ids.*' => ['required', 'integer', 'distinct', 'exists:siswa,id'],
            'tahun_ajaran' => ['required', 'string', 'regex:/^\d{4}\/\d{4}$/', 'max:9'],
        ], [
            'siswa_ids.required' => 'Pilih minimal satu siswa.',
            'siswa_ids.min' => 'Pilih minimal satu siswa.',
            'siswa_ids.*.distinct' => 'Siswa yang sama tidak boleh dipilih dua kali.',
            'tahun_ajaran.regex' => 'Tahun ajaran harus menggunakan format 2026/2027.',
        ]);

        $this->ensureActiveTeacher((int) $validated['guru_id']);
        $this->ensureActiveStudents($validated['siswa_ids'], $validated['tahun_ajaran']);

        $existingIds = PenugasanGuruSiswa::query()
            ->where('guru_id', $validated['guru_id'])
            ->where('tahun_ajaran', $validated['tahun_ajaran'])
            ->whereIn('siswa_id', $validated['siswa_ids'])
            ->pluck('siswa_id')->all();

        if ($existingIds) {
            $nisList = Siswa::whereIn('id', $existingIds)->pluck('nis')->implode(', ');
            throw ValidationException::withMessages([
                'siswa_ids' => ['Penugasan untuk siswa dengan NIS ' . $nisList . ' sudah ada pada tahun ajaran tersebut.'],
            ]);
        }

        $created = DB::transaction(function () use ($validated, $request) {
            $items = [];
            foreach ($validated['siswa_ids'] as $studentId) {
                $items[] = PenugasanGuruSiswa::create([
                    'guru_id' => $validated['guru_id'],
                    'siswa_id' => $studentId,
                    'tahun_ajaran' => $validated['tahun_ajaran'],
                ]);
            }
            $this->recordActivity($request, 'tambah_penugasan', count($items));
            return $items;
        });

        return response()->json([
            'message' => count($created) . ' penugasan berhasil ditambahkan.',
            'created_count' => count($created),
            'data' => collect($created)->map(fn (PenugasanGuruSiswa $item) => $this->assignmentPayload(
                $item->load(['guru.user', 'siswa.user', 'siswa.kelas'])
            )),
        ], 201);
    }

    public function show(PenugasanGuruSiswa $penugasan): JsonResponse
    {
        return response()->json([
            'data' => $this->assignmentPayload($penugasan->load([
                'guru.user' => fn ($query) => $query->withTrashed(),
                'siswa.user' => fn ($query) => $query->withTrashed(),
                'siswa.kelas',
            ])),
        ]);
    }

    /** Memperbarui satu baris penugasan. */
    public function update(Request $request, PenugasanGuruSiswa $penugasan): JsonResponse
    {
        $validated = $request->validate([
            'guru_id' => ['required', 'integer', 'exists:guru_bk,id'],
            'siswa_id' => ['required', 'integer', 'exists:siswa,id'],
            'tahun_ajaran' => ['required', 'string', 'regex:/^\d{4}\/\d{4}$/', 'max:9'],
        ], [
            'tahun_ajaran.regex' => 'Tahun ajaran harus menggunakan format 2026/2027.',
        ]);

        $this->ensureActiveTeacher((int) $validated['guru_id']);
        $this->ensureActiveStudents([(int) $validated['siswa_id']], $validated['tahun_ajaran']);

        $duplicate = PenugasanGuruSiswa::query()
            ->where('guru_id', $validated['guru_id'])
            ->where('siswa_id', $validated['siswa_id'])
            ->where('tahun_ajaran', $validated['tahun_ajaran'])
            ->where('id', '!=', $penugasan->id)
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages([
                'siswa_id' => ['Kombinasi guru, siswa, dan tahun ajaran tersebut sudah terdaftar.'],
            ]);
        }

        DB::transaction(function () use ($penugasan, $validated, $request): void {
            $penugasan->update($validated);
            $this->recordActivity($request, 'ubah_penugasan');
        });

        return response()->json([
            'message' => 'Penugasan berhasil diperbarui.',
            'data' => $this->assignmentPayload($penugasan->fresh()->load(['guru.user', 'siswa.user', 'siswa.kelas'])),
        ]);
    }

    public function destroy(Request $request, PenugasanGuruSiswa $penugasan): JsonResponse
    {
        DB::transaction(function () use ($penugasan, $request): void {
            $penugasan->delete();
            $this->recordActivity($request, 'hapus_penugasan');
        });

        return response()->json(['message' => 'Penugasan berhasil dihapus.']);
    }

    private function ensureActiveTeacher(int $teacherId): void
    {
        $active = GuruBk::query()->whereKey($teacherId)
            ->whereHas('user', fn (Builder $user) => $user->where('role', 'guru_bk')->where('is_active', true))
            ->exists();
        if (!$active) {
            throw ValidationException::withMessages(['guru_id' => ['Guru BK tidak ditemukan atau sedang nonaktif.']]);
        }
    }

    private function ensureActiveStudents(array $studentIds, string $year): void
    {
        $active = Siswa::query()->whereIn('id', $studentIds)
            ->whereHas('user', fn (Builder $user) => $user->where('role', 'siswa')->where('is_active', true))
            ->whereHas('kelas', fn (Builder $kelas) => $kelas->where('tahun_ajaran', $year))
            ->count();

        if ($active !== count($studentIds)) {
            throw ValidationException::withMessages([
                'siswa_ids' => ['Pastikan semua siswa aktif dan berada pada kelas dengan tahun ajaran yang dipilih.'],
            ]);
        }
    }

    private function assignmentPayload(PenugasanGuruSiswa $item): array
    {
        return [
            'id' => $item->id,
            'guru_id' => $item->guru_id,
            'guru_nama' => $item->guru?->user?->nama ?? '(Akun guru tidak aktif)',
            'siswa_id' => $item->siswa_id,
            'siswa_nama' => $item->siswa?->user?->nama ?? '(Akun siswa tidak aktif)',
            'nis' => $item->siswa?->nis,
            'nama_kelas' => $item->siswa?->kelas?->nama_kelas,
            'tahun_ajaran' => $item->tahun_ajaran,
            'created_at' => $item->created_at,
        ];
    }

    private function recordActivity(Request $request, string $action, ?int $count = null): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $count === null ? $action : $action . '_' . $count,
            'modul' => 'penugasan_guru_siswa',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
