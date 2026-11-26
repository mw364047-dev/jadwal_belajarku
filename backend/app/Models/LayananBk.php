<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayananBk extends Model
{
    use SoftDeletes;

    protected $table = 'layanan_bk';
    protected $fillable = ['guru_id', 'siswa_id', 'kelas_id', 'jenis_layanan', 'tanggal', 'topik', 'tindak_lanjut'];
    protected $casts = [
        'tanggal' => 'date',
        'tindak_lanjut' => 'encrypted',
    ];

    public function guru(): BelongsTo { return $this->belongsTo(GuruBk::class, 'guru_id'); }
    public function siswa(): BelongsTo { return $this->belongsTo(Siswa::class, 'siswa_id'); }
    public function kelas(): BelongsTo { return $this->belongsTo(Kelas::class, 'kelas_id'); }
}
