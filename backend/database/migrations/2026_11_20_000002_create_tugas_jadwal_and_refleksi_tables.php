<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tugas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->string('mata_pelajaran', 80);
            $table->string('judul', 180);
            $table->date('tenggat')->nullable();
            $table->unsignedSmallInteger('durasi_menit')->default(30);
            $table->enum('prioritas', ['tinggi', 'sedang', 'rendah'])->default('sedang');
            $table->enum('status', ['belum', 'proses', 'selesai'])->default('belum');
            $table->timestamps();
            $table->index(['siswa_id', 'tenggat', 'status']);
        });

        Schema::create('jadwal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->unsignedSmallInteger('tahun');
            $table->unsignedTinyInteger('minggu_ke');
            $table->unsignedTinyInteger('hari')->comment('1=Senin sampai 7=Minggu');
            $table->time('jam_mulai');
            $table->time('jam_selesai');
            $table->enum('jenis_blok', ['belajar', 'istirahat', 'ibadah', 'ujian_libur', 'kegiatan_lain'])->default('belajar');
            $table->foreignId('tugas_id')->nullable()->constrained('tugas')->nullOnDelete();
            $table->string('kegiatan', 180);
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->index(['siswa_id', 'tahun', 'minggu_ke', 'hari'], 'jadwal_mingguan_index');
        });

        Schema::create('refleksi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->unsignedSmallInteger('tahun');
            $table->unsignedTinyInteger('minggu_ke');
            $table->unsignedTinyInteger('skor_realistis')->nullable()->comment('Skala 1-4');
            $table->text('terlaksana')->nullable();
            $table->text('hambatan')->nullable();
            $table->text('perbaikan')->nullable();
            $table->boolean('hanya_untuk_saya')->default(false);
            $table->timestamps();
            $table->unique(['siswa_id', 'tahun', 'minggu_ke'], 'refleksi_siswa_minggu_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refleksi');
        Schema::dropIfExists('jadwal');
        Schema::dropIfExists('tugas');
    }
};
