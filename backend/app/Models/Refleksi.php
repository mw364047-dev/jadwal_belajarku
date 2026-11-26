<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Refleksi extends Model
{
    protected $table = 'refleksi';

    protected $fillable = [
        'siswa_id', 'tahun', 'minggu_ke', 'skor_realistis', 'terlaksana',
        'hambatan', 'perbaikan', 'hanya_untuk_saya',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'minggu_ke' => 'integer',
        'skor_realistis' => 'integer',
        'hanya_untuk_saya' => 'boolean',
    ];

    public function siswa(): BelongsTo
    {
        return $this->belongsTo(Siswa::class);
    }

    public function komentar(): HasMany
    {
        return $this->hasMany(KomentarGuru::class, 'refleksi_id');
    }

    /**
     * Bentuk data yang aman untuk konteks Guru BK.
     * Jika siswa memilih "hanya untuk saya", hanya status terisi yang dikembalikan.
     */
    public function payloadUntukGuru(): array
    {
        $payload = [
            'id' => (int) $this->id,
            'tahun' => (int) $this->tahun,
            'minggu_ke' => (int) $this->minggu_ke,
            'status' => 'terisi',
        ];

        if ($this->hanya_untuk_saya) {
            return $payload;
        }

        return array_merge($payload, [
            'skor_realistis' => $this->skor_realistis,
            'terlaksana' => $this->terlaksana,
            'hambatan' => $this->hambatan,
            'perbaikan' => $this->perbaikan,
        ]);
    }
}
