<?php

namespace Tests\Feature;

use App\Models\KomentarGuru;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class PrivateReflectionTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_teacher_receives_only_filled_status_for_private_reflection_and_no_comments(): void
    {
        $this->refleksiA->update([
            'hanya_untuk_saya' => true,
            'terlaksana' => 'PRIVATE_REFLECTION_CONTENT_MARKER',
            'hambatan' => 'PRIVATE_REFLECTION_BARRIER_MARKER',
            'perbaikan' => 'PRIVATE_REFLECTION_PLAN_MARKER',
        ]);

        KomentarGuru::create([
            'guru_id' => $this->guruA->id,
            'siswa_id' => $this->siswaA->id,
            'refleksi_id' => $this->refleksiA->id,
            'isi' => 'Komentar untuk refleksi yang kemudian dibuat pribadi.',
        ]);

        \App\Models\Refleksi::create([
            'siswa_id' => $this->siswaA->id,
            'tahun' => $this->tahunMinggu - 1,
            'minggu_ke' => 52,
            'skor_realistis' => 1,
            'terlaksana' => 'PRIVATE_HISTORY_CONTENT_MARKER',
            'hambatan' => 'PRIVATE_HISTORY_BARRIER_MARKER',
            'perbaikan' => 'PRIVATE_HISTORY_PLAN_MARKER',
            'hanya_untuk_saya' => true,
        ]);

        Sanctum::actingAs($this->guruAUser);
        $this->postJson('/api/guru/komentar', [
            'refleksi_id' => $this->refleksiA->id,
            'isi' => 'Komentar tidak boleh dibuat pada refleksi pribadi.',
        ])->assertForbidden();

        $response = $this->getJson(
            '/api/guru/siswa/' . $this->siswaA->id . '/refleksi?tahun=' . $this->tahunMinggu . '&minggu_ke=' . $this->minggu
        )->assertOk();

        $response->assertJsonPath('data.status', 'terisi');
        $response->assertJsonMissingPath('data.skor_realistis');
        $response->assertJsonMissingPath('data.terlaksana');
        $response->assertJsonMissingPath('data.hambatan');
        $response->assertJsonMissingPath('data.perbaikan');
        $response->assertJsonPath('comments', []);
        $response->assertJsonPath('history.0.status', 'terisi');
        $response->assertJsonMissingPath('history.0.skor_realistis');
        $response->assertJsonMissingPath('history.0.terlaksana');
        $response->assertJsonMissingPath('history.0.hambatan');
        $response->assertJsonMissingPath('history.0.perbaikan');
        $response->assertDontSee('PRIVATE_HISTORY_CONTENT_MARKER');
        $response->assertDontSee('PRIVATE_HISTORY_BARRIER_MARKER');
        $response->assertDontSee('PRIVATE_HISTORY_PLAN_MARKER');
        $response->assertDontSee('PRIVATE_REFLECTION_CONTENT_MARKER');
        $response->assertDontSee('PRIVATE_REFLECTION_BARRIER_MARKER');
        $response->assertDontSee('PRIVATE_REFLECTION_PLAN_MARKER');
        $response->assertDontSee('Komentar untuk refleksi yang kemudian dibuat pribadi.');
    }
}
