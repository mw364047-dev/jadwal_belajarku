<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Query ringkasan layanan admin. Kolom topik dan tindak_lanjut sengaja tidak pernah dipilih. */
class AdminRekapLayananQuery
{
    public static function build(array $filters): Builder
    {
        $query = DB::table('layanan_bk as lb')
            ->join('guru_bk as gb', 'gb.id', '=', 'lb.guru_id')
            ->join('users as gu', 'gu.id', '=', 'gb.user_id')
            ->leftJoin('siswa as s', 's.id', '=', 'lb.siswa_id')
            ->leftJoin('users as su', 'su.id', '=', 's.user_id')
            ->leftJoin('kelas as k', 'k.id', '=', 'lb.kelas_id')
            ->leftJoin('kelas as sk', 'sk.id', '=', 's.kelas_id')
            ->whereNull('lb.deleted_at')
            ->select([
                'lb.id',
                'gb.id as guru_id',
                'gu.nama as guru_nama',
                's.id as siswa_id',
                'su.nama as siswa_nama',
                DB::raw('COALESCE(k.id, sk.id) as kelas_id'),
                DB::raw('COALESCE(k.nama_kelas, sk.nama_kelas) as nama_kelas'),
                DB::raw('COALESCE(k.tahun_ajaran, sk.tahun_ajaran) as tahun_ajaran'),
                'lb.jenis_layanan',
                'lb.tanggal',
            ]);

        if (!empty($filters['guru_id'])) {
            $query->where('lb.guru_id', $filters['guru_id']);
        }

        if (!empty($filters['kelas_id'])) {
            $kelasId = $filters['kelas_id'];
            $query->where(function (Builder $builder) use ($kelasId): void {
                $builder->where('lb.kelas_id', $kelasId)
                    ->orWhere('s.kelas_id', $kelasId);
            });
        }

        if (!empty($filters['jenis_layanan'])) {
            $query->where('lb.jenis_layanan', $filters['jenis_layanan']);
        }

        if (!empty($filters['tanggal_mulai'])) {
            $query->whereDate('lb.tanggal', '>=', $filters['tanggal_mulai']);
        }

        if (!empty($filters['tanggal_selesai'])) {
            $query->whereDate('lb.tanggal', '<=', $filters['tanggal_selesai']);
        }

        return $query;
    }
}
