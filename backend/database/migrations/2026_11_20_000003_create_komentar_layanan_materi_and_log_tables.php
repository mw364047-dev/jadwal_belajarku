<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('komentar_guru', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru_bk')->cascadeOnDelete();
            $table->foreignId('siswa_id')->constrained('siswa')->cascadeOnDelete();
            $table->foreignId('jadwal_id')->nullable()->constrained('jadwal')->nullOnDelete();
            $table->foreignId('refleksi_id')->nullable()->constrained('refleksi')->nullOnDelete();
            $table->text('isi');
            $table->timestamps();
            $table->index(['siswa_id', 'created_at']);
        });

        Schema::create('layanan_bk', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guru_id')->constrained('guru_bk')->restrictOnDelete();
            $table->foreignId('siswa_id')->nullable()->constrained('siswa')->nullOnDelete();
            $table->foreignId('kelas_id')->nullable()->constrained('kelas')->nullOnDelete();
            $table->enum('jenis_layanan', ['klasikal', 'kelompok', 'individual', 'informasi', 'tindak_lanjut']);
            $table->date('tanggal');
            $table->string('topik', 180);
            // Ciphertext hasil Laravel encrypted cast dapat lebih panjang dari plaintext.
            $table->longText('tindak_lanjut')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['guru_id', 'tanggal']);
            $table->index(['kelas_id', 'tanggal']);
        });

        Schema::create('materi', function (Blueprint $table) {
            $table->id();
            $table->string('judul', 180);
            $table->longText('isi');
            $table->unsignedInteger('urutan')->default(0);
            $table->foreignId('dibuat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('urutan');
        });

        Schema::create('log_aktivitas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('aksi', 100);
            $table->string('modul', 100);
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('waktu')->useCurrent();
            $table->index(['user_id', 'waktu']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('log_aktivitas');
        Schema::dropIfExists('materi');
        Schema::dropIfExists('layanan_bk');
        Schema::dropIfExists('komentar_guru');
    }
};
