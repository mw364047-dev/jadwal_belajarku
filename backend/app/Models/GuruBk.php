<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuruBk extends Model
{
    protected $table = 'guru_bk';
    protected $fillable = ['user_id', 'nip', 'jabatan'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function siswaBinaan(): BelongsToMany
    {
        return $this->belongsToMany(Siswa::class, 'penugasan_guru_siswa', 'guru_id', 'siswa_id')
            ->withPivot('tahun_ajaran')->withTimestamps();
    }
    public function penugasan(): HasMany { return $this->hasMany(PenugasanGuruSiswa::class, 'guru_id'); }
    public function layanan(): HasMany { return $this->hasMany(LayananBk::class, 'guru_id'); }
    public function komentar(): HasMany { return $this->hasMany(KomentarGuru::class, 'guru_id'); }
}
