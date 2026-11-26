<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\LogAktivitas;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AdminSiswaController extends Controller
{
    /** Daftar siswa aktif, hanya menampilkan data profil minimum. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'kelas_id' => ['nullable', 'integer', 'exists:kelas,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Siswa::query()
            ->with(['user', 'kelas'])
            ->whereHas('user', fn (Builder $user) => $user->where('role', 'siswa'));

        if (!empty($filters['search'])) {
            $like = '%' . trim($filters['search']) . '%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder->where('nis', 'like', $like)
                    ->orWhereHas('user', fn (Builder $user) => $user->where('nama', 'like', $like))
                    ->orWhereHas('kelas', fn (Builder $kelas) => $kelas->where('nama_kelas', 'like', $like));
            });
        }

        if (!empty($filters['kelas_id'])) {
            $query->where('kelas_id', $filters['kelas_id']);
        }

        $students = $query->orderByDesc('id')->paginate($filters['per_page'] ?? 10);
        $students->through(fn (Siswa $siswa) => $this->siswaPayload($siswa));

        return response()->json($students);
    }

    /** Membuat akun siswa dengan username dan password awal otomatis. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nis' => ['required', 'string', 'max:30', 'unique:siswa,nis'],
            'kelas_id' => ['required', 'integer', 'exists:kelas,id'],
        ], [
            'nama.required' => 'Nama siswa wajib diisi.',
            'nis.required' => 'NIS wajib diisi.',
            'nis.unique' => 'NIS sudah terdaftar.',
            'kelas_id.required' => 'Kelas wajib dipilih.',
            'kelas_id.exists' => 'Kelas yang dipilih tidak ditemukan.',
        ]);

        $temporaryPassword = $this->generateTemporaryPassword();
        $student = DB::transaction(function () use ($validated, $temporaryPassword, $request): Siswa {
            $user = User::create([
                'nama' => trim($validated['nama']),
                'username' => $this->generateUsername($validated['nis']),
                'email' => null,
                'password' => $temporaryPassword,
                'role' => 'siswa',
                'is_active' => true,
                'must_change_password' => true,
            ]);

            $student = Siswa::create([
                'user_id' => $user->id,
                'nis' => trim($validated['nis']),
                'kelas_id' => $validated['kelas_id'],
            ]);

            $this->recordActivity($request, 'tambah_siswa');

            return $student->load(['user', 'kelas']);
        });

        return response()->json([
            'message' => 'Data siswa berhasil ditambahkan.',
            'data' => $this->siswaPayload($student),
            'credentials' => [
                'username' => $student->user->username,
                'password' => $temporaryPassword,
            ],
        ], 201);
    }

    public function show(Siswa $siswa): JsonResponse
    {
        $this->activeStudentUser($siswa);

        return response()->json(['data' => $this->siswaPayload($siswa->load(['user', 'kelas']))]);
    }

    public function update(Request $request, Siswa $siswa): JsonResponse
    {
        $user = $this->activeStudentUser($siswa);
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nis' => ['required', 'string', 'max:30', Rule::unique('siswa', 'nis')->ignore($siswa->id)],
            'kelas_id' => ['required', 'integer', 'exists:kelas,id'],
        ], [
            'nis.unique' => 'NIS sudah digunakan siswa lain.',
            'kelas_id.exists' => 'Kelas yang dipilih tidak ditemukan.',
        ]);

        DB::transaction(function () use ($validated, $user, $siswa, $request): void {
            $user->update(['nama' => trim($validated['nama'])]);
            $siswa->update([
                'nis' => trim($validated['nis']),
                'kelas_id' => $validated['kelas_id'],
            ]);
            $this->recordActivity($request, 'ubah_siswa');
        });

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui.',
            'data' => $this->siswaPayload($siswa->fresh()->load(['user', 'kelas'])),
        ]);
    }

    /** Akun di-soft-delete; profil dan riwayat siswa tidak dihapus secara fisik. */
    public function destroy(Request $request, Siswa $siswa): JsonResponse
    {
        $user = $this->activeStudentUser($siswa);

        DB::transaction(function () use ($user, $request): void {
            $user->forceFill(['is_active' => false])->save();
            $user->delete();
            $this->recordActivity($request, 'hapus_siswa');
        });

        return response()->json(['message' => 'Akun siswa berhasil dihapus secara soft delete.']);
    }

    /** Memeriksa isi CSV tanpa menyimpan data. */
    public function previewImport(Request $request): JsonResponse
    {
        $file = $this->validatedCsv($request);
        $analysis = $this->analyzeCsv($file);

        return response()->json([
            'message' => 'Pratinjau CSV berhasil dibuat.',
            'summary' => [
                'total_rows' => count($analysis['rows']),
                'valid_rows' => count($analysis['valid']),
                'invalid_rows' => count($analysis['failed']),
            ],
            'rows' => $analysis['rows'],
            'failed_rows' => $analysis['failed'],
        ]);
    }

    /** Mengimpor semua baris valid dan mengembalikan laporan baris yang gagal. */
    public function import(Request $request): JsonResponse
    {
        $file = $this->validatedCsv($request);
        $analysis = $this->analyzeCsv($file);
        $credentials = [];
        $failedRows = $analysis['failed'];
        $imported = 0;

        foreach ($analysis['valid'] as $row) {
            $temporaryPassword = $this->generateTemporaryPassword();

            try {
                $student = DB::transaction(function () use ($row, $temporaryPassword, $request): Siswa {
                    $user = User::create([
                        'nama' => $row['nama'],
                        'username' => $this->generateUsername($row['nis']),
                        'email' => null,
                        'password' => $temporaryPassword,
                        'role' => 'siswa',
                        'is_active' => true,
                        'must_change_password' => true,
                    ]);

                    $student = Siswa::create([
                        'user_id' => $user->id,
                        'nis' => $row['nis'],
                        'kelas_id' => $row['kelas_id'],
                    ]);

                    $this->recordActivity($request, 'impor_siswa_csv');

                    return $student->load('user');
                });

                $imported++;
                $credentials[] = [
                    'nama' => $row['nama'],
                    'nis' => $row['nis'],
                    'username' => $student->user->username,
                    'password' => $temporaryPassword,
                ];
            } catch (QueryException $exception) {
                // Proteksi tambahan bila data berubah bersamaan saat proses impor berlangsung.
                if (str_contains(strtolower($exception->getMessage()), 'nis')) {
                    $failedRows[] = [
                        'row' => $row['row'],
                        'nama' => $row['nama'],
                        'nis' => $row['nis'],
                        'kelas' => $row['kelas'],
                        'reason' => 'NIS sudah terdaftar atau baru saja digunakan oleh data lain.',
                    ];
                    continue;
                }
                throw $exception;
            }
        }

        usort($failedRows, fn (array $a, array $b) => $a['row'] <=> $b['row']);

        return response()->json([
            'message' => 'Proses impor CSV selesai.',
            'summary' => [
                'total_rows' => count($analysis['rows']),
                'imported' => $imported,
                'failed' => count($failedRows),
            ],
            'credentials' => $credentials,
            'failed_rows' => $failedRows,
        ]);
    }

    private function validatedCsv(Request $request): UploadedFile
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ], [
            'file.required' => 'Pilih file CSV terlebih dahulu.',
            'file.mimes' => 'File harus berformat CSV.',
            'file.max' => 'Ukuran file maksimal 2 MB.',
        ]);

        return $validated['file'];
    }

    /**
     * Kolom wajib: nama,nis,kelas. Jika nama kelas digunakan pada beberapa tahun,
     * baris diarahkan ke kelas dengan tahun ajaran terbaru.
     */
    private function analyzeCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => ['File CSV tidak dapat dibaca.']]);
        }

        try {
            $header = fgetcsv($handle, 0, ',', '"', '\\');
            if (!$header) {
                throw ValidationException::withMessages(['file' => ['File CSV kosong.']]);
            }

            $header = array_map(function ($value) {
                $value = trim((string) $value);
                return strtolower(preg_replace('/^\xEF\xBB\xBF/', '', $value));
            }, $header);

            if (count($header) !== 3 || array_diff(['nama', 'nis', 'kelas'], $header) || count(array_unique($header)) !== 3) {
                throw ValidationException::withMessages([
                    'file' => ['Header CSV harus berisi tepat tiga kolom: nama,nis,kelas.'],
                ]);
            }

            $rows = [];
            $valid = [];
            $failed = [];
            $seenNis = [];
            $recordNumber = 1;

            while (($values = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
                $recordNumber++;
                if ($values === [null] || (count($values) === 1 && trim((string) $values[0]) === '')) {
                    continue;
                }

                $record = [];
                foreach ($header as $index => $column) {
                    $record[$column] = trim((string) ($values[$index] ?? ''));
                }

                $name = $record['nama'] ?? '';
                $nis = $record['nis'] ?? '';
                $className = $record['kelas'] ?? '';
                $reasons = [];

                if (count($values) !== 3) {
                    $reasons[] = 'Jumlah kolom harus tiga (nama, nis, kelas).';
                }
                if ($name === '') {
                    $reasons[] = 'Nama wajib diisi.';
                } elseif (mb_strlen($name) > 120) {
                    $reasons[] = 'Nama maksimal 120 karakter.';
                }
                if ($nis === '') {
                    $reasons[] = 'NIS wajib diisi.';
                } elseif (mb_strlen($nis) > 30) {
                    $reasons[] = 'NIS maksimal 30 karakter.';
                }
                if ($className === '') {
                    $reasons[] = 'Kelas wajib diisi.';
                } elseif (mb_strlen($className) > 50) {
                    $reasons[] = 'Nama kelas maksimal 50 karakter.';
                }

                if ($nis !== '') {
                    $normalizedNis = strtolower($nis);
                    if (isset($seenNis[$normalizedNis])) {
                        $reasons[] = 'NIS duplikat pada file CSV (baris ' . $seenNis[$normalizedNis] . ').';
                    } else {
                        $seenNis[$normalizedNis] = $recordNumber;
                    }
                    if (Siswa::where('nis', $nis)->exists()) {
                        $reasons[] = 'NIS sudah terdaftar di database.';
                    }
                }

                $kelas = null;
                if ($className !== '') {
                    $kelas = Kelas::query()->where('nama_kelas', $className)
                        ->orderByDesc('tahun_ajaran')->first();
                    if (!$kelas) {
                        $reasons[] = 'Kelas tidak ditemukan. Tambahkan kelas terlebih dahulu.';
                    }
                }

                $rowPayload = [
                    'row' => $recordNumber,
                    'nama' => $name,
                    'nis' => $nis,
                    'kelas' => $className,
                    'valid' => count($reasons) === 0,
                    'reason' => implode(' ', $reasons),
                ];
                $rows[] = $rowPayload;

                if ($reasons) {
                    $failed[] = [
                        'row' => $recordNumber,
                        'nama' => $name,
                        'nis' => $nis,
                        'kelas' => $className,
                        'reason' => implode(' ', $reasons),
                    ];
                } else {
                    $valid[] = [
                        'row' => $recordNumber,
                        'nama' => $name,
                        'nis' => $nis,
                        'kelas' => $className,
                        'kelas_id' => $kelas->id,
                    ];
                }
            }

            return compact('rows', 'valid', 'failed');
        } finally {
            fclose($handle);
        }
    }

    private function activeStudentUser(Siswa $siswa): User
    {
        $user = $siswa->user()->first();
        if (!$user || $user->role !== 'siswa') {
            throw new NotFoundHttpException('Data siswa tidak ditemukan.');
        }
        return $user;
    }

    private function siswaPayload(Siswa $siswa): array
    {
        return [
            'id' => $siswa->id,
            'nama' => $siswa->user?->nama,
            'nis' => $siswa->nis,
            'kelas_id' => $siswa->kelas_id,
            'nama_kelas' => $siswa->kelas?->nama_kelas,
            'tahun_ajaran' => $siswa->kelas?->tahun_ajaran,
            'username' => $siswa->user?->username,
            'is_active' => (bool) ($siswa->user?->is_active ?? false),
            'created_at' => $siswa->created_at,
        ];
    }

    private function generateUsername(string $nis): string
    {
        $base = 'siswa' . preg_replace('/[^A-Za-z0-9]/', '', $nis);
        $base = substr($base, 0, 42) ?: 'siswa';
        $username = $base;
        $suffix = 1;

        while (User::withTrashed()->where('username', $username)->exists()) {
            $ending = (string) $suffix++;
            $username = substr($base, 0, 50 - strlen($ending)) . $ending;
        }

        return $username;
    }

    private function generateTemporaryPassword(): string
    {
        $groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*'];
        $characters = [];
        foreach ($groups as $group) {
            $characters[] = $group[random_int(0, strlen($group) - 1)];
        }
        $all = implode('', $groups);
        for ($i = 0; $i < 8; $i++) {
            $characters[] = $all[random_int(0, strlen($all) - 1)];
        }
        for ($i = count($characters) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$characters[$i], $characters[$j]] = [$characters[$j], $characters[$i]];
        }
        return implode('', $characters);
    }

    private function recordActivity(Request $request, string $action): void
    {
        LogAktivitas::create([
            'user_id' => $request->user()->id,
            'aksi' => $action,
            'modul' => 'siswa',
            'ip_address' => $request->ip(),
            'waktu' => now(),
        ]);
    }
}
