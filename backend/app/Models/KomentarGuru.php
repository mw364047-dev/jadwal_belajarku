<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KomentarGuru extends Model
{
    protected $table = 'komentar_guru';
    protected $fillable = ['guru_id', 'siswa_id', 'jadwal_id', 'refleksi_id', 'isi'];

    public function guru(): BelongsTo { return $this->belongsTo(GuruBk::class, 'guru_id'); }
    public function siswa(): BelongsTo { return $this->belongsTo(Siswa::class, 'siswa_id'); }
    public function jadwal(): BelongsTo { return $this->belongsTo(Jadwal::class, 'jadwal_id'); }
    public function refleksi(): BelongsTo { return $this->belongsTo(Refleksi::class, 'refleksi_id'); }
}
