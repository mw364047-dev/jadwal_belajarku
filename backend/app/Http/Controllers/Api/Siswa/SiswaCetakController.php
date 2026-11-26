<?php

namespace App\Http\Controllers\Api\Siswa;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\Refleksi;
use App\Models\Siswa;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SiswaCetakController extends Controller
{
    private const HARI = [
        1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis',
        5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu',
    ];

    private const JENIS = [
        'belajar' => 'Belajar',
        'istirahat' => 'Istirahat',
        'ibadah' => 'Ibadah',
        'ujian_libur' => 'Ujian / Libur',
        'kegiatan_lain' => 'Lainnya',
        'lain' => 'Lainnya',
    ];

    /** PDF jadwal dan refleksi milik siswa yang sedang login. */
    public function jadwal(Request $request, int $tahun, int $minggu): mixed
    {
        $this->validatePeriod($tahun, $minggu);
        $siswa = $this->currentStudent($request);

        $siswa->load(['user:id,nama', 'kelas:id,nama_kelas']);

        $jadwal = $siswa->jadwal()
            ->with('tugas:id,mata_pelajaran,judul')
            ->where('tahun', $tahun)
            ->where('minggu_ke', $minggu)
            ->orderBy('hari')
            ->orderBy('jam_mulai')
            ->get()
            ->map(fn (Jadwal $item) => $this->scheduleRow($item));

        // Refleksi dicari melalui relasi siswa login, tidak melalui ID dari klien.
        // Refleksi pribadi tetap dapat dicetak oleh pemiliknya sendiri.
        $refleksi = $siswa->refleksi()
            ->where('tahun', $tahun)
            ->where('minggu_ke', $minggu)
            ->first();

        $weekStart = $this->isoWeekStart($tahun, $minggu)->locale('id');
        $weekEnd = $weekStart->addDays(6);

        $pdf = Pdf::loadView('pdf.siswa-jadwal', [
            'nama' => $siswa->user?->nama ?? 'Siswa',
            'kelas' => $siswa->kelas?->nama_kelas ?? 'Belum ditentukan',
            'tahun' => $tahun,
            'minggu' => $minggu,
            'rentangTanggal' => $weekStart->translatedFormat('d F Y') . ' – ' . $weekEnd->translatedFormat('d F Y'),
            'jadwal' => $jadwal,
            'refleksi' => $refleksi,
            'skorLabel' => [1 => 'Belum sesuai', 2 => 'Mulai tercapai', 3 => 'Cukup sesuai', 4 => 'Sangat sesuai'],
        ])->setPaper('a4', 'portrait')->setOption([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
            'isPhpEnabled' => false,
        ]);

        $filename = sprintf('jadwal-belajar-%d-minggu-%02d.pdf', $tahun, $minggu);

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    /** Templat kosong untuk dicetak; route ini memang tidak membutuhkan login. */
    public function templat(): mixed
    {
        $pdf = Pdf::loadView('pdf.templat-kosong', [
            'hari' => array_values(self::HARI),
        ])->setPaper('a4', 'portrait')->setOption([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
            'isPhpEnabled' => false,
        ]);

        return $pdf->download('templat-jadwal-belajar-kosong.pdf');
    }

    private function currentStudent(Request $request): Siswa
    {
        $siswa = $request->user()->siswa()->first();
        abort_if(!$siswa, 404, 'Profil siswa tidak ditemukan untuk akun ini.');

        return $siswa;
    }

    private function validatePeriod(int $year, int $week): void
    {
        if ($year < 2000 || $year > 2100 || $week < 1 || $week > 53) {
            throw ValidationException::withMessages([
                'periode' => ['Tahun atau nomor minggu tidak sesuai.'],
            ]);
        }

        $start = $this->isoWeekStart($year, $week);
        if ((int) $start->isoWeekYear() !== $year || (int) $start->isoWeek() !== $week) {
            throw ValidationException::withMessages([
                'minggu' => ['Nomor minggu tersebut tidak tersedia pada tahun yang dipilih.'],
            ]);
        }
    }

    private function isoWeekStart(int $year, int $week): CarbonImmutable
    {
        return CarbonImmutable::create($year, 1, 4, 0, 0, 0)
            ->startOfWeek(Carbon::MONDAY)
            ->addWeeks($week - 1);
    }

    private function scheduleRow(Jadwal $jadwal): array
    {
        return [
            'hari' => self::HARI[(int) $jadwal->hari] ?? 'Hari',
            'waktu' => substr((string) $jadwal->jam_mulai, 0, 5) . '–' . substr((string) $jadwal->jam_selesai, 0, 5),
            'kegiatan' => $jadwal->kegiatan,
            'jenis' => self::JENIS[$jadwal->jenis_blok] ?? 'Kegiatan',
            'tugas' => $jadwal->tugas
                ? $jadwal->tugas->mata_pelajaran . ' — ' . $jadwal->tugas->judul
                : null,
            'catatan' => $jadwal->catatan,
        ];
    }
}
