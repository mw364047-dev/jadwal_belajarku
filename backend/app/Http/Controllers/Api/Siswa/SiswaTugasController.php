<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use App\Models\Siswa;
use App\Models\Tugas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SiswaTugasController extends Controller
{
    /** Daftar tugas milik siswa yang sedang login. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tugas::class);
        $siswa = $this->currentStudent($request);

        $tasks = $siswa->tugas()
            ->orderByRaw('tenggat IS NULL ASC')
            ->orderBy('tenggat')
            ->orderByRaw("CASE prioritas WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 ELSE 3 END")
            ->orderBy('id')
            ->get()
            ->map(fn (Tugas $tugas) => $this->taskPayload($tugas));

        return response()->json(['data' => $tasks]);
    }

    /** Siswa ID selalu diambil dari akun login, bukan dari request. */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Tugas::class);
        $siswa = $this->currentStudent($request);
        $validated = $this->validateTask($request);

        $tugas = $siswa->tugas()->create($validated);
        $this->recordActivity($request, 'tambah_tugas');

        return response()->json([
            'message' => 'Tugas berhasil ditambahkan. Satu langkah kecil sudah kamu mulai!',
            'data' => $this->taskPayload($tugas),
        ], 201);
    }

    public function show(Request $request, int $tugas): JsonResponse
    {
        $ownedTask = $this->findOwnedTask($request, $tugas);
        $this->authorize('view', $ownedTask);

        return response()->json(['data' => $this->taskPayload($ownedTask)]);
    }

    public function update(Request $request, int $tugas): JsonResponse
    {
        $ownedTask = $this->findOwnedTask($request, $tugas);
        $this->authorize('update', $ownedTask);
        $validated = $this->validateTask($request, true);

        $ownedTask->update($validated);
        $this->recordActivity($request, 'ubah_tugas');

        return response()->json([
            'message' => 'Perubahan tugas berhasil disimpan.',
            'data' => $this->taskPayload($ownedTask->fresh()),
        ]);
    }

    public function destroy(Request $request, int $tugas): JsonResponse
    {
        $ownedTask = $this->findOwnedTask($request, $tugas);
        $this->authorize('delete', $ownedTask);

        $ownedTask->delete();
        $this->recordActivity($request, 'hapus_tugas');

        return response()->json(['message' => 'Tugas berhasil dihapus dari daftar.']);
    }

    private function currentStudent(Request $request): Siswa
    {
        $siswa = $request->user()->siswa()->first();
        abort_if(!$siswa, 404, 'Profil siswa tidak ditemukan untuk akun ini.');

        return $siswa;
    }

    /** Query selalu dibatasi ke relasi siswa pemilik akun login. */
    private function findOwnedTask(Request $request, int $taskId): Tugas
    {
        return $this->currentStudent($request)
            ->tugas()
            ->whereKey($taskId)
            ->firstOrFail();
    }

    private function validateTask(Request $request, bool $partial = false): array
    {
        // Pisahkan "sometimes" dan "required" sebagai dua rule Laravel,
        // bukan satu string gabungan di dalam array.
        $requiredRules = $partial ? ['sometimes', 'required'] : ['required'];

        $rules = [
            'mata_pelajaran' => array_merge($requiredRules, ['string', 'max:80']),
            'judul' => array_merge($requiredRules, ['string', 'max:180']),
            'tenggat' => $partial
                ? ['sometimes', 'nullable', 'date']
                : ['nullable', 'date'],
            'durasi_menit' => array_merge($requiredRules, ['integer', 'between:5,240']),
            'prioritas' => array_merge($requiredRules, [Rule::in(['tinggi', 'sedang', 'rendah'])]),
            'status' => array_merge($requiredRules, [Rule::in(['belum', 'proses', 'selesai'])]),
            // Jika klien mengirim siswa_id, request ditolak. Nilai pemilik
            // selalu berasal dari relasi akun login pada proses create.
            'siswa_id' => ['prohibited'],
        ];

        return $request->validate($rules, [
            'mata_pelajaran.required' => 'Isi mata pelajaran terlebih dahulu.',
            'judul.required' => 'Tuliskan tugas yang perlu kamu kerjakan.',
            'durasi_menit.required' => 'Isi perkiraan durasi pengerjaan.',
            'durasi_menit.between' => 'Durasi tugas harus antara 5 sampai 240 menit.',
            'prioritas.in' => 'Pilih prioritas tinggi, sedang, atau rendah.',
            'status.in' => 'Pilih status tugas yang tersedia.',
            'siswa_id.prohibited' => 'Data pemilik tugas ditentukan otomatis oleh akun yang sedang login.',
        ]);
    }

    private function taskPayload(Tugas $tugas): array
    {
        return [
            'id' => $tugas->id,
            'mata_pelajaran' => $tugas->mata_pelajaran,
            'judul' => $tugas->judul,
            'tenggat' => $tugas->tenggat?->format('Y-m-d'),
            'durasi_menit' => (int) $tugas->durasi_menit,
            'prioritas' => $tugas->prioritas,
            'status' => $tugas->status,
            'created_at' => $tugas->created_at,
            'updated_at' => $tugas->updated_at,
        ];
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'tugas',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
