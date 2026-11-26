<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Jadwal extends Model
{
    protected $table = 'jadwal';
    protected $fillable = [
        'siswa_id', 'tahun', 'minggu_ke', 'hari', 'jam_mulai', 'jam_selesai',
        'jenis_blok', 'tugas_id', 'kegiatan', 'catatan',
    ];
    protected $casts = ['tahun' => 'integer', 'minggu_ke' => 'integer', 'hari' => 'integer'];

    public function siswa(): BelongsTo { return $this->belongsTo(Siswa::class); }
    public function tugas(): BelongsTo { return $this->belongsTo(Tugas::class, 'tugas_id'); }
    public function komentar(): HasMany { return $this->hasMany(KomentarGuru::class, 'jadwal_id'); }
}
