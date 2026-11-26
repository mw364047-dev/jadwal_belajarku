<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class TeacherScopeTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_teacher_can_only_open_students_assigned_to_that_teacher(): void
    {
        Sanctum::actingAs($this->guruAUser);

        $list = $this->getJson('/api/guru/siswa')->assertOk();
        $list->assertJsonFragment(['id' => $this->siswaA->id]);
        $list->assertJsonMissing(['id' => $this->siswaB->id]);

        $this->getJson('/api/guru/siswa/' . $this->siswaB->id . '/tugas')->assertNotFound();
        $this->getJson('/api/guru/siswa/' . $this->siswaB->id . '/jadwal')->assertNotFound();
        $this->getJson('/api/guru/siswa/' . $this->siswaB->id . '/refleksi')->assertNotFound();

        $this->getJson('/api/guru/layanan/' . $this->layananB->id)->assertNotFound();
    }

    public function test_teacher_cannot_create_a_service_for_a_student_outside_their_assignments(): void
    {
        Sanctum::actingAs($this->guruAUser);

        $this->postJson('/api/guru/layanan', [
            'jenis_layanan' => 'individual',
            'siswa_id' => $this->siswaB->id,
            'tanggal' => now()->toDateString(),
            'topik' => 'Target tidak ditugaskan',
            'tindak_lanjut' => 'Isi uji keamanan.',
        ])->assertUnprocessable();
    }
}
