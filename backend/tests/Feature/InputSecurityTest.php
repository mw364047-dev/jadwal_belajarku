<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\Sanctum;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class InputSecurityTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_script_markup_is_kept_as_text_and_frontend_does_not_inject_raw_html(): void
    {
        $script = '<script>window.securityTestWasExecuted = true;</script>';
        Sanctum::actingAs($this->adminUser);

        $this->postJson('/api/admin/materi', [
            'judul' => 'Materi payload XSS',
            'isi' => $script,
            'urutan' => 2,
        ])->assertCreated();

        $response = $this->getJson('/api/materi')->assertOk();
        $response->assertJsonFragment([
            'judul' => 'Materi payload XSS',
            'isi' => $script,
        ]);

        $frontendSource = dirname(base_path()) . DIRECTORY_SEPARATOR . 'frontend' . DIRECTORY_SEPARATOR . 'src';
        $materiPage = file_get_contents($frontendSource . DIRECTORY_SEPARATOR . 'pages' . DIRECTORY_SEPARATOR . 'MateriPage.jsx');
        $this->assertStringContainsString("String(item.isi ?? '')", $materiPage);
        $this->assertStringNotContainsString('dangerouslySetInnerHTML', $materiPage);

        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($frontendSource));
        $checked = 0;

        foreach ($iterator as $file) {
            if (!$file->isFile() || !in_array($file->getExtension(), ['jsx', 'js'], true)) {
                continue;
            }

            $source = file_get_contents($file->getPathname());
            $this->assertStringNotContainsString(
                'dangerouslySetInnerHTML',
                $source,
                'Jangan menyisipkan konten pengguna sebagai HTML mentah: ' . $file->getPathname()
            );
            $checked++;
        }

        $this->assertGreaterThan(10, $checked, 'Pemeriksaan sumber React tidak menemukan file aplikasi yang diharapkan.');
    }

    public function test_search_input_that_looks_like_sql_injection_is_treated_as_literal_text(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = "%' OR 1=1 --";
        $response = $this->getJson('/api/admin/siswa?search=' . urlencode($payload))->assertOk();

        $this->assertSame(0, (int) $response->json('total'));
        $this->assertSame([], $response->json('data'));
    }
}
