<?php

namespace App\Http\Controllers\Api\Guru;

use App\Http\Controllers\Controller;
use App\Models\GuruBk;
use App\Models\Jadwal;
use App\Models\Refleksi;
use App\Models\Siswa;
use App\Models\Tugas;
use App\Models\User;
use App\Support\TahunAjaran;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GuruSiswaController extends Controller
{
    /** Ringkasan siswa binaan pada tahun ajaran dan minggu yang sedang berjalan. */
    public function index(Request $request): JsonResponse
    {
        $guru = $this->currentGuru($request);
        $now = CarbonImmutable::now();
        $year = (int) $now->isoWeekYear();
        $week = (int) $now->isoWeek();
        $academicYear = TahunAjaran::berjalan();

        $students = $guru->siswaBinaan()
            ->wherePivot('tahun_ajaran', $academicYear)
            ->with(['user:id,nama,username', 'kelas:id,nama_kelas,tahun_ajaran'])
            ->withCount([
                'tugas',
                'jadwal as jadwal_minggu_ini_count' => fn ($query) => $query
                    ->where('tahun', $year)->where('minggu_ke', $week),
                'refleksi as refleksi_minggu_ini_count' => fn ($query) => $query
                    ->where('tahun', $year)->where('minggu_ke', $week),
            ])
            ->orderBy('siswa.id')
            ->get();

        $data = $students->map(fn (Siswa $student) => [
            'id' => (int) $student->id,
            'nama' => $student->user?->nama ?? 'Siswa',
            'nis' => $student->nis,
            'kelas' => $student->kelas?->nama_kelas,
            'tahun_ajaran' => $student->pivot?->tahun_ajaran,
            'jumlah_tugas' => (int) $student->tugas_count,
            'jadwal_minggu_ini' => (int) $student->jadwal_minggu_ini_count,
            'status_pengisian' => (int) $student->refleksi_minggu_ini_count > 0 ? 'terisi' : 'belum',
        ])->values();

        $filled = $data->where('status_pengisian', 'terisi')->count();

        return response()->json([
            'data' => $data,
            'meta' => [
                'tahun_ajaran' => $academicYear,
                'tahun' => $year,
                'minggu_ke' => $week,
                'total_siswa' => $data->count(),
                'sudah_mengisi' => $filled,
                'belum_mengisi' => $data->count() - $filled,
            ],
        ]);
    }

    /** Data tugas bersifat baca saja dan hanya untuk siswa binaan guru login. */
    public function tugas(Request $request, int $siswa): JsonResponse
    {
        $student = $this->assignedStudent($request, $siswa);
        $tasks = $student->tugas()
            ->orderByRaw('tenggat IS NULL')
            ->orderBy('tenggat')
            ->orderBy('id')
            ->get(['id', 'siswa_id', 'mata_pelajaran', 'judul', 'tenggat', 'durasi_menit', 'prioritas', 'status', 'created_at', 'updated_at']);

        return response()->json([
            'siswa' => $this->studentPayload($student),
            'data' => $tasks,
        ]);
    }

    /** Jadwal pada minggu terpilih; komentar disertakan untuk konteks pendampingan. */
    public function jadwal(Request $request, int $siswa): JsonResponse
    {
        $student = $this->assignedStudent($request, $siswa);
        [$year, $week] = $this->validatedPeriod($request);

        $schedules = $student->jadwal()
            ->with(['tugas:id,mata_pelajaran,judul,status', 'komentar.guru.user:id,nama'])
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->get()
            ->map(fn (Jadwal $item) => $this->schedulePayload($item))
            ->values();

        return response()->json([
            'siswa' => $this->studentPayload($student),
            'data' => $schedules,
            'meta' => ['tahun' => $year, 'minggu_ke' => $week],
        ]);
    }

    /** Refleksi pribadi hanya dikembalikan sebagai status terisi tanpa isi apa pun. */
    public function refleksi(Request $request, int $siswa): JsonResponse
    {
        $student = $this->assignedStudent($request, $siswa);
        [$year, $week] = $this->validatedPeriod($request);

        $reflection = $student->refleksi()
            ->where('tahun', $year)
            ->where('minggu_ke', $week)
            ->first();

        $data = null;
        $comments = [];
        if ($reflection) {
            $this->authorize('viewStatusForGuru', $reflection);
            $data = $reflection->payloadUntukGuru();

            if (!$reflection->hanya_untuk_saya) {
                $this->authorize('viewContentForGuru', $reflection);
                $comments = $this->reflectionComments($reflection);
            }
        }

        $history = $student->refleksi()
            ->where(function ($query) use ($year, $week) {
                $query->where('tahun', '<', $year)
                    ->orWhere(function ($nested) use ($year, $week) {
                        $nested->where('tahun', $year)->where('minggu_ke', '<', $week);
                    });
            })
            ->orderByDesc('tahun')
            ->orderByDesc('minggu_ke')
            ->limit(12)
            ->get()
            ->map(fn (Refleksi $item) => $item->payloadUntukGuru())
            ->values();

        return response()->json([
            'siswa' => $this->studentPayload($student),
            'data' => $data,
            'comments' => $comments,
            'history' => $history,
            'meta' => ['tahun' => $year, 'minggu_ke' => $week],
        ]);
    }

    private function currentGuru(Request $request): GuruBk
    {
        $guru = $request->user()->guruBk()->first();
        abort_if(!$guru, 404, 'Profil Guru BK tidak ditemukan untuk akun ini.');
        return $guru;
    }

    /** Ambil siswa melalui relasi penugasan aktif; ID dari URL tidak cukup tanpa assignment. */
    private function assignedStudent(Request $request, int $studentId): Siswa
    {
        $student = $this->currentGuru($request)->siswaBinaan()
            ->wherePivot('tahun_ajaran', TahunAjaran::berjalan())
            ->where('siswa.id', $studentId)
            ->with(['user:id,nama,username', 'kelas:id,nama_kelas,tahun_ajaran'])
            ->firstOrFail();

        $this->authorize('viewForGuru', $student);
        return $student;
    }

    private function studentPayload(Siswa $student): array
    {
        return [
            'id' => (int) $student->id,
            'nama' => $student->user?->nama ?? 'Siswa',
            'nis' => $student->nis,
            'kelas' => $student->kelas?->nama_kelas,
            'tahun_ajaran' => $student->pivot?->tahun_ajaran,
        ];
    }

    /** @return array{0:int,1:int} */
    private function validatedPeriod(Request $request): array
    {
        $filters = $request->validate([
            'tahun' => ['sometimes', 'integer', 'between:2000,2100'],
            'minggu_ke' => ['sometimes', 'integer', 'between:1,53'],
        ]);
        $now = CarbonImmutable::now();
        $year = (int) ($filters['tahun'] ?? $now->isoWeekYear());
        $week = (int) ($filters['minggu_ke'] ?? $now->isoWeek());
        $start = CarbonImmutable::create($year, 1, 4)->startOfWeek(Carbon::MONDAY)->addWeeks($week - 1);

        if ((int) $start->isoWeekYear() !== $year || (int) $start->isoWeek() !== $week) {
            throw ValidationException::withMessages([
                'minggu_ke' => ['Nomor minggu tidak tersedia pada tahun yang dipilih.'],
            ]);
        }

        return [$year, $week];
    }

    private function schedulePayload(Jadwal $jadwal): array
    {
        $comments = $jadwal->relationLoaded('komentar')
            ? $jadwal->komentar->map(fn ($comment) => $this->commentPayload($comment))->values()->all()
            : [];

        return [
            'id' => (int) $jadwal->id,
            'tahun' => (int) $jadwal->tahun,
            'minggu_ke' => (int) $jadwal->minggu_ke,
            'hari' => (int) $jadwal->hari,
            'jam_mulai' => substr((string) $jadwal->jam_mulai, 0, 5),
            'jam_selesai' => substr((string) $jadwal->jam_selesai, 0, 5),
            'jenis_blok' => $jadwal->jenis_blok === 'kegiatan_lain' ? 'lain' : $jadwal->jenis_blok,
            'kegiatan' => $jadwal->kegiatan,
            'catatan' => $jadwal->catatan,
            'tugas' => $jadwal->tugas ? [
                'id' => (int) $jadwal->tugas->id,
                'mata_pelajaran' => $jadwal->tugas->mata_pelajaran,
                'judul' => $jadwal->tugas->judul,
                'status' => $jadwal->tugas->status,
            ] : null,
            'comments' => $comments,
        ];
    }

    private function reflectionComments(Refleksi $reflection): array
    {
        return $reflection->komentar()
            ->with(['guru:id,user_id', 'guru.user:id,nama'])
            ->orderBy('created_at')
            ->get(['id', 'guru_id', 'siswa_id', 'jadwal_id', 'refleksi_id', 'isi', 'created_at', 'updated_at'])
            ->map(fn ($comment) => $this->commentPayload($comment))
            ->values()
            ->all();
    }

    private function commentPayload($comment): array
    {
        $currentGuruId = (int) (auth()->user()?->guruBk?->id ?? 0);
        return [
            'id' => (int) $comment->id,
            'guru_id' => (int) $comment->guru_id,
            'guru' => $comment->guru?->user?->nama ?? 'Guru BK',
            'isi' => $comment->isi,
            'created_at' => $comment->created_at,
            'updated_at' => $comment->updated_at,
            'can_manage' => (int) $comment->guru_id === $currentGuruId,
        ];
    }
}
