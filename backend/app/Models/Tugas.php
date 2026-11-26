<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tugas extends Model
{
    protected $table = 'tugas';
    protected $fillable = ['siswa_id', 'mata_pelajaran', 'judul', 'tenggat', 'durasi_menit', 'prioritas', 'status'];
    protected $casts = ['tenggat' => 'date', 'durasi_menit' => 'integer'];

    public function siswa(): BelongsTo { return $this->belongsTo(Siswa::class); }
    public function jadwal(): HasMany { return $this->hasMany(Jadwal::class, 'tugas_id'); }
}
