<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesSecurityFixtures;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSecurityFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        $this->createSecurityFixtures();
    }

    public function test_every_protected_api_route_rejects_unauthenticated_requests_with_401(): void
    {
        $tested = 0;

        foreach ($this->protectedApiRouteRequests() as [$method, $uri, $routeName]) {
            $response = $this->json($method, $uri);
            $this->assertSame(
                401,
                $response->status(),
                "Endpoint {$method} {$uri} ({$routeName}) seharusnya menolak pengguna tanpa login. Respons: {$response->getContent()}"
            );
            $tested++;
        }

        $this->assertGreaterThan(35, $tested, 'Matriks endpoint API terlalu sedikit; periksa deteksi middleware auth:sanctum.');
    }

    public function test_every_role_protected_api_route_rejects_the_wrong_role_with_403(): void
    {
        $tested = 0;
        $usersByRole = [
            'admin' => $this->adminUser,
            'guru_bk' => $this->guruAUser,
            'siswa' => $this->siswaAUser,
        ];

        foreach ($this->protectedApiRouteRequests() as [$method, $uri, $routeName, $middleware]) {
            $roleRule = collect($middleware)->first(fn ($item) => str_starts_with($item, 'role:'));
            if (!$roleRule) {
                continue;
            }

            $allowedRoles = explode(',', substr($roleRule, strlen('role:')));
            $wrongRole = collect(array_keys($usersByRole))->first(fn ($role) => !in_array($role, $allowedRoles, true));
            if (!$wrongRole) {
                continue;
            }

            Sanctum::actingAs($usersByRole[$wrongRole]);
            $response = $this->json($method, $uri);
            $this->assertSame(
                403,
                $response->status(),
                "Endpoint {$method} {$uri} ({$routeName}) seharusnya menolak role {$wrongRole}. Respons: {$response->getContent()}"
            );
            $tested++;
        }

        $this->assertGreaterThan(20, $tested, 'Matriks role belum mencakup route admin, guru, dan siswa.');
    }

    public function test_materi_management_policy_rejects_student_and_restricts_delete_to_admin(): void
    {
        Sanctum::actingAs($this->siswaAUser);

        $this->getJson('/api/admin/materi')->assertForbidden();
        $this->getJson('/api/admin/materi/' . $this->materi->id)->assertForbidden();
        $this->postJson('/api/admin/materi', [
            'judul' => 'Tidak boleh dibuat siswa',
            'isi' => 'Konten uji.',
        ])->assertForbidden();
        $this->putJson('/api/admin/materi/' . $this->materi->id, [
            'judul' => 'Tidak boleh diubah siswa',
        ])->assertForbidden();
        $this->deleteJson('/api/admin/materi/' . $this->materi->id)->assertForbidden();

        Sanctum::actingAs($this->guruAUser);
        $created = $this->postJson('/api/admin/materi', [
            'judul' => 'Materi dibuat Guru BK',
            'isi' => 'Guru BK dapat menambahkan materi.',
            'urutan' => 2,
        ])->assertCreated();
        $createdId = $created->json('data.id');
        $this->putJson('/api/admin/materi/' . $createdId, [
            'judul' => 'Materi diubah Guru BK',
        ])->assertOk();
        $this->deleteJson('/api/admin/materi/' . $this->materi->id)->assertForbidden();

        Sanctum::actingAs($this->guruAUser);
        $this->getJson('/api/materi')->assertOk();
        Sanctum::actingAs($this->siswaAUser);
        $this->getJson('/api/materi')->assertOk();
    }

    /** @return array<int, array{0:string,1:string,2:string,3:array}> */
    private function protectedApiRouteRequests(): array
    {
        $requests = [];

        foreach (Route::getRoutes() as $route) {
            if (!str_starts_with($route->uri(), 'api/')) {
                continue;
            }

            $middleware = $route->gatherMiddleware();
            if (!in_array('auth:sanctum', $middleware, true)) {
                continue;
            }

            $uri = $this->concreteApiUri($route->uri());
            foreach (array_intersect($route->methods(), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) as $method) {
                $requests[] = [$method, $uri, $route->getName() ?? $route->uri(), $middleware];
            }
        }

        return $requests;
    }
}
