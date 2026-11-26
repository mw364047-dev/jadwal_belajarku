<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Materi extends Model
{
    protected $table = 'materi';
    protected $fillable = ['judul', 'isi', 'urutan', 'dibuat_oleh'];
    protected $casts = ['urutan' => 'integer'];

    public function pembuat(): BelongsTo { return $this->belongsTo(User::class, 'dibuat_oleh'); }
}
