<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kelas extends Model
{
    protected $table = 'kelas';
    protected $fillable = ['nama_kelas', 'tahun_ajaran'];

    public function siswa(): HasMany { return $this->hasMany(Siswa::class); }
    public function layanan(): HasMany { return $this->hasMany(LayananBk::class, 'kelas_id'); }
}
