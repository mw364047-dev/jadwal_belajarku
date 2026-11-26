<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class StudentOwnershipTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_student_a_cannot_read_update_or_delete_student_b_records(): void
    {
        Sanctum::actingAs($this->siswaAUser);

        $this->getJson('/api/siswa/tugas/' . $this->tugasB->id)->assertNotFound();
        $this->patchJson('/api/siswa/tugas/' . $this->tugasB->id, [
            'judul' => 'Diubah oleh siswa A',
        ])->assertNotFound();
        $this->deleteJson('/api/siswa/tugas/' . $this->tugasB->id)->assertNotFound();

        $this->getJson('/api/siswa/jadwal/' . $this->jadwalB->id)->assertNotFound();
        $this->patchJson('/api/siswa/jadwal/' . $this->jadwalB->id, [
            'kegiatan' => 'Jadwal diubah oleh siswa A',
        ])->assertNotFound();
        $this->deleteJson('/api/siswa/jadwal/' . $this->jadwalB->id)->assertNotFound();

        $this->getJson('/api/siswa/refleksi/' . $this->refleksiB->id)->assertNotFound();
        $this->patchJson('/api/siswa/refleksi/' . $this->refleksiB->id, [
            'hambatan' => 'Isi refleksi diubah oleh siswa A',
        ])->assertNotFound();
        $this->deleteJson('/api/siswa/refleksi/' . $this->refleksiB->id)->assertNotFound();

        $this->assertDatabaseHas('tugas', [
            'id' => $this->tugasB->id,
            'judul' => 'Tugas rahasia siswa B',
            'siswa_id' => $this->siswaB->id,
        ]);
        $this->assertDatabaseHas('jadwal', [
            'id' => $this->jadwalB->id,
            'kegiatan' => 'Jadwal rahasia siswa B',
            'siswa_id' => $this->siswaB->id,
        ]);
        $this->assertDatabaseHas('refleksi', [
            'id' => $this->refleksiB->id,
            'terlaksana' => 'REFLECTION_B_PRIVATE_MARKER',
            'siswa_id' => $this->siswaB->id,
        ]);
    }

    public function test_student_list_endpoints_only_return_the_logged_in_students_records(): void
    {
        Sanctum::actingAs($this->siswaAUser);

        $tasks = $this->getJson('/api/siswa/tugas')->assertOk();
        $tasks->assertJsonMissing(['judul' => 'Tugas rahasia siswa B']);

        $schedules = $this->getJson('/api/siswa/jadwal?tahun=' . $this->tahunMinggu . '&minggu_ke=' . $this->minggu)->assertOk();
        $schedules->assertJsonMissing(['kegiatan' => 'Jadwal rahasia siswa B']);

        $reflection = $this->getJson('/api/siswa/refleksi?tahun=' . $this->tahunMinggu . '&minggu_ke=' . $this->minggu)->assertOk();
        $reflection->assertJsonMissing(['terlaksana' => 'REFLECTION_B_PRIVATE_MARKER']);
    }
}
