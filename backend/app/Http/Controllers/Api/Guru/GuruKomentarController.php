<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use App\Models\Jadwal;
use App\Models\KomentarGuru;
use App\Models\LogAktivitas;
use App\Models\Refleksi;
use App\Models\Siswa;
use App\Support\TahunAjaran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GuruKomentarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', KomentarGuru::class);
        $guru = $this->currentGuru($request);
        $assignedIds = $guru->siswaBinaan()
            ->wherePivot('tahun_ajaran', TahunAjaran::berjalan())
            ->pluck('siswa.id');

        $filters = $request->validate([
            'siswa_id' => ['sometimes', 'integer'],
            'jadwal_id' => ['sometimes', 'integer'],
            'refleksi_id' => ['sometimes', 'integer'],
        ]);

        $query = KomentarGuru::query()
            ->whereIn('siswa_id', $assignedIds)
            ->where(function ($builder) {
                $builder->whereNull('refleksi_id')
                    ->orWhereHas('refleksi', fn ($reflection) => $reflection->where('hanya_untuk_saya', false));
            })
            ->with(['guru:id,user_id', 'guru.user:id,nama', 'siswa.user:id,nama']);

        foreach (['siswa_id', 'jadwal_id', 'refleksi_id'] as $key) {
            if (isset($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }

        $comments = $query->latest()->paginate(20)->through(fn (KomentarGuru $comment) => $this->commentPayload($comment, $guru));

        return response()->json($comments);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', KomentarGuru::class);
        $guru = $this->currentGuru($request);

        $validated = $request->validate([
            'jadwal_id' => ['nullable', 'integer'],
            'refleksi_id' => ['nullable', 'integer'],
            'isi' => ['required', 'string', 'min:2', 'max:5000'],
            'siswa_id' => ['prohibited'],
            'guru_id' => ['prohibited'],
        ], [
            'isi.required' => 'Tuliskan komentar atau umpan balik terlebih dahulu.',
            'isi.min' => 'Komentar terlalu singkat. Tambahkan sedikit konteks agar mudah dipahami siswa.',
            'siswa_id.prohibited' => 'Siswa tujuan ditentukan dari jadwal atau refleksi yang dipilih.',
            'guru_id.prohibited' => 'Identitas Guru BK ditentukan dari akun yang sedang login.',
        ]);

        $hasSchedule = !empty($validated['jadwal_id']);
        $hasReflection = !empty($validated['refleksi_id']);
        if ($hasSchedule === $hasReflection) {
            throw ValidationException::withMessages([
                'jadwal_id' => ['Pilih tepat satu sasaran komentar: jadwal atau refleksi.'],
                'refleksi_id' => ['Pilih tepat satu sasaran komentar: jadwal atau refleksi.'],
            ]);
        }

        $target = null;
        $payload = [
            'jadwal_id' => null,
            'refleksi_id' => null,
        ];

        if ($hasSchedule) {
            $target = Jadwal::query()->findOrFail($validated['jadwal_id']);
            $payload['jadwal_id'] = $target->id;
        } else {
            $target = Refleksi::query()->findOrFail($validated['refleksi_id']);
            $payload['refleksi_id'] = $target->id;
        }

        $student = Siswa::query()->findOrFail($target->siswa_id);
        $this->authorize('viewForGuru', $student);

        // Periksa privasi setelah kepemilikan penugasan, agar ID refleksi pribadi
        // milik siswa yang bukan binaan tidak dapat digunakan untuk menebak keberadaannya.
        if ($hasReflection && $target->hanya_untuk_saya) {
            abort(403, 'Siswa memilih menyimpan refleksi ini untuk dirinya sendiri. Komentar pada refleksi tersebut tidak tersedia.');
        }

        $comment = $guru->komentar()->create(array_merge($payload, [
            'siswa_id' => $student->id,
            'isi' => trim($validated['isi']),
        ]));
        $comment->load(['guru:id,user_id', 'guru.user:id,nama', 'siswa.user:id,nama']);
        $this->recordActivity($request, 'tambah_komentar_guru');

        return response()->json([
            'message' => 'Komentar berhasil dikirim. Semoga umpan balik ini membantu siswa meninjau rencananya.',
            'data' => $this->commentPayload($comment, $guru),
        ], 201);
    }

    public function show(Request $request, int $komentar): JsonResponse
    {
        $guru = $this->currentGuru($request);
        $comment = KomentarGuru::query()
            ->with(['guru:id,user_id', 'guru.user:id,nama', 'siswa.user:id,nama'])
            ->findOrFail($komentar);
        $this->authorize('view', $comment);
        $this->ensureAssignedStudent($guru, (int) $comment->siswa_id);

        return response()->json(['data' => $this->commentPayload($comment, $guru)]);
    }

    public function update(Request $request, int $komentar): JsonResponse
    {
        $guru = $this->currentGuru($request);
        $comment = KomentarGuru::query()->findOrFail($komentar);
        $this->authorize('update', $comment);
        $this->ensureAssignedStudent($guru, (int) $comment->siswa_id);

        $validated = $request->validate([
            'isi' => ['required', 'string', 'min:2', 'max:5000'],
            'siswa_id' => ['prohibited'],
            'guru_id' => ['prohibited'],
            'jadwal_id' => ['prohibited'],
            'refleksi_id' => ['prohibited'],
        ]);

        $comment->update(['isi' => trim($validated['isi'])]);
        $comment->load(['guru:id,user_id', 'guru.user:id,nama', 'siswa.user:id,nama']);
        $this->recordActivity($request, 'ubah_komentar_guru');

        return response()->json([
            'message' => 'Komentar berhasil diperbarui.',
            'data' => $this->commentPayload($comment, $guru),
        ]);
    }

    public function destroy(Request $request, int $komentar): JsonResponse
    {
        $guru = $this->currentGuru($request);
        $comment = KomentarGuru::query()->findOrFail($komentar);
        $this->authorize('delete', $comment);
        $this->ensureAssignedStudent($guru, (int) $comment->siswa_id);

        $comment->delete();
        $this->recordActivity($request, 'hapus_komentar_guru');

        return response()->json(['message' => 'Komentar berhasil dihapus.']);
    }

    private function currentGuru(Request $request): GuruBk
    {
        $guru = $request->user()->guruBk()->first();
        abort_if(!$guru, 404, 'Profil Guru BK tidak ditemukan untuk akun ini.');
        return $guru;
    }

    private function ensureAssignedStudent(GuruBk $guru, int $studentId): void
    {
        $assigned = $guru->siswaBinaan()
            ->where('siswa.id', $studentId)
            ->wherePivot('tahun_ajaran', TahunAjaran::berjalan())
            ->exists();
        abort_unless($assigned, 404, 'Siswa tidak ditemukan dalam daftar binaan tahun ajaran berjalan.');
    }

    private function commentPayload(KomentarGuru $comment, GuruBk $guru): array
    {
        return [
            'id' => (int) $comment->id,
            'guru_id' => (int) $comment->guru_id,
            'guru' => $comment->guru?->user?->nama ?? 'Guru BK',
            'siswa_id' => (int) $comment->siswa_id,
            'siswa' => $comment->siswa?->user?->nama ?? 'Siswa',
            'jadwal_id' => $comment->jadwal_id ? (int) $comment->jadwal_id : null,
            'refleksi_id' => $comment->refleksi_id ? (int) $comment->refleksi_id : null,
            'isi' => $comment->isi,
            'created_at' => $comment->created_at,
            'updated_at' => $comment->updated_at,
            'can_manage' => (int) $comment->guru_id === (int) $guru->id,
        ];
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'komentar_guru',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
