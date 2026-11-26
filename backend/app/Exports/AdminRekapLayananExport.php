<?php

namespace App\Exports;

use App\Support\AdminRekapLayananQuery;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AdminRekapLayananExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private readonly array $filters = [])
    {
    }

    public function query()
    {
        // Shared query memilih metadata layanan yang aman; kolom catatan sensitif tidak disentuh.
        return AdminRekapLayananQuery::build($this->filters)
            ->orderBy('lb.tanggal')
            ->orderBy('lb.id');
    }

    public function headings(): array
    {
        return ['Nama Guru BK', 'Nama Siswa', 'Kelas', 'Tahun Ajaran', 'Jenis Layanan', 'Tanggal'];
    }

    public function map($row): array
    {
        return [
            $row->guru_nama,
            $row->siswa_nama ?: '—',
            $row->nama_kelas ?: '—',
            $row->tahun_ajaran ?: '—',
            $row->jenis_layanan,
            $row->tanggal,
        ];
    }
}
