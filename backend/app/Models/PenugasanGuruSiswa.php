<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenugasanGuruSiswa extends Model
{
    protected $table = 'penugasan_guru_siswa';
    protected $fillable = ['guru_id', 'siswa_id', 'tahun_ajaran'];

    public function guru(): BelongsTo { return $this->belongsTo(GuruBk::class, 'guru_id'); }
    public function siswa(): BelongsTo { return $this->belongsTo(Siswa::class, 'siswa_id'); }
}
