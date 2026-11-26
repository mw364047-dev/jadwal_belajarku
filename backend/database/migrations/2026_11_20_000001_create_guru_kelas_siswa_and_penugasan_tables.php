<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kelas', function (Blueprint $table) {
            $table->id();
            $table->string('nama_kelas', 50);
            $table->string('tahun_ajaran', 9);
            $table->timestamps();
            $table->unique(['nama_kelas', 'tahun_ajaran']);
        });

        Schema::create('guru_bk', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nip', 30)->nullable()->unique();
            $table->string('jabatan', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('siswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nis', 30)->unique();
            $table->foreignId('kelas_id')->constrained('kelas')->restrictOnDelete();
            $table->timestamps();
            $table->index('kelas_id');
        });

        Schema::create('penugasan_guru_siswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru_bk')->cascadeOnDelete();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->string('tahun_ajaran', 9);
            $table->timestamps();
            $table->unique(['guru_id', 'siswa_id', 'tahun_ajaran'], 'penugasan_guru_siswa_unique');
            $table->index(['siswa_id', 'tahun_ajaran']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penugasan_guru_siswa');
        Schema::dropIfExists('siswa');
        Schema::dropIfExists('guru_bk');
        Schema::dropIfExists('kelas');
    }
};
