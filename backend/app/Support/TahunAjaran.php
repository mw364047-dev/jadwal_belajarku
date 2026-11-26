<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class TahunAjaran
{
    /** Tahun ajaran berjalan menggunakan batas awal Juli. */
    public static function berjalan(): string
    {
        $now = CarbonImmutable::now();
        $startYear = $now->month >= 7 ? $now->year : $now->year - 1;

        return $startYear . '/' . ($startYear + 1);
    }
}
