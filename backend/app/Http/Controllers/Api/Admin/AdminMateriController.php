<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use App\Models\Materi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMateriController extends Controller
{
    /** Daftar baca materi untuk semua pengguna yang sudah login dan aktif. */
    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'data' => $this->materiQuery()->get(),
        ]);
    }

    /** Daftar materi untuk admin dan guru BK yang diberi hak kelola. */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Materi::class);

        return response()->json([
            'data' => $this->materiQuery()->get(),
        ]);
    }

    /** Detail satu materi. */
    public function show(Materi $materi): JsonResponse
    {
        $this->authorize('view', $materi);

        return response()->json(['data' => $this->materiPayload($materi)]);
    }

    /** Membuat materi; pembuat selalu diambil dari akun login. */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Materi::class);

        $data = $request->validate([
            'judul' => ['required', 'string', 'max:180'],
            'isi' => ['required', 'string', 'max:30000'],
            'urutan' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        $materi = Materi::create([
            'judul' => trim($data['judul']),
            'isi' => trim($data['isi']),
            'urutan' => $data['urutan'] ?? 0,
            'dibuat_oleh' => $request->user()->id,
        ]);

        $this->recordActivity($request, 'materi_dibuat');

        return response()->json([
            'message' => 'Materi berhasil ditambahkan.',
            'data' => $this->materiPayload($materi),
        ], 201);
    }

    /** Memperbarui isi materi tanpa mengubah identitas pembuat. */
    public function update(Request $request, Materi $materi): JsonResponse
    {
        $this->authorize('update', $materi);

        $data = $request->validate([
            'judul' => ['sometimes', 'required', 'string', 'max:180'],
            'isi' => ['sometimes', 'required', 'string', 'max:30000'],
            'urutan' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        if (array_key_exists('judul', $data)) {
            $data['judul'] = trim($data['judul']);
        }
        if (array_key_exists('isi', $data)) {
            $data['isi'] = trim($data['isi']);
        }
        if (array_key_exists('urutan', $data) && $data['urutan'] === null) {
            $data['urutan'] = 0;
        }

        $materi->update($data);
        $this->recordActivity($request, 'materi_diubah');

        return response()->json([
            'message' => 'Perubahan materi berhasil disimpan.',
            'data' => $this->materiPayload($materi->fresh()),
        ]);
    }

    /** Penghapusan materi dibatasi untuk admin. */
    public function destroy(Request $request, Materi $materi): JsonResponse
    {
        $this->authorize('delete', $materi);

        $materi->delete();
        $this->recordActivity($request, 'materi_dihapus');

        return response()->json(['message' => 'Materi berhasil dihapus.']);
    }

    private function materiQuery()
    {
        return Materi::query()
            ->select(['id', 'judul', 'isi', 'urutan', 'created_at', 'updated_at'])
            ->orderBy('urutan')
            ->orderBy('id');
    }

    private function materiPayload(Materi $materi): array
    {
        return [
            'id' => $materi->id,
            'judul' => $materi->judul,
            // Isi selalu dikirim sebagai string teks. Frontend harus merendernya
            // sebagai text node React, bukan memakai dangerouslySetInnerHTML.
            'isi' => $materi->isi,
            'urutan' => $materi->urutan,
            'created_at' => $materi->created_at,
            'updated_at' => $materi->updated_at,
        ];
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'materi',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
