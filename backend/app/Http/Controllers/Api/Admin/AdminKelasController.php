<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\LogAktivitas;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminKelasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = $this->withActiveStudentCount(Kelas::query());
        if (!empty($filters['search'])) {
            $like = '%' . trim($filters['search']) . '%';
            $query->where(fn (Builder $builder) => $builder
                ->where('nama_kelas', 'like', $like)
                ->orWhere('tahun_ajaran', 'like', $like));
        }

        $classes = $query->orderByDesc('tahun_ajaran')->orderBy('nama_kelas')
            ->paginate($filters['per_page'] ?? 10);
        $classes->through(fn (Kelas $kelas) => $this->kelasPayload($kelas));

        return response()->json($classes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_kelas' => [
                'required', 'string', 'max:50',
                Rule::unique('kelas', 'nama_kelas')->where(fn ($query) => $query->where('tahun_ajaran', $request->input('tahun_ajaran'))),
            ],
            'tahun_ajaran' => ['required', 'string', 'regex:/^\d{4}\/\d{4}$/', 'max:9'],
        ], [
            'nama_kelas.required' => 'Nama kelas wajib diisi.',
            'nama_kelas.unique' => 'Kelas dengan nama dan tahun ajaran tersebut sudah tersedia.',
            'tahun_ajaran.regex' => 'Tahun ajaran harus menggunakan format 2026/2027.',
        ]);

        $kelas = DB::transaction(function () use ($validated, $request): Kelas {
            $kelas = Kelas::create($validated);
            $this->recordActivity($request, 'tambah_kelas');
            return $this->loadActiveStudentCount($kelas);
        });

        return response()->json([
            'message' => 'Data kelas berhasil ditambahkan.',
            'data' => $this->kelasPayload($kelas),
        ], 201);
    }

    public function show(Kelas $kelas): JsonResponse
    {
        return response()->json(['data' => $this->kelasPayload($this->loadActiveStudentCount($kelas))]);
    }

    public function update(Request $request, Kelas $kelas): JsonResponse
    {
        $validated = $request->validate([
            'nama_kelas' => [
                'required', 'string', 'max:50',
                Rule::unique('kelas', 'nama_kelas')
                    ->where(fn ($query) => $query->where('tahun_ajaran', $request->input('tahun_ajaran')))
                    ->ignore($kelas->id),
            ],
            'tahun_ajaran' => ['required', 'string', 'regex:/^\d{4}\/\d{4}$/', 'max:9'],
        ], [
            'nama_kelas.unique' => 'Kelas dengan nama dan tahun ajaran tersebut sudah tersedia.',
            'tahun_ajaran.regex' => 'Tahun ajaran harus menggunakan format 2026/2027.',
        ]);

        DB::transaction(function () use ($kelas, $validated, $request): void {
            $kelas->update($validated);
            $this->recordActivity($request, 'ubah_kelas');
        });

        return response()->json([
            'message' => 'Data kelas berhasil diperbarui.',
            'data' => $this->kelasPayload($this->loadActiveStudentCount($kelas->fresh())),
        ]);
    }

    public function destroy(Request $request, Kelas $kelas): JsonResponse
    {
        if ($kelas->siswa()->exists()) {
            throw new HttpException(422, 'Kelas tidak dapat dihapus karena masih memiliki data siswa. Pindahkan siswa terlebih dahulu.');
        }
        if ($kelas->layanan()->exists()) {
            throw new HttpException(422, 'Kelas tidak dapat dihapus karena masih digunakan pada riwayat layanan BK.');
        }

        DB::transaction(function () use ($kelas, $request): void {
            $kelas->delete();
            $this->recordActivity($request, 'hapus_kelas');
        });

        return response()->json(['message' => 'Data kelas berhasil dihapus.']);
    }

    private function withActiveStudentCount(Builder $query): Builder
    {
        return $query->withCount([
            'siswa as siswa_count' => fn (Builder $students) => $students->whereHas('user', fn (Builder $user) => $user->where('role', 'siswa')->where('is_active', true)),
        ]);
    }

    private function loadActiveStudentCount(Kelas $kelas): Kelas
    {
        return $kelas->loadCount([
            'siswa as siswa_count' => fn (Builder $students) => $students->whereHas('user', fn (Builder $user) => $user->where('role', 'siswa')->where('is_active', true)),
        ]);
    }

    private function kelasPayload(Kelas $kelas): array
    {
        return [
            'id' => $kelas->id,
            'nama_kelas' => $kelas->nama_kelas,
            'tahun_ajaran' => $kelas->tahun_ajaran,
            'siswa_count' => (int) ($kelas->siswa_count ?? 0),
            'created_at' => $kelas->created_at,
        ];
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'kelas',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
