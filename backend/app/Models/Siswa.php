<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Siswa extends Model
{
    protected $table = 'siswa';
    protected $fillable = ['user_id', 'nis', 'kelas_id'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function kelas(): BelongsTo { return $this->belongsTo(Kelas::class); }
    public function guruBks(): BelongsToMany
    {
        return $this->belongsToMany(GuruBk::class, 'penugasan_guru_siswa', 'siswa_id', 'guru_id')
            ->withPivot('tahun_ajaran')->withTimestamps();
    }
    public function penugasan(): HasMany { return $this->hasMany(PenugasanGuruSiswa::class, 'siswa_id'); }
    public function tugas(): HasMany { return $this->hasMany(Tugas::class); }
    public function jadwal(): HasMany { return $this->hasMany(Jadwal::class); }
    public function refleksi(): HasMany { return $this->hasMany(Refleksi::class); }
    public function komentar(): HasMany { return $this->hasMany(KomentarGuru::class, 'siswa_id'); }
    public function layanan(): HasMany { return $this->hasMany(LayananBk::class, 'siswa_id'); }
}
