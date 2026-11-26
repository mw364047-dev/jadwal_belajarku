<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAktivitas extends Model
{
    protected $table = 'log_aktivitas';
    public $timestamps = false;
    protected $fillable = ['user_id', 'aksi', 'modul', 'ip_address', 'waktu'];
    protected $casts = ['waktu' => 'datetime'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
