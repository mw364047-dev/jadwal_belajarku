<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class AdminPrivacyTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_admin_service_recap_never_contains_topic_or_follow_up_fields_or_values(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->getJson('/api/admin/rekap-layanan')->assertOk();
        $response->assertJsonMissingPath('data.0.topik');
        $response->assertJsonMissingPath('data.0.tindak_lanjut');
        $response->assertDontSee('TOPIK_SENSITIF_PRIVATE_MARKER');
        $response->assertDontSee('TINDAK_LANJUT_SENSITIF_PRIVATE_MARKER');

        $monitoring = $this->getJson('/api/admin/monitoring-guru')->assertOk();
        $monitoring->assertDontSee('TOPIK_SENSITIF_PRIVATE_MARKER');
        $monitoring->assertDontSee('TINDAK_LANJUT_SENSITIF_PRIVATE_MARKER');

        Sanctum::actingAs($this->siswaAUser);
        $studentSummary = $this->getJson('/api/siswa/layanan')->assertOk();
        $this->assertSame(1, (int) $studentSummary->json('total'));
        $studentSummary->assertJsonMissingPath('data.0.topik');
        $studentSummary->assertJsonMissingPath('data.0.tindak_lanjut');
        $studentSummary->assertDontSee('TOPIK_SENSITIF_PRIVATE_MARKER');
        $studentSummary->assertDontSee('TINDAK_LANJUT_SENSITIF_PRIVATE_MARKER');
    }
}
